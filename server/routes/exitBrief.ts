import type { Express, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { createHash } from "node:crypto";
import { EXIT_BRIEF_SYSTEM_PROMPT, HEBREW_ADDENDUM } from "../lib/exitBriefSkill";
import {
  appendLeadRow,
  appendValuationRow,
  markValuationBriefRequested,
} from "../lib/leadsSheet";
import { readSite, siteReadBlock } from "../lib/readSite";
import {
  VERTICALS,
  computeRange,
  rangeMarkdown,
  rangeText,
  type RangeResult,
} from "../lib/valuationMath";
import { makeRunToken, readRunToken } from "../lib/runToken";
import {
  buildSnapshotEmailHtml,
  buildSnapshotEmailText,
  shouldSendEmail,
  snapshotLetterTable,
  snapshotSubject,
  type SnapshotRun,
} from "../lib/snapshotEmail";
import { insertValuationLead, markValuationLeadPdfRequested } from "../db";
import { nanoid } from "nanoid";

// ─── Email addresses ────────────────────────────────────────────────────────
// Resend will only send from a domain we have verified in the Resend dashboard.
// The firm's domain is gesherpartners.com (no hyphen). An earlier version of
// this file sent from gesher-partners.com, which we do not own, so every send
// would have been rejected. MAIL_FROM lets us change this without a code push.
// "||" not "??" on purpose. A host that creates the variable but leaves it
// blank hands us "", which "??" would happily accept and we would send from
// "Gesher <>". Empty means unset here.
const MAIL_FROM = process.env.MAIL_FROM || "office@gesherpartners.com";

// Where new leads and contact-form submissions land.
const NOTIFY_EMAIL = process.env.LEAD_NOTIFICATION_EMAIL || MAIL_FROM;

// Resend wants "Display Name <address@domain>".
function sender(displayName: string): string {
  return `${displayName} <${MAIL_FROM}>`;
}

// ─── The Brief engine ───────────────────────────────────────────────────────
// Haiku 4.5, the cheapest current model. Every token rate on it is half of
// Sonnet 5's, which was itself 2.5x cheaper than the Opus model this file
// started on.
//
// It is an env var, not a constant, on purpose. This model writes the thing an
// owner reads after a bank stage. If the Briefs come back thin, Ben sets
// EXIT_BRIEF_MODEL to claude-sonnet-5 in Render and the next run is better, no
// code change and no deploy wait. That is the escape hatch; use it before
// arguing about pennies.
//
// Worth knowing before changing it: the model is no longer the big line on the
// bill. Web search is billed on its own at $10 per 1,000 searches and is the
// same whatever model runs, so it is about 40% of a Brief now. MAX_WEB_SEARCHES
// below is the other real dial.
const BRIEF_MODEL = process.env.EXIT_BRIEF_MODEL || "claude-haiku-4-5";

// Haiku 4.5 does not take the "adaptive" thinking setting. Sonnet and Opus do,
// and on those models thinking is spent out of max_tokens, so the ceiling has
// to be bigger when it is on. Keyed off the model name so flipping the env var
// above does the right thing by itself.
const WANTS_ADAPTIVE_THINKING = !BRIEF_MODEL.includes("haiku");
const BRIEF_MAX_TOKENS = WANTS_ADAPTIVE_THINKING ? 16_000 : 8_000;

// The v7 engine takes a light live look at the seller's site. Six searches cost
// 6 cents before a single token is billed. Four is enough to read a small
// Israeli company and saves 2 cents a Brief, which is real money next to what
// the model itself costs now.
const MAX_WEB_SEARCHES = 2;

// What a run costs, so the Sheet can show it per Brief instead of Ben guessing
// from the Anthropic console at the end of the month.
//
// Dollars per million tokens, straight off the Anthropic pricing page. If you
// put a model in EXIT_BRIEF_MODEL that is not listed here, the cost column goes
// blank rather than lying. Add the row when you add the model.
const MODEL_RATES: Record<
  string,
  { input: number; output: number; cacheRead: number; cacheWrite: number }
> = {
  "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
};

// Web search is billed on its own, the same on every model.
const WEB_SEARCH_COST = 0.01;

function runCostUsd(u: {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  webSearches: number;
}): string {
  const rate = MODEL_RATES[BRIEF_MODEL];
  if (!rate) return "";
  // input_tokens from the API excludes what was read from cache, so the two do
  // not double count. Cache writes are not broken out on this path, so a first
  // run of the day reads a little cheap here. It is a floor, not a guess.
  const dollars =
    (u.inputTokens / 1e6) * rate.input +
    (u.outputTokens / 1e6) * rate.output +
    (u.cachedInputTokens / 1e6) * rate.cacheRead +
    u.webSearches * WEB_SEARCH_COST;
  return dollars.toFixed(4);
}

// ─── Spend guards on POST /api/exit-brief ───────────────────────────────────
// Two gates, because they stop two different things.
//
// The per-IP gate stops one person hammering the button. The site-wide daily
// cap is the one that bounds the money: whatever happens, the site cannot run
// more than this many Briefs in a day. Ben changes the number in Render with
// EXIT_BRIEF_DAILY_CAP and nothing else moves.
//
// Both counts live in memory, so a restart clears them. That is fine. Render
// restarts on deploy, not on a schedule, and the Anthropic console spend cap is
// the hard backstop underneath all of this.
const IP_COOLDOWN_MS = 60_000;

// One visitor cannot eat the whole day. Three Briefs is more than an honest
// owner needs and far less than the day's budget.
//
// It is a Render field because of who hits it first: Ben, testing his own tool.
// He ran six valuations in an afternoon on Sep 17 and the fourth one came back
// as "we have hit today's limit", which reads to him like the tool is broken.
// Set EXIT_BRIEF_PER_IP_DAILY to something roomy while testing and put it back
// after. The site-wide cap below is the one that actually bounds the money, and
// it stays where it is.
export function perIpDailyLimit(): number {
  const raw = Number(process.env.EXIT_BRIEF_PER_IP_DAILY);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 3;
}

// Exported for the tests. A typo in the Render dashboard must not turn the cap
// off, so anything that is not a positive number falls back to 10.
export function dailyCap(): number {
  const raw = Number(process.env.EXIT_BRIEF_DAILY_CAP);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 10;
}

// The day the seller is living in, not the day the server is living in. Render
// runs on UTC, which rolls over at 3am Israel time. Keyed to Jerusalem so "10 a
// day" means one Israeli calendar day.
export function todayKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// ─── What the server says when it refuses ───────────────────────────────────
// Four sentences, and the seller reads whichever matches the page he is on.
// They are the only English the server puts on a Hebrew screen, so they are
// keyed by language and picked from the run's own lang.
//
// The Hebrew side is empty until file 30 lands (session C fills it). An empty
// string falls back to English, which is the right failure: a man reads a
// sentence he may not want rather than a blank screen.
type RunLang = "en" | "he";

const SERVER_MESSAGES: Record<
  "cooldown" | "overCap" | "notConfigured" | "busy",
  Record<RunLang, string>
> = {
  // He pressed the button twice inside a minute.
  cooldown: {
    en: "You have already generated a Brief in the last minute. Wait a moment and try again, or talk to us and we will pull the Brief together by hand.",
    he: "", // DRAFT, from file 30 in session C
  },
  // The day's budget, or this one visitor's share of it, is gone. No dead end,
  // a way to reach a human.
  overCap: {
    en: "We have hit today's limit on free Briefs. Talk to us and we will pull the Brief together by hand.",
    he: "", // DRAFT, from file 30 in session C
  },
  notConfigured: {
    en: "Our Brief engine is not configured yet. Talk to us and we will pull the Brief together by hand.",
    he: "", // DRAFT, from file 30 in session C
  },
  busy: {
    en: "Our Brief engine is busy. Try again in a minute, or talk to us and we will pull the Brief together by hand.",
    he: "", // DRAFT, from file 30 in session C
  },
};

function serverMessage(
  key: keyof typeof SERVER_MESSAGES,
  lang: RunLang,
): string {
  return SERVER_MESSAGES[key][lang] || SERVER_MESSAGES[key].en;
}

/** Only "he" or "en". Anything else, including nothing, is English. */
function readLang(raw: unknown): RunLang {
  return raw === "he" ? "he" : "en";
}

// ─── In-memory stores ───────────────────────────────────────────────────────
// briefId -> the seller brief markdown (v7 is seller-only, no trace)
// briefId -> the whole saved run. It used to hold the markdown string alone,
// which is why the email drifted from the page: the email had no range_text, no
// path_used and no company name, so it rendered the model's own prose instead of
// the fields the page renders. The email is a second view of this object now.
const briefStore = new Map<string, SnapshotRun>();

// IP -> last request timestamp (ms)
const rateLimitStore = new Map<string, number>();

// Today's counts. Both are wiped the moment the date key changes, so these maps
// never grow past one day of traffic.
let usageDay = todayKey();
let briefsToday = 0;
const briefsTodayByIp = new Map<string, number>();

function rollDayIfNeeded(): void {
  const today = todayKey();
  if (today !== usageDay) {
    usageDay = today;
    briefsToday = 0;
    briefsTodayByIp.clear();
  }
}

// Lead requests
interface LeadRequest {
  name: string;
  email: string;
  phone: string;
  briefId: string;
  requestedAt: Date;
}
const leadStore = new Map<string, LeadRequest>();

// ─── Helpers ────────────────────────────────────────────────────────────────
function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

// Store the IP hashed, abuse only. We never keep the raw IP. Matches the firm's
// "we never share your numbers" promise.
function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 64);
}

