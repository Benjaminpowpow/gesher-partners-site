import type { Express, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { createHash } from "node:crypto";
import { EXIT_BRIEF_SYSTEM_PROMPT } from "../lib/exitBriefSkill";
import {
  appendLeadRow,
  appendValuationRow,
  markValuationBriefRequested,
} from "../lib/leadsSheet";
import { readSite, siteReadBlock } from "../lib/readSite";
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
const MAX_WEB_SEARCHES = 4;

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

// The message the seller sees when either gate closes. It is the same sentence
// the engine already uses when it is busy: no dead end, a way to reach a human.
const OVER_CAP_MESSAGE =
  "We have hit today's limit on free Briefs. Book a call with Ofir and we will pull the Brief together by hand.";

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
        ${row("Brief ID", v.briefId)}
      </table>
    </div>
  `;
}

// v7 page-mode meta block. The model returns a fenced ```json block first, then the
// three cards. Pull the meta fields out, and treat everything after the block as the
// seller-facing markdown. The seller (page, email, PDF) never sees the JSON.
interface BriefMeta {
  company_name?: string;
  company_oneliner?: string;
  range_variant?: string; // "number" | "by_hand"
  range_text?: string;
  buyer_types?: string;
  vertical_matched?: string; // internal calibration, never shown
  path_used?: string; // internal calibration, never shown
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
  const ip = getClientIp(req);
  const now = Date.now();
  const last = rateLimitStore.get(ip) ?? 0;

  if (now - last < IP_COOLDOWN_MS) {
    res.status(429).json({
      error:
        "You have already generated a Brief in the last minute. Wait a moment and try again, or book a call with Ofir and we will pull the Brief together by hand.",
    });
    return;
  }

  rollDayIfNeeded();

  if (briefsToday >= dailyCap()) {
    console.warn(`[exit-brief] Daily cap of ${dailyCap()} reached for ${usageDay}.`);
    res.status(429).json({ error: OVER_CAP_MESSAGE });
    return;
  }

  if ((briefsTodayByIp.get(ip) ?? 0) >= perIpDailyLimit()) {
    console.warn(`[exit-brief] Per-IP daily limit of ${perIpDailyLimit()} reached.`);
    res.status(429).json({ error: OVER_CAP_MESSAGE });
    return;
  }

  const body = req.body as {
    url?: string;
    revenue?: string;
    pretax_profit?: string;
    owner_salary?: string;
    /** "Within six months", "Just exploring". Words, already, not a code. */
    time_to_sell?: string;
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        "Our Brief engine is not configured yet. Book a call with Ofir and we will pull the Brief together by hand.",
    });
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
    userMessage +=
      "\n\nSITE TEXT: none. The page at this domain could not be fetched." +
      " Search alone is not a reading of the seller. Follow Rule 8.";
    console.warn(`[exit-brief] could not read ${normalizedUrl}`);
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
      // v7: cache the ~10k-token bundle so it is billed once, not re-sent every run.
      // The seller URL + intake stay the dynamic part in the user message.
      system: [
        {
          type: "text",
          text: EXIT_BRIEF_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
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

    // v7: split the meta block from the seller-facing cards. Store only the clean
    // markdown so the email and PDF never see the JSON.
    const { meta, resultMd } = parseMetaAndBody(fullMarkdown);
    const savedRun: SnapshotRun = {
      companyName: meta.company_name,
      companyOneliner: meta.company_oneliner,
      rangeVariant: meta.range_variant,
      rangeText: meta.range_text,
      buyerTypes: meta.buyer_types,
      pathUsed: meta.path_used,
      resultMd,
      // His own logo, lifted out of the page we already fetched. Undefined
      // means the email draws the lettered square instead.
      logoUrl: siteRead?.logoUrl,
      // /valuation is English only today. Saved with the run so the email never
      // has to guess, and so Hebrew is a words job later.
      lang: "en",
    };
    briefStore.set(briefId, savedRun);

    // Save the lead. Fire and forget, and never let a DB hiccup affect the seller.
    void insertValuationLead({
      briefId,
      url: normalizedUrl,
      revenue: revenue ?? null,
      pretaxProfit: pretaxProfit ?? null,
      ownerSalary: ownerSalary ?? null,
      companyName: meta.company_name ?? null,
      companyDomain: domainFromUrl(normalizedUrl) ?? null,
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

    // And the row Ben can actually open. The database above needs a MySQL
    // server that does not exist; this is the Google Sheet, which is free.
    // Written for every run, including the ones where nobody leaves a name,
    // because a stranger reading his range and walking is the thing Ben most
    // needs to be able to count. Fire and forget, never blocks the seller.
    void appendValuationRow({
      site: domainFromUrl(normalizedUrl) ?? normalizedUrl,
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
      // Flips to "yes" only if he comes back and asks for the brief.
      askedForBrief: "no",
      briefId,
      brief: resultMd,
    });

    // Send completion with the parsed meta so the page renders clean fields,
    // plus the signed run. The page holds that token and hands it back if it
    // asks for the email after a restart has emptied briefStore.
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
    res.status(500).json({
      error:
        "Our Brief engine is busy. Try again in a minute, or book a call with Ofir and we will pull the Brief together by hand.",
    });
  }
}

// ─── Route: POST /api/contact ────────────────────────────────────────────────
async function handleContact(req: Request, res: Response) {
  const { name, email, phone, role, company, revenue, stage, message, sourcePage, valuation } =
    req.body as {
      name?: string;
      email?: string;
      phone?: string;
      role?: string;
      company?: string;
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
    valuationBriefId: valuation?.briefId,
    valuationTimeToSell: valuation?.timeToSell,
    // The page the form sat on. Falls back to the referring URL when the form
    // does not send one.
    sourcePage: sourcePage ?? sourcePageFromReferer(req),
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
        ${valuationBlockHtml({ ...shown, briefId })}
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