// Which page the lead came off, for the Sheet's last column. We only keep the
// path, never the query string, so nothing personal can ride along in a URL.
function sourcePageFromReferer(req: Request): string | undefined {
  const referer = req.headers.referer;
  if (typeof referer !== "string") return undefined;
  try {
    return new URL(referer).pathname;
  } catch {
    return undefined;
  }
}

// Which language a contact form was filled in, read off the page it sat on.
// Every Hebrew page lives under /he, so the path is the whole answer and no
// form has to send a new field.
function langFromSourcePage(sourcePage?: string): RunLang {
  return sourcePage === "/he" || sourcePage?.startsWith("/he/") ? "he" : "en";
}

function domainFromUrl(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

// The snapshot email carries no link and no button. Its call to action is the
// reply, which is why reply-to has to be a live mailbox. See server/lib/
// snapshotEmail.ts.

// Anyone can POST to /api/contact, so anything that came off the wire gets
// escaped before it lands in an email we are going to open and read.
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// The "he just ran a valuation" block at the top of the lead email. Nothing at
// all when he did not, so a plain contact form email looks exactly as it did.
function valuationBlockHtml(v?: {
  briefId?: string;
  site?: string;
  company?: string;
  range?: string;
  revenue?: string;
  profit?: string;
  ownerSalary?: string;
  timeToSell?: string;
  /** "en" or "he". Which page he ran the tool on. */
  lang?: string;
}): string {
  if (!v || !v.site) return "";
  const row = (label: string, value?: string) =>
    value
      ? `<tr><td style="padding: 6px 8px; font-weight: bold; width: 130px;">${esc(label)}</td><td style="padding: 6px 8px;">${esc(value)}</td></tr>`
      : "";
  return `
    <div style="background: #F8F4ED; border-left: 4px solid #1B3A5C; padding: 16px 12px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px; font-weight: bold; color: #1B3A5C;">This lead ran a Valuation Snapshot first.</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        ${row("Company", v.company)}
        ${row("Website", v.site)}
        ${row("Range shown", v.range)}
        ${row("Revenue", v.revenue)}
        ${row("Pre-tax profit", v.profit)}
        ${row("Owner salary", v.ownerSalary)}
        ${row("Wants to sell", v.timeToSell)}
        ${row("Language", v.lang)}
        ${row("Brief ID", v.briefId)}
      </table>
    </div>
  `;
}

// The meta block the model returns first. v2: the model names the company,
// the vertical and three buyer types. It returns no number. The fields the
// page and the sheet read (range_variant, range_text, path_used, the four
// recipe numbers, tier) are filled in here, by the server, after the math.
interface BriefMeta {
  company_name?: string;
  company_oneliner?: string;
  vertical_matched?: string; // a vertical id, a backup-* id, or wild-card
  buyer_types?: string; // "a, b, or c", three generic types
  readable?: boolean;
  // Filled by the server:
  range_variant?: string; // "number" | "by_hand" | "unreadable"
  range_text?: string;
  path_used?: string; // "T1" | "T2" | "T3" | wild_card | too_big | too_small | unreadable
  tier?: number;
  headcount_used?: number;
  headcount_source?: string;
  revenue_per_head?: number;
  margin?: number;
  multiple?: number;
}

// ─── The cache ──────────────────────────────────────────────────────────────
// One brief per (domain, inputs). The second run of the same site with the
// same numbers gets the first run's words and number back, instantly and for
// free. That is the whole cure for "same site, different answer". Lives in
// memory: a deploy empties it, so a brain change never serves a stale brief,
// and a run that is a month old is re-done.
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
interface CachedRun {
  briefId: string;
  fullMarkdown: string; // JSON block + Market + Value + the Range section
  meta: BriefMeta;
  resultMd: string;
  savedRun: SnapshotRun;
  at: number;
}
const runCache = new Map<string, CachedRun>();
function cacheKey(domain: string, revenue?: string, profit?: string, lang: string = "en"): string {
  // The language is part of the key: a Hebrew run must never be served an
  // English brief from the cache, or the other way round.
  return `${lang}|${domain}|${(revenue ?? "").replace(/\D/g, "")}|${(profit ?? "").replace(/\D/g, "")}`;
}
// How many times each domain has been run. Three or more is an owner who
// keeps coming back, which Ben wants flagged in the sheet.
const runsByDomain = new Map<string, number>();

/** "7,200,000" or "7.2M" or "7200000" to a number of NIS, or undefined. */
function parseNis(raw?: string): number | undefined {
  if (!raw) return undefined;
  const s = raw.trim().replace(/[,\s₪]/g, "");
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(m|k)?$/i);
  if (!m) return undefined;
  const n = Number(m[1]) * (m[2]?.toLowerCase() === "m" ? 1e6 : m[2]?.toLowerCase() === "k" ? 1e3 : 1);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Walk a JSON object from its opening brace to its matching close.
 *
 * The old code used a non-greedy `\{[\s\S]*?\}`, which stops at the FIRST
 * closing brace. Any nested object in the meta ended that match early, the parse
 * failed, and the whole block stayed in the seller-facing markdown.
 */
function balancedObject(text: string, from: number): string | null {
  if (text[from] !== "{") return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(from, i + 1);
    }
  }
  return null;
}

/**
 * Split the meta block off the seller-facing cards.
 *
 * This is the only place the JSON is removed, and it runs once, at generation.
 * What it returns is what gets stored, shown on the page and sent in the email,
 * so a miss here reaches the owner three ways. It missed on Sep 17: raw JSON and
 * a stray "---" went out in a real email, and the page had the same text.
 *
 * Three shapes are handled now, in order of how much we trust them:
 *   1. A fenced ```json block, which is what the bundle asks for.
 *   2. A --- fenced block, which is what the model actually produced that day.
 *   3. A bare object before the first heading.
 *
 * Every path scans matching braces rather than guessing at the first "}", and
 * whatever is left is cleared of leading rules and blank lines.
 */
function parseMetaAndBody(fullMarkdown: string): { meta: BriefMeta; resultMd: string } {
  const text = fullMarkdown ?? "";

  const finish = (metaRaw: string, rest: string): { meta: BriefMeta; resultMd: string } => {
    let meta: BriefMeta = {};
    try {
      meta = JSON.parse(metaRaw.trim()) as BriefMeta;
    } catch {
      meta = {};
    }
    return { meta, resultMd: stripLeadingRules(rest) };
  };

  // 1. Fenced ```json ... ```
  const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
  if (fenced && typeof fenced.index === "number") {
    return finish(fenced[1], text.slice(fenced.index + fenced[0].length));
  }

  // 2. The first { anywhere in the opening stretch of the document, whether or
  //    not a --- or a blank line sits in front of it. Only the opening stretch:
  //    a brace deep in the prose is the model's words, not a meta block.
  const head = text.slice(0, 4000);
  const brace = head.indexOf("{");
  if (brace !== -1 && !/[A-Za-z]{3}/.test(head.slice(0, brace).replace(/[-\s`json]/gi, ""))) {
    const obj = balancedObject(text, brace);
    if (obj) return finish(obj, text.slice(brace + obj.length));
  }

  // No meta found. Hand back the markdown untouched so the page still renders.
  return { meta: {}, resultMd: stripLeadingRules(text) };
}

/** Drop the --- rules and blank lines a fenced block leaves behind. */
function stripLeadingRules(s: string): string {
  return s.replace(/^(?:\s*(?:-{3,}|_{3,}|\*{3,})\s*)+/g, "").trim();
}

// ─── Route: POST /api/exit-brief ────────────────────────────────────────────
async function handleExitBrief(req: Request, res: Response) {
  // Read first, because a refusal has to come back in the language of the
  // page he is standing on, and a cached run must match his language.
  const lang = readLang((req.body as { lang?: unknown } | undefined)?.lang);

  const body = req.body as {
    url?: string;
    revenue?: string;
    pretax_profit?: string;
    owner_salary?: string;
    /** "Within six months", "Just exploring". Words, already, not a code. */
    time_to_sell?: string;
    /** "en" or "he". Which door the owner came in by. */
    lang?: string;
    // Tolerate the old field names during the transition.
    ebitda?: string;
    sde?: string;
  };
  const { url, revenue } = body;
  const pretaxProfit = body.pretax_profit ?? body.ebitda;
  // The front door stopped asking for this on Sep 17. Still read, because an
  // older tab left open still sends it and there is no reason to drop it.
  const ownerSalary = body.owner_salary ?? body.sde;
  const timeToSell = body.time_to_sell;

  if (!url) {
    res.status(400).json({ error: "A company website URL is required." });
    return;
  }

  // Sellers type bare domains ("manltd.co.il"). Add a scheme so new URL() and the
  // model's web read both get a real address, instead of rejecting the run.
  const normalizedUrl = /^https?:\/\//i.test(url.trim())
    ? url.trim()
    : "https://" + url.trim();

  // Basic URL validation
  try {
    new URL(normalizedUrl);
  } catch {
    res.status(400).json({ error: "Please enter a valid website URL." });
    return;
  }

  const domain = domainFromUrl(normalizedUrl);
  const revenueNis = parseNis(revenue);
  const profitNis = parseNis(pretaxProfit);
  const key = cacheKey(domain ?? normalizedUrl, revenue, pretaxProfit, lang);
  const runsThisDomain = (runsByDomain.get(domain ?? normalizedUrl) ?? 0) + 1;
  runsByDomain.set(domain ?? normalizedUrl, runsThisDomain);

  // A run we already did. Same site, same inputs, same brief, no model call,
  // no cooldown, nothing billed. Streams the saved run in the same shape so
  // the page walks its steps and lands on the same number.
  const hit = runCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    briefStore.set(hit.briefId, hit.savedRun);
    res.setHeader("Content-Type", "application/x-ndjson");
    res.write(JSON.stringify({ type: "phase", phase: "searching" }) + "\n");
    res.write(JSON.stringify({ type: "chunk", data: hit.fullMarkdown }) + "\n");
    void appendValuationRow({
      site: domain ?? normalizedUrl,
      company: hit.meta.company_name,
      range: hit.meta.range_text,
      revenue: revenue ? `NIS ${revenue}` : "",
      profit: pretaxProfit ? `NIS ${pretaxProfit}` : "",
      timeToSell: timeToSell ?? "",
      vertical: hit.meta.vertical_matched,
      path: `${hit.meta.path_used} (cached)`,
      seconds: "0.0",
      cost: "0",
      askedForBrief: "no",
      briefId: hit.briefId,
      brief: hit.resultMd,
      headcount: hit.meta.headcount_used === undefined ? "" : `${hit.meta.headcount_used} (${hit.meta.headcount_source})`,
      perHead: hit.meta.revenue_per_head === undefined ? "" : String(hit.meta.revenue_per_head),
      margin: hit.meta.margin === undefined ? "" : String(hit.meta.margin),
      multiple: hit.meta.multiple === undefined ? "" : String(hit.meta.multiple),
      runsOnDomain: String(runsThisDomain),
      lang,
    });
    res.write(
      JSON.stringify({
        type: "done",
        briefId: hit.briefId,
        meta: hit.meta,
        result_md: hit.resultMd,
        run_token: makeRunToken(hit.savedRun, hit.briefId),
      }) + "\n",
    );
    res.end();
    return;
  }

  const ip = getClientIp(req);
  const now = Date.now();
  const last = rateLimitStore.get(ip) ?? 0;

  if (now - last < IP_COOLDOWN_MS) {
    res.status(429).json({ error: serverMessage("cooldown", lang) });
    return;
  }

  rollDayIfNeeded();

  if (briefsToday >= dailyCap()) {
    console.warn(`[exit-brief] Daily cap of ${dailyCap()} reached for ${usageDay}.`);
    res.status(429).json({ error: serverMessage("overCap", lang) });
    return;
  }

  if ((briefsTodayByIp.get(ip) ?? 0) >= perIpDailyLimit()) {
    console.warn(`[exit-brief] Per-IP daily limit of ${perIpDailyLimit()} reached.`);
    res.status(429).json({ error: serverMessage("overCap", lang) });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: serverMessage("notConfigured", lang) });
    return;
  }

  // Count it here, not at the end. A run that starts has already cost money,
  // whether or not it finishes.
  rateLimitStore.set(ip, now);
  briefsToday += 1;
  briefsTodayByIp.set(ip, (briefsTodayByIp.get(ip) ?? 0) + 1);

  // Build user message
  let userMessage = `URL: ${normalizedUrl}`;
  if (revenue || pretaxProfit || ownerSalary || timeToSell) {
    const parts: string[] = [];
    if (revenue) parts.push(`revenue NIS ${revenue}`);
    if (pretaxProfit) parts.push(`pre-tax profit NIS ${pretaxProfit}`);
    if (ownerSalary) parts.push(`owner salary NIS ${ownerSalary}`);
    // Not a valuation input. It is here so the brief can read the room: a man
    // six months out needs different words from a man who is just curious.
    if (timeToSell) parts.push(`wants to sell: ${timeToSell}`);
    userMessage += `\nIntake: ${parts.join(", ")}`;
  }

  // Read the seller's actual website and put it in the prompt.
  //
  // The engine has never been able to do this. Its only tool is web_search, so
  // "read their website" meant "search the name and hope". That is why
  // optima.org.il failed: the search returned a US real estate firm and several
  // dental practices, and the engine correctly refused to price a company it
  // had not read. It is also why the numbers have been soft on the runs that
  // did work, because those were built from what the web says about a business
  // rather than what the business says about itself.
  //
  // Never blocks and never throws. A site that will not answer comes back null
  // and the unreadable path works exactly as it did before.
  const siteRead = await readSite(normalizedUrl);
  if (siteRead) {
    userMessage += `\n\n${siteReadBlock(siteRead)}`;
    console.log(
      `[exit-brief] read ${siteRead.finalUrl}: ${siteRead.text.length} chars` +
        (siteRead.truncated ? " (truncated)" : ""),
    );
  } else {
    // v2: no site, no run. The model cannot read it either (its only tool is
    // search), so there is nothing to pay for. The page shows the
    // "we could not read your site" screen off this meta.
    console.warn(`[exit-brief] could not read ${normalizedUrl}`);
    res.setHeader("Content-Type", "application/x-ndjson");
    res.write(
      JSON.stringify({
        type: "done",
        briefId: nanoid(12),
        meta: { range_variant: "unreadable", range_text: "", path_used: "unreadable" },
        result_md: "",
      }) + "\n",
    );
    res.end();
    void appendValuationRow({
      site: domain ?? normalizedUrl,
      path: "unreadable",
      seconds: "0.0",
      cost: "0",
      askedForBrief: "no",
      runsOnDomain: String(runsThisDomain),
      lang,
    });
    return;
  }

  const anthropic = new Anthropic({ apiKey });
  const briefId = nanoid(12);
  let fullMarkdown = "";
  const startedAt = Date.now();
  // Token usage, read off the stream for the leads row (cost per valuation).
  const usage = {
    inputTokens: 0,
    outputTokens: 0,
    cachedInputTokens: 0,
    webSearches: 0,
  };

  try {
    const stream = await anthropic.messages.create({
      model: BRIEF_MODEL,
      // v7: three short cards. The ceiling moves with the model, because a
      // thinking model spends part of it before it writes a word. See
      // BRIEF_MAX_TOKENS above.
      max_tokens: BRIEF_MAX_TOKENS,
      // Only on a model that accepts it. Haiku 4.5 does not, and sending it
      // there is a 400, not a shrug.
      ...(WANTS_ADAPTIVE_THINKING
        ? { thinking: { type: "adaptive" as const } }
        : {}),
      // v8: no randomness. The recipe is four multiplications, and the same
      // site with the same input must print the same range every run. A
      // thinking model refuses any temperature but the default, so it is only
      // set when thinking is off.
      ...(WANTS_ADAPTIVE_THINKING ? {} : { temperature: 0 }),
      // v7: cache the ~10k-token bundle so it is billed once, not re-sent every run.
      // The seller URL + intake stay the dynamic part in the user message.
      // The Hebrew block rides after the bundle, as its own uncached piece, so
      // the bundle's cache entry is the same object on an English run and a
      // Hebrew one. Same brain, one added instruction sheet. Nothing about
      // language is ever written into the bundle itself.
      system: [
        {
          type: "text",
          text: EXIT_BRIEF_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
        ...(lang === "he" && HEBREW_ADDENDUM
          ? [{ type: "text" as const, text: HEBREW_ADDENDUM }]
          : []),
      ],
      messages: [{ role: "user", content: userMessage }],
      stream: true,
      tools: [
        {
          // v7: light live look only. The deep comp + buyer hunt moved to the cache.
          // Kept on the basic tool version on purpose: the newer one runs code
          // execution under the hood, which is a bigger change than this needs.
          type: "web_search_20250305",
          name: "web_search",
          max_uses: MAX_WEB_SEARCHES,
        } as unknown as Anthropic.Tool,
      ],
    });

    // Stream markdown to client in real time (newline-delimited JSON)
    res.setHeader("Content-Type", "application/x-ndjson");

    // Tell the page when the model starts its web search, so the working screen can
    // show a real "Learning your size and your story" stage, not a fake timer.
    let sentSearching = false;

    for await (const event of stream) {
      if (event.type === "message_start") {
        const u = event.message.usage;
        usage.inputTokens = u.input_tokens ?? 0;
        usage.cachedInputTokens = u.cache_read_input_tokens ?? 0;
      } else if (
        event.type === "content_block_start" &&
        !sentSearching &&
        ((event as { content_block?: { type?: string } }).content_block?.type ===
          "server_tool_use" ||
          (event as { content_block?: { type?: string } }).content_block?.type ===
            "web_search_tool_result")
      ) {
        sentSearching = true;
        res.write(JSON.stringify({ type: "phase", phase: "searching" }) + "\n");
      } else if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        const chunk = event.delta.text;
        fullMarkdown += chunk;
        // Send chunk to client as newline-delimited JSON
        res.write(JSON.stringify({ type: "chunk", data: chunk }) + "\n");
      } else if (event.type === "message_delta") {
        usage.outputTokens = event.usage.output_tokens ?? usage.outputTokens;
        // How many searches actually ran. Billed separately from tokens, so the
        // cost column needs it. The API reports the running total, not a delta.
        const served = (
          event.usage as { server_tool_use?: { web_search_requests?: number } }
        ).server_tool_use?.web_search_requests;
        if (typeof served === "number") usage.webSearches = served;
      }
    }

    // v2: the model handed back the company, the vertical and three buyer
    // types, then Market and Value. Everything about the number happens here.
    const parsed = parseMetaAndBody(fullMarkdown);
    const meta = parsed.meta;
    let resultMd = parsed.resultMd;

    const row = VERTICALS.get(meta.vertical_matched ?? "");
    const buyers = (meta.buyer_types ?? "").trim() || row?.buyers || "the buyers we see for a business like yours";
    let range: RangeResult | null = null;
    if (meta.readable === false) {
      meta.range_variant = "unreadable";
      meta.range_text = "";
      meta.path_used = "unreadable";
      resultMd = "";
    } else if (!row) {
      // wild-card, or an id the library does not know. By hand, honestly.
      meta.range_variant = "by_hand";
      meta.range_text = "";
      meta.path_used = "wild_card";
    } else {
      range = computeRange({
        row,
        headcount: siteRead?.headcount,
        headcountSource: siteRead?.headcountSource,
        revenue: revenueNis,
        profit: profitNis,
      });
      meta.tier = range.tier;
      meta.headcount_used = range.headcountUsed;
      meta.headcount_source = range.headcountSource;
      meta.revenue_per_head = range.perHead;
      meta.margin = range.margin;
      meta.multiple = range.multiple;
      if (range.outcome === "number") {
        meta.range_variant = "number";
        meta.range_text = rangeText(range);
        meta.path_used = `T${range.tier}`;
      } else {
        meta.range_variant = "by_hand";
        meta.range_text = "";
        meta.path_used = range.outcome;
      }
    }
    meta.buyer_types = buyers;

    // The Range section, written by the server in Ben's fixed words, streamed
    // as the last chunk so the page's "Working out the value" step ends on the
    // same signal it always did, and stored so the sheet and the email carry
    // the same number as the page.
    if (meta.range_variant !== "unreadable") {
      const rangeMd = rangeMarkdown(range, buyers);
      resultMd = resultMd.replace(/\n*## Range and call[\s\S]*$/, "").trimEnd() + "\n\n" + rangeMd;
      fullMarkdown += "\n\n" + rangeMd;
      res.write(JSON.stringify({ type: "chunk", data: "\n\n" + rangeMd }) + "\n");
    }

    const savedRun: SnapshotRun = {
      companyName: meta.company_name,
      companyOneliner: meta.company_oneliner,
      rangeVariant: meta.range_variant,
      rangeText: meta.range_text,
      buyerTypes: meta.buyer_types,
      pathUsed: meta.path_used,
      resultMd,
      logoUrl: siteRead?.logoUrl,
      // The language of the page he pressed the button on. Saved with the run,
      // so the email, the PDF request and the Sheet row never have to guess.
      lang,
    };
    briefStore.set(briefId, savedRun);
    if (meta.range_variant !== "unreadable") {
      runCache.set(key, { briefId, fullMarkdown, meta, resultMd, savedRun, at: Date.now() });
    }

    void insertValuationLead({
      briefId,
      url: normalizedUrl,
      revenue: revenue ?? null,
      pretaxProfit: pretaxProfit ?? null,
      ownerSalary: ownerSalary ?? null,
      companyName: meta.company_name ?? null,
      companyDomain: domain ?? null,
      rangeVariant: meta.range_variant ?? null,
      rangeText: meta.range_text ?? null,
      buyerTypes: meta.buyer_types ?? null,
      verticalMatched: meta.vertical_matched ?? null,
      pathUsed: meta.path_used ?? null,
      resultMd,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedInputTokens: usage.cachedInputTokens,
      generationMs: Date.now() - startedAt,
      source: (req.headers["referer"] as string | undefined) ?? null,
      ipHash: hashIp(ip),
    });

    void appendValuationRow({
      site: domain ?? normalizedUrl,
      company: meta.company_name,
      range: meta.range_text,
      revenue: revenue ? `NIS ${revenue}` : "",
      profit: pretaxProfit ? `NIS ${pretaxProfit}` : "",
      ownerSalary: ownerSalary ? `NIS ${ownerSalary}` : "",
      timeToSell: timeToSell ?? "",
      vertical: meta.vertical_matched,
      path: meta.path_used,
      seconds: ((Date.now() - startedAt) / 1000).toFixed(1),
      cost: runCostUsd(usage),
      askedForBrief: "no",
      briefId,
      brief: resultMd,
      headcount: range ? `${range.headcountUsed} (${range.headcountSource})` : "",
      perHead: range ? String(range.perHead) : "",
      margin: range ? String(range.margin) : "",
      multiple: range ? String(range.multiple) : "",
      runsOnDomain: String(runsThisDomain),
      // Which door he came in by. Ben can count Hebrew runs against
      // English ones in the same tab.
      lang,
    });

    res.write(
      JSON.stringify({
        type: "done",
        briefId,
        meta,
        result_md: resultMd,
        run_token: makeRunToken(savedRun, briefId),
      }) + "\n",
    );
    res.end();
  } catch (err) {
    console.error("[exit-brief] Anthropic error:", err);
    res.status(500).json({ error: serverMessage("busy", lang) });
  }
}

// ─── Route: POST /api/contact ────────────────────────────────────────────────
async function handleContact(req: Request, res: Response) {
  const { name, email, phone, role, company, website, revenue, stage, message, sourcePage, valuation } =
    req.body as {
      name?: string;
      email?: string;
      phone?: string;
      role?: string;
      company?: string;
      /** His own site, asked for on the form since Sep 17. */
      website?: string;
      revenue?: string;
      stage?: string;
      message?: string;
      sourcePage?: string;
      // Set when the owner came off the valuation tool. The talk popup on
      // /valuation sends it; see TalkModal in client/src/pages/Valuation.tsx.
      valuation?: {
        briefId?: string;
        site?: string;
        company?: string;
        range?: string;
        revenue?: string;
        profit?: string;
        ownerSalary?: string;
        timeToSell?: string;
      };
    };

  // The homepage form asks for one contact field, "Phone or email", because a
  // 60-year-old owner is far likelier to leave a mobile number than an address.
  // So either one is enough. Reply-to is only set when there is a real address.
  if (!name || !message || (!email && !phone)) {
    res.status(400).json({ error: "Name, a way to reach you, and a message are required." });
    return;
  }

  const leadSourcePage = sourcePage ?? sourcePageFromReferer(req);

  // Start the Sheet write now and settle it at the end. It runs alongside the
  // email instead of in front of it, so a slow or broken Sheet never holds the
  // email up. appendLeadRow never rejects, so this promise is safe to hold.
  const sheetWrite = appendLeadRow({
    name,
    email,
    phone,
    // The home form does not ask for a company. If he ran a valuation, we know
    // it anyway, so the column stops being empty for the leads that matter most.
    company: company ?? valuation?.company,
    revenue,
    stage,
    message,
    valuationSite: valuation?.site,
    valuationRange: valuation?.range,
    valuationRevenue: valuation?.revenue,
    valuationProfit: valuation?.profit,
    valuationOwnerSalary: valuation?.ownerSalary,
    website,
    valuationBriefId: valuation?.briefId,
    valuationTimeToSell: valuation?.timeToSell,
    // The page the form sat on. Falls back to the referring URL when the form
    // does not send one.
    sourcePage: leadSourcePage,
    lang: langFromSourcePage(leadSourcePage),
  });

  const resendKey = process.env.RESEND_API_KEY;
  const notifyEmail = NOTIFY_EMAIL;

  if (!resendKey) {
    // Used to return success here, which meant a real lead vanished with
    // nothing but a console line. Now the owner is told it did not go through,
    // and the lead is still in the Sheet if the Sheet is wired up.
    console.error("[contact] RESEND_API_KEY not set. Contact form submission NOT emailed:", { name, email, phone, role });
    await sheetWrite;
    res.status(500).json({
      error: "Email delivery is not configured. Please try again later or email us directly.",
    });
    return;
  }

  const resend = new Resend(resendKey);

  try {
    await resend.emails.send({
      from: sender("Gesher Contact Form"),
      to: notifyEmail,
      // Only a real address can be replied to. A phone number in reply-to would
      // make every reply bounce.
      ...(email ? { replyTo: email } : {}),
      subject: valuation?.site
        ? `New contact from ${name}, ran a valuation on ${valuation.site}`
        : `New contact from ${name} (${role ?? "not specified"})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px;">
          <h2 style="color: #1B3A5C;">New Contact Form Submission</h2>
          ${valuationBlockHtml(valuation)}
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 100px;">Name</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(name)}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Website</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(website ?? "(none)")}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(email ?? "(none)")}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Phone</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(phone ?? "(none)")}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Role</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(role ?? "(none)")}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Company</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(company ?? "(none)")}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Revenue</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(revenue ?? "(none)")}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Stage</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(stage ?? "(none)")}</td></tr>
          </table>
          <h3 style="color: #1B3A5C;">Message</h3>
          <p style="background: #f5f5f5; padding: 16px; border-radius: 4px; white-space: pre-wrap;">${esc(message)}</p>
        </div>
      `,
    });

    const written = await sheetWrite;
    if (!written) {
      // The email went out, so the lead is not lost. The Sheet is just behind.
      console.warn("[contact] Emailed the lead but did not write it to the Sheet:", { name, email, phone });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[contact] Resend error:", err);
    await sheetWrite;
    res.status(500).json({ error: "Failed to send message. Please try again or email us directly." });
  }
}

// ─── Route: POST /api/exit-brief/pdf-request ───────────────────────────────
// The owner hands over his name, email and phone and gets his Brief. It goes to
// him in the same second, and a copy of the lead goes to office@.
//
// It did not used to. It used to email Ben alone, saying "send the PDF to him
// within 24 hours", with a link to the Brief that died on the next deploy.
// The owner got a thank-you and nothing else. There was already a finished
// route in this file that mailed him properly, and nothing called it. That one
// is gone now and its email lives here, so there is one way to do this.
async function handlePdfRequest(req: Request, res: Response) {
  const { name, email, phone, briefId } = req.body as {
    name?: string;
    email?: string;
    phone?: string;
    briefId?: string;
  };
  // The lead-capture modal may re-offer the numbers. Tolerate new and old names.
  const leadRevenue = req.body?.revenue as string | undefined;
  const leadPretaxProfit = (req.body?.pretax_profit ?? req.body?.profit) as
    | string
    | undefined;
  const leadOwnerSalary = req.body?.owner_salary as string | undefined;

  // Everything the owner picked or was shown, in his words. This is what makes
  // the lead email worth opening: who he is, what he runs, what he told us and
  // what number he walked away with.
  const shown = {
    site: req.body?.site as string | undefined,
    company: req.body?.companyName as string | undefined,
    range: req.body?.rangeShown as string | undefined,
    revenue: req.body?.revenueBand as string | undefined,
    profit: req.body?.profitBand as string | undefined,
    ownerSalary: req.body?.ownerSalaryBand as string | undefined,
    timeToSell: req.body?.timeToSell as string | undefined,
  };

  if (!name || !email || !briefId) {
    res.status(400).json({ message: "Name, email, and briefId are required." });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ message: "Invalid email address." });
    return;
  }

  // Memory first. If this process has restarted since he ran it, the page
  // still has the run we signed and sent it, so take it from there.
  const run = briefStore.get(briefId) ?? readRunToken(req.body?.runToken, briefId);
  if (!run) {
    res.status(404).json({
      message:
        "That snapshot has expired. Run it again and we will email it to you.",
    });
    return;
  }

  // An unreadable run produced no snapshot, so there is nothing to send. The
  // page never offers the form in that state, but the endpoint is open to
  // anyone holding a briefId, so the rule is enforced here too.
  if (!shouldSendEmail(run)) {
    res.status(409).json({ message: "There is no snapshot for that run." });
    return;
  }

  const leadId = nanoid();
  const lead: LeadRequest = {
    name,
    email,
    phone: phone || "",
    briefId,
    requestedAt: new Date(),
  };
  leadStore.set(leadId, lead);

  // Fill his details into the valuation row that is already in the Sheet, so
  // there is one line per run and it says who came back. Non-blocking.
  void markValuationBriefRequested(briefId, { name, email, phone });

  // Update the same lead row by briefId (non-fatal). Fills in the contact, flips
  // pdf_requested, and folds in any numbers the modal collected.
  void markValuationLeadPdfRequested(briefId, {
    contactName: name,
    contactEmail: email,
    contactPhone: phone || null,
    ...(leadRevenue ? { revenue: leadRevenue } : {}),
    ...(leadPretaxProfit ? { pretaxProfit: leadPretaxProfit } : {}),
    ...(leadOwnerSalary ? { ownerSalary: leadOwnerSalary } : {}),
  });

  const resendKey = process.env.RESEND_API_KEY;
  const notifyEmail = NOTIFY_EMAIL;

  if (!resendKey) {
    res.status(500).json({ message: "Email delivery is not configured." });
    return;
  }

  const resend = new Resend(resendKey);

  try {
    // The owner's copy goes first. If this is the only mail that gets out, the
    // person who is owed something has it.
    await resend.emails.send({
      from: sender("Gesher"),
      to: email,
      // The reply is the whole call to action, so this must land somewhere a
      // human reads. It is already the from address; setting it explicitly
      // means a later change to MAIL_FROM cannot quietly break the reply.
      replyTo: NOTIFY_EMAIL,
      subject: snapshotSubject(run),
      html: buildSnapshotEmailHtml(run, { name }),
      text: buildSnapshotEmailText(run, { name }),
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px;">
        <h2 style="color: #1B3A5C; margin-bottom: 8px;">New Valuation Snapshot lead</h2>
        <p style="color: #666; font-size: 14px; margin: 0 0 24px;">His copy of the Brief has already been sent to him. Nothing is owed.</p>
        ${valuationBlockHtml({ ...shown, briefId, lang: run.lang })}
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 100px;">Name</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(name)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(email)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Phone</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(phone || "(not provided)")}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Brief ID</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(briefId)}</td>
          </tr>
        </table>
        <h3 style="color: #1B3A5C; margin-bottom: 4px;">The snapshot he was sent</h3>
        <p style="color: #666; font-size: 13px; margin: 0 0 14px;">Exactly as it looks in his inbox.</p>
        <!-- The owner's letter itself, the same markup he received, not a
             second rendering of it. Ben asked to see what the customer sees;
             one fragment in two envelopes means the two can never drift. -->
        <div style="border: 1px solid #DCD4C4;">${snapshotLetterTable(run, { name })}</div>
      </div>
    `;

    await resend.emails.send({
      from: sender("Gesher Lead"),
      to: notifyEmail,
      ...(email ? { replyTo: email } : {}),
      subject: `New valuation lead: ${name} (${email})`,
      html: emailHtml,
    });

    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhookUrl) {
      try {
        await fetch(slackWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `New Valuation Snapshot PDF Request from ${name}`,
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*New Valuation Snapshot PDF Request*\n*Name:* ${name}\n*Email:* ${email}\n*Phone:* ${phone || "(not provided)"}\n*Brief ID:* ${briefId}`,
                },
              },
            ],
          }),
        });
      } catch (err) {
        console.warn("[pdf-request] Slack webhook failed (non-blocking):", err);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[pdf-request] Error:", err);
    res.status(500).json({ message: "Failed to process request. Please try again." });
  }
}

// ─── Register all routes ─────────────────────────────────────────────────────
export function registerApiRoutes(app: Express) {
  app.post("/api/exit-brief", handleExitBrief);
  app.post("/api/exit-brief/pdf-request", handlePdfRequest);
  app.post("/api/contact", handleContact);
}
