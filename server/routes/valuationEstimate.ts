/**
 * The valuation estimate. Three routes, one lead.
 *
 *   POST /api/valuation/estimate  The answers in, the engine run streamed out.
 *                                 The range is worked out and kept here.
 *   POST /api/valuation/unlock    His name and a phone or an email in, the
 *                                 range out. Nothing else ever sends it.
 *   POST /api/valuation/talk      "Talk to us". The hot lead. On the two
 *                                 no-number cases it carries his details too.
 *
 * Spec: site/35-valuation-lead-magnet.md in the vault (Ben, Oct 1 2026).
 *
 * THE LOCK. While the range is locked it does not exist anywhere the browser
 * can see: not in the stream, not in the "done" message, not in the token the
 * page carries (sealed, see lib/runToken.ts). The engine cannot leak it either,
 * because it never sees his profit band. The range is computed here and sent
 * by /unlock, and only after his details are on their way to the Sheet. A blur
 * on the page is not the lock. This file is.
 *
 * THE LEAD. The answers are written to the Sheet before the engine runs, so an
 * owner who gives up on the working screen is still a row. The run fills the
 * same row in when it ends, his details land in it the moment he sends them,
 * and "Talk to us" marks it. One row per run, found by its Brief ID.
 *
 * The old tool (routes/exitBrief.ts) still serves /he/valuation until the
 * Hebrew pass. Both share the engine, the daily cap and the mail settings.
 */
import type { Express, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { nanoid } from "nanoid";
import { COPY_V, rangeFigureText } from "../../client/src/pages/valuationCopy";
import {
  NOTE_MAX,
  PROFIT_BAND,
  PROFIT_CODES,
  REVENUE_CODES,
  STAFF_CODES,
  TIMELINE_CODES,
  contactProblem,
  missingRequired,
  revenueCheckFails,
  type EstimateAnswers,
  type ProfitCode,
  type RevenueCode,
  type StaffCode,
  type TimelineCode,
} from "@shared/valuationEstimate";
import {
  BRIEF_MODEL,
  HEBREW_FALLBACK_MODEL,
  HEBREW_LINE,
  domainFromUrl,
  failsHebrewCheck,
  parseMetaAndBody,
  readLang,
  runCostUsd,
  runEngine,
  serverMessage,
  type BriefMeta,
  type EngineAttempt,
  type RunLang,
} from "../lib/engine";
import { countDomainRun, countRun, gateRefusal, getClientIp } from "../lib/runGates";
import { appendValuationRow, updateValuationRow, type ValuationRow } from "../lib/leadsSheet";
import { noSiteBlock, readSite, siteReadBlock } from "../lib/readSite";
import { VERTICALS, estimateRange } from "../lib/valuationMath";
import { briefProblems, tidyBrief, trimMarket } from "../lib/briefShape";
import { openRun, sealRun } from "../lib/runToken";
import {
  buildEstimateEmailHtml,
  buildEstimateEmailText,
  buildTalkConfirmationHtml,
  buildTalkConfirmationText,
  estimateSubject,
  talkConfirmationSubject,
  type EstimateLetter,
} from "../lib/estimateEmail";
import { NOTIFY_EMAIL, esc, sender } from "../lib/mail";

// ─── The run ────────────────────────────────────────────────────────────────

/** His answers as codes. Free text is trimmed and capped. */
export interface RunAnswers {
  timeline: TimelineCode;
  serious: number;
  revenue: RevenueCode;
  profit: ProfitCode;
  staff: StaffCode | "";
  note: string;
}

/** One finished run, held here and sealed into the page's token. */
export interface EstimateRun {
  lang: RunLang;
  site: string;
  /** number: a range, locked until he leaves details. The other two: no number. */
  variant: "number" | "by_hand" | "big";
  /** "₪6M to ₪11M". Empty unless variant is number. Never sent before /unlock. */
  rangeText: string;
  company?: string;
  oneliner?: string;
  logoUrl?: string;
  /** Market and Value, as the page shows them. Never a Range section. */
  resultMd: string;
  vertical?: string;
  answers: RunAnswers;
}

// briefId -> the run. A deploy empties it; the sealed token is the fallback.
const runStore = new Map<string, EstimateRun>();
const RUN_KEEP_MS = 24 * 60 * 60 * 1000;

function keepRun(briefId: string, run: EstimateRun): void {
  runStore.set(briefId, run);
  setTimeout(() => runStore.delete(briefId), RUN_KEEP_MS).unref?.();
}

function findRun(briefId: string, token: unknown): EstimateRun | null {
  return runStore.get(briefId) ?? openRun<EstimateRun>(token, briefId);
}

// ─── The cache ──────────────────────────────────────────────────────────────
// One engine brief per site and language, 30 days, in memory. The engine sees
// only the site, so its brief does not depend on the answers: the same site
// with a new profit band reuses the brief and gets a new range, free. The same
// site with the same answers gets the same brief and the same range, which is
// the cure for "same site, different answer". A deploy empties it.
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
interface CachedBrief {
  /** What streamed to the page, so a cache hit walks the same steps. */
  streamed: string;
  meta: BriefMeta;
  resultMd: string;
  logoUrl?: string;
  /** "(thin read)" and the like, for the Sheet's Path column. */
  readNote: string;
  at: number;
}
const briefCache = new Map<string, CachedBrief>();
const cacheKey = (lang: RunLang, domain: string) => `${lang}|${domain}`;

/** For the tests only. */
export function clearEstimateStateForTests(): void {
  runStore.clear();
  briefCache.clear();
  emailed.clear();
  confirmed.clear();
}

// ─── The Sheet, in order ────────────────────────────────────────────────────
// Each run's writes go one after another: the row first, then the results,
// then his details, then "asked to speak". An update that ran ahead of its row
// would find nothing to fill. Writes never block the owner and never throw.
const sheetChains = new Map<string, Promise<unknown>>();

/** Start a run's row now, not on the next tick, and queue the rest behind it. */
function sheetStart(briefId: string, write: Promise<unknown>): Promise<unknown> {
  const first = write.catch(() => undefined);
  sheetChains.set(briefId, first);
  return first;
}

function sheetThen(briefId: string, step: () => Promise<unknown>): Promise<unknown> {
  const prev = sheetChains.get(briefId) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(step).catch(() => undefined);
  sheetChains.set(briefId, next);
  setTimeout(() => {
    if (sheetChains.get(briefId) === next) sheetChains.delete(briefId);
  }, 60 * 60 * 1000).unref?.();
  return next;
}

/** The answers as Ben reads them: the words on screen, not the codes. */
function answerColumns(a: RunAnswers): Partial<ValuationRow> {
  return {
    timeline: COPY_V.timeToSell[a.timeline],
    seriousness: String(a.serious),
    revenueBand: COPY_V.revenue[a.revenue],
    profitBand: COPY_V.profit[a.profit],
    employees: a.staff ? COPY_V.staff[a.staff] : "",
    note: a.note,
    revenueCheck: revenueCheckFails(a.revenue, a.profit) ? "flag" : "",
  };
}

// ─── Reading the request ────────────────────────────────────────────────────

function oneOf<T extends string>(list: readonly T[], value: unknown): T | "" {
  return typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : "";
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** The answers, or null when one of the five required ones is missing or bad. */
export function readAnswers(body: unknown): (EstimateAnswers & { serious: number }) | null {
  const b = (body ?? {}) as Record<string, unknown>;
  const serious = typeof b.serious === "number" ? b.serious : Number.NaN;
  const answers: EstimateAnswers = {
    url: text(b.url, 300),
    timeline: oneOf(TIMELINE_CODES, b.timeline),
    serious: Number.isFinite(serious) ? serious : null,
    revenue: oneOf(REVENUE_CODES, b.revenue),
    profit: oneOf(PROFIT_CODES, b.profit),
    staff: oneOf(STAFF_CODES, b.staff),
    note: typeof b.note === "string" ? b.note.trim().slice(0, NOTE_MAX) : "",
  };
  if (missingRequired(answers).length) return null;
  return answers as EstimateAnswers & { serious: number };
}

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    return u.hostname.includes(".") ? withScheme : null;
  } catch {
    return null;
  }
}

/** What happens to a run, from the engine's answer and his profit band. */
export function decideVariant(
  meta: Pick<BriefMeta, "vertical_matched">,
  profit: ProfitCode,
): { variant: EstimateRun["variant"]; rangeText: string; path: string; multiple: string } {
  const row = VERTICALS.get(meta.vertical_matched ?? "");
  if (!row) {
    // The engine could not tell what the business does: wild-card, or an id
    // the library does not know. By hand, honestly.
    return { variant: "by_hand", rangeText: "", path: "by_hand (wild card)", multiple: "" };
  }
  const r = estimateRange(row, PROFIT_BAND[profit]);
  const multiple = `${row.floor} to ${row.top}`;
  if (r.outcome === "by_hand") {
    // An industry the library prices on revenue (dental). No profit multiple
    // yet, so by hand until Ben has one (Oct 1).
    return { variant: "by_hand", rangeText: "", path: "by_hand (no profit multiple)", multiple: "" };
  }
  if (r.outcome === "big") return { variant: "big", rangeText: "", path: "big (over ₪10M profit)", multiple };
  return { variant: "number", rangeText: rangeFigureText(r.lowM, r.highM), path: "estimate", multiple };
}

/** Drop anything from a "## Range" heading on. The page never shows one. */
function marketAndValue(resultMd: string): string {
  return resultMd.replace(/\n*##\s+Range[\s\S]*$/, "").trim();
}

/** True when the engine wrote at least one of the two cards. */
function hasCards(resultMd: string): boolean {
  return /^##\s+(Market|Value)\s*$/m.test(resultMd);
}

/**
 * Forward the model's text to the page, but never past a "## Range" heading.
 * The engine is not handed his profit band, so it cannot know his range, and
 * v9 writes no Range section. This is the belt to that brace: a heading split
 * across two chunks is held back until it can be read whole.
 */
function rangeCut(write: (s: string) => void) {
  const MARK = "## Range";
  let all = "";
  let sent = 0;
  let cut = false;
  return {
    push(chunk: string) {
      if (cut) return;
      all += chunk;
      const at = all.indexOf(MARK, Math.max(0, sent - MARK.length));
      if (at !== -1) {
        cut = true;
        if (at > sent) write(all.slice(sent, at));
        sent = at;
        return;
      }
      const safe = all.length - (MARK.length - 1);
      if (safe > sent) {
        write(all.slice(sent, safe));
        sent = safe;
      }
    },
    flush() {
      if (!cut && all.length > sent) write(all.slice(sent));
      sent = all.length;
    },
    /** What the page has been shown, for the cache. */
    shown: () => all.slice(0, cut ? all.indexOf(MARK) : all.length),
  };
}

// ─── POST /api/valuation/estimate ───────────────────────────────────────────
async function handleEstimate(req: Request, res: Response) {
  const lang = readLang((req.body as { lang?: unknown } | undefined)?.lang);
  const parsed = readAnswers(req.body);
  const normalizedUrl = parsed ? normalizeUrl(parsed.url) : null;
  if (!parsed || !normalizedUrl) {
    // The page's own gate stops this. Only a hand-built request gets here, and
    // the page shows "We could not read that site" for an empty error.
    res.status(400).json({});
    return;
  }
  const answers: RunAnswers = {
    timeline: parsed.timeline as TimelineCode,
    serious: parsed.serious,
    revenue: parsed.revenue as RevenueCode,
    profit: parsed.profit as ProfitCode,
    staff: parsed.staff,
    note: parsed.note,
  };
  const domain = domainFromUrl(normalizedUrl) ?? normalizedUrl;
  const briefId = nanoid(12);
  const ip = getClientIp(req);
  const row: ValuationRow = {
    site: domain,
    briefId,
    lang,
    gaveDetails: "no",
    askedToSpeak: "no",
    ...answerColumns(answers),
  };

  const write = (msg: object) => res.write(JSON.stringify(msg) + "\n");
  const startedAt = Date.now();

  // A site we already read. No engine call, no gates, nothing billed. Streams
  // the saved brief in the same shape so the page walks the same steps.
  const hit = briefCache.get(cacheKey(lang, domain));
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    const runs = countDomainRun(domain);
    sheetStart(briefId, appendValuationRow({ ...row, path: "running (cached)", runsOnDomain: String(runs) }));
    res.setHeader("Content-Type", "application/x-ndjson");
    write({ type: "phase", phase: "searching" });
    if (hit.logoUrl) write({ type: "site", logo: hit.logoUrl });
    if (hit.streamed) write({ type: "chunk", data: hit.streamed });
    finishRun({ res, write, briefId, lang, domain, answers, meta: hit.meta, resultMd: hit.resultMd, logoUrl: hit.logoUrl, readNote: `${hit.readNote} (cached)`, startedAt, cost: "0", runs });
    return;
  }

  const refusal = gateRefusal(ip);
  if (refusal) {
    // A cooldown is the same man pressing twice. Over the cap is a real owner
    // we turned away, so his answers still go in the Sheet.
    if (refusal === "overCap") void appendValuationRow({ ...row, path: "refused: over the daily cap" });
    res.status(429).json({ error: serverMessage(refusal, lang) });
    return;
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    void appendValuationRow({ ...row, path: "refused: engine not configured" });
    res.status(500).json({ error: serverMessage("notConfigured", lang) });
    return;
  }

  // Spent the moment it starts. Then the lead is saved, all answers, before
  // the engine runs (35).
  countRun(ip);
  const runs = countDomainRun(domain);
  const saved = sheetStart(briefId, appendValuationRow({ ...row, path: "running", runsOnDomain: String(runs) }));
  res.setHeader("Content-Type", "application/x-ndjson");

  try {
    // The row is written while the site is read, and the engine waits for
    // both, so the lead is in the Sheet before a cent is spent on it.
    const [site] = await Promise.all([readSite(normalizedUrl), saved]);
    const siteRead = site.read;
    if (siteRead?.logoUrl) write({ type: "site", logo: siteRead.logoUrl });

    if (!siteRead && site.noSuchHost) {
      // No such domain. The engine would find nothing either: no call, nothing
      // billed, and the page shows "We could not read that site."
      console.warn(`[estimate] could not read ${normalizedUrl}: ${site.why}`);
      sheetThen(briefId, () => updateValuationRow(briefId, { path: "unreadable", seconds: "0.0", cost: "0" }));
      write({ type: "done", briefId, variant: "unreadable" });
      res.end();
      return;
    }

    let userMessage = (lang === "he" ? `${HEBREW_LINE}\n\n` : "") + `URL: ${normalizedUrl}`;
    if (siteRead) {
      userMessage += `\n\n${siteReadBlock(siteRead)}`;
      console.log(
        `[estimate] read ${siteRead.finalUrl}: ${siteRead.text.length} chars` +
          (siteRead.thin ? " (thin, page head only)" : ""),
      );
    } else {
      console.warn(`[estimate] could not read ${normalizedUrl}: ${site.why}. Engine will search the domain.`);
      userMessage += `\n\n${noSiteBlock(domain)}`;
    }
    const readNote = !siteRead ? " (searched, site did not load)" : siteRead.thin ? " (thin read)" : "";

    const anthropic = new Anthropic({ apiKey });
    const attempts: EngineAttempt[] = [];
    let searching = false;
    const cut = rangeCut((s) => write({ type: "chunk", data: s }));

    let full = await runEngine({
      anthropic,
      model: BRIEF_MODEL,
      lang,
      userMessage,
      attempts,
      onSearching: () => {
        if (searching) return;
        searching = true;
        write({ type: "phase", phase: "searching" });
      },
      onText: (t) => cut.push(t),
    });
    cut.flush();
    let brief = parseMetaAndBody(full);

    // The readable guard (Sep 30): the server knows it read the page, so the
    // engine does not get to call a full page unreadable. One quiet retry.
    if (brief.meta.readable === false && siteRead && !siteRead.thin) {
      console.warn(`[estimate] readable-retry briefId=${briefId}`);
      userMessage +=
        "\n\nSITE TEXT above is the seller's page and it was read. readable is true. " +
        "If the business fits no vertical, use wild-card. Write the JSON, then Market and Value.";
      try {
        full = await runEngine({ anthropic, model: BRIEF_MODEL, lang, userMessage, attempts });
        brief = parseMetaAndBody(full);
      } catch (err) {
        console.error(`[estimate] readable-retry briefId=${briefId} error:`, err);
      }
    }

    // The Hebrew guard, for the Hebrew pass: a Hebrew run that came back in
    // English is run again, then once on the fallback model.
    if (lang === "he") {
      const models = [BRIEF_MODEL, HEBREW_FALLBACK_MODEL];
      for (let n = 0; n < models.length && failsHebrewCheck(brief); n++) {
        console.warn(`[estimate] hebrew-retry n=${n + 1} model=${models[n]} briefId=${briefId}`);
        try {
          full = await runEngine({ anthropic, model: models[n], lang, userMessage, attempts });
          brief = parseMetaAndBody(full);
        } catch (err) {
          console.error(`[estimate] hebrew-retry briefId=${briefId} error:`, err);
        }
      }
      if (failsHebrewCheck(brief)) {
        sheetThen(briefId, () => updateValuationRow(briefId, { path: "failed: Hebrew check", cost: runCostUsd(attempts) }));
        res.end();
        return;
      }
    }

    const meta = brief.meta;
    if (meta.company_name) meta.company_name = meta.company_name.trim().replace(/\.+$/, "").trim();

    // Short and honest (Ben, Oct 2). Each Value point is cut to its label and
    // first sentence. If the cards still break the rules (Market over 40
    // words, a point over 20, a watch that guesses), one quiet retry is told
    // exactly what to fix. The retry's cards are kept only if they are better,
    // and the first run's industry stays, so the price never moves on a retry.
    // Last, Market is cut to whole sentences that fit. Log: "shape-retry".
    let resultMd = tidyBrief(marketAndValue(brief.resultMd));
    let problems = meta.readable === false || !hasCards(resultMd) ? [] : briefProblems(resultMd);
    if (problems.length) {
      console.warn(`[estimate] shape-retry briefId=${briefId}: ${problems.join(" | ")}`);
      try {
        const again = await runEngine({
          anthropic,
          model: BRIEF_MODEL,
          lang,
          userMessage:
            userMessage +
            "\n\nYour first answer broke these rules. Write the JSON and both cards again, fixing them:\n- " +
            problems.join("\n- "),
          attempts,
        });
        const retried = tidyBrief(marketAndValue(parseMetaAndBody(again).resultMd));
        const left = briefProblems(retried);
        if (hasCards(retried) && left.length < problems.length) {
          resultMd = retried;
          problems = left;
        }
      } catch (err) {
        console.error(`[estimate] shape-retry briefId=${briefId} error:`, err);
      }
      if (problems.length) console.warn(`[estimate] shape-retry left briefId=${briefId}: ${problems.join(" | ")}`);
    }
    resultMd = trimMarket(resultMd);
    const cost = runCostUsd(attempts);

    if (meta.readable === false || !hasCards(resultMd)) {
      sheetThen(briefId, () =>
        updateValuationRow(briefId, {
          path: `unreadable${readNote}`,
          seconds: ((Date.now() - startedAt) / 1000).toFixed(1),
          cost,
        }),
      );
      write({ type: "done", briefId, variant: "unreadable" });
      res.end();
      return;
    }

    briefCache.set(cacheKey(lang, domain), {
      streamed: cut.shown(),
      meta,
      resultMd,
      logoUrl: siteRead?.logoUrl,
      readNote,
      at: Date.now(),
    });
    finishRun({ res, write, briefId, lang, domain, answers, meta, resultMd, logoUrl: siteRead?.logoUrl, readNote, startedAt, cost, runs });
  } catch (err) {
    console.error("[estimate] engine error:", err);
    sheetThen(briefId, () => updateValuationRow(briefId, { path: "failed: engine error" }));
    // The engine was busy or failed. The page may already be reading the
    // stream, so the sentence goes as the last line of it; the page shows it
    // the same way it shows a refusal.
    if (res.headersSent) {
      write({ type: "error", error: serverMessage("busy", lang) });
      res.end();
    } else {
      res.status(500).json({ error: serverMessage("busy", lang) });
    }
  }
}

/**
 * The last steps of every run, fresh or cached: price it, keep it, fill the
 * Sheet row, and tell the page. The "done" message carries no range.
 */
function finishRun(o: {
  res: Response;
  write: (msg: object) => void;
  briefId: string;
  lang: RunLang;
  domain: string;
  answers: RunAnswers;
  meta: BriefMeta;
  resultMd: string;
  logoUrl?: string;
  readNote: string;
  startedAt: number;
  cost: string;
  runs: number;
}): void {
  const decided = decideVariant(o.meta, o.answers.profit);
  const run: EstimateRun = {
    lang: o.lang,
    site: o.domain,
    variant: decided.variant,
    rangeText: decided.rangeText,
    company: o.meta.company_name,
    oneliner: o.meta.company_oneliner,
    logoUrl: o.logoUrl,
    resultMd: o.resultMd,
    vertical: o.meta.vertical_matched,
    answers: o.answers,
  };
  keepRun(o.briefId, run);

  sheetThen(o.briefId, () =>
    updateValuationRow(o.briefId, {
      company: run.company ?? "",
      // The range he will see once he leaves details. Ben needs it either way.
      range: run.rangeText,
      vertical: run.vertical ?? "",
      path: decided.path + o.readNote,
      seconds: ((Date.now() - o.startedAt) / 1000).toFixed(1),
      cost: o.cost,
      brief: run.resultMd,
      multiple: decided.multiple,
      runsOnDomain: String(o.runs),
    }),
  );

  // "Working out the value" ends here, on the server's own signal.
  o.write({ type: "phase", phase: "pricing" });
  o.write({
    type: "done",
    briefId: o.briefId,
    variant: run.variant === "number" ? "locked" : run.variant,
    company_name: run.company ?? "",
    company_oneliner: run.oneliner ?? "",
    result_md: run.resultMd,
    logo: run.logoUrl ?? "",
    run_token: sealRun(run, o.briefId),
  });
  o.res.end();
}

// ─── Contact details ────────────────────────────────────────────────────────

interface Contact {
  name: string;
  phone: string;
  email: string;
}

function readContact(body: unknown): Contact {
  const b = (body ?? {}) as Record<string, unknown>;
  return { name: text(b.name, 120), phone: text(b.phone, 40), email: text(b.email, 200) };
}

// One owner email per run, however many times the button is pressed.
const emailed = new Set<string>();

function letterFor(run: EstimateRun): EstimateLetter {
  return {
    companyName: run.company,
    companyOneliner: run.oneliner,
    variant: run.variant,
    rangeText: run.rangeText,
    resultMd: run.resultMd,
    logoUrl: run.logoUrl,
    lang: run.lang,
  };
}

/** The owner's email. Only when he left one, only once per run. */
async function sendOwnerEmail(briefId: string, run: EstimateRun, who: Contact): Promise<void> {
  if (!who.email || emailed.has(briefId)) return;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error(`[estimate] RESEND_API_KEY not set. No email to the owner, briefId=${briefId}`);
    return;
  }
  emailed.add(briefId);
  try {
    const letter = letterFor(run);
    await new Resend(key).emails.send({
      from: sender("Gesher"),
      to: who.email,
      // The reply is the call to action, so it must land where a human reads.
      replyTo: NOTIFY_EMAIL,
      subject: estimateSubject(letter),
      html: buildEstimateEmailHtml(letter, { name: who.name }),
      text: buildEstimateEmailText(letter, { name: who.name }),
    });
    console.log(`[estimate] emailed the owner, briefId=${briefId}`);
  } catch (err) {
    emailed.delete(briefId);
    console.error(`[estimate] owner email failed, briefId=${briefId}:`, err);
  }
}

// One confirmation per run, however many times "Talk to us" is pressed.
const confirmed = new Set<string>();

/**
 * The short note when he presses "Talk to us" (Ben, Oct 2): "We got your
 * request." Only when he left an email, only once per run.
 */
async function sendTalkConfirmation(briefId: string, run: EstimateRun, who: Contact): Promise<void> {
  if (!who.email || confirmed.has(briefId)) return;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error(`[estimate] RESEND_API_KEY not set. No confirmation to the owner, briefId=${briefId}`);
    return;
  }
  confirmed.add(briefId);
  try {
    await new Resend(key).emails.send({
      from: sender("Gesher"),
      to: who.email,
      replyTo: NOTIFY_EMAIL,
      subject: talkConfirmationSubject(run.lang),
      html: buildTalkConfirmationHtml(run.lang),
      text: buildTalkConfirmationText(run.lang),
    });
    console.log(`[estimate] confirmed the talk request, briefId=${briefId}`);
  } catch (err) {
    confirmed.delete(briefId);
    console.error(`[estimate] confirmation failed, briefId=${briefId}:`, err);
  }
}

/**
 * Ben's copy, to office@. Internal, English, every field on one screen. The
 * Sheet is the list; this is the tap on the shoulder.
 */
async function notifyBen(kind: "details" | "talk", briefId: string, run: EstimateRun, who: Contact): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const a = run.answers;
  const rows: [string, string][] = [
    ["Name", who.name],
    ["Phone", who.phone || "(none)"],
    ["Email", who.email || "(none)"],
    ["Company", run.company ?? ""],
    ["Website", run.site],
    ["Range", run.rangeText || (run.variant === "big" ? "No number (over ₪10M profit)" : "No number (by hand)")],
    ["Timeline", COPY_V.timeToSell[a.timeline]],
    ["Seriousness", `${a.serious} of 10`],
    ["Revenue last year", COPY_V.revenue[a.revenue]],
    ["Profit before tax", COPY_V.profit[a.profit]],
    ["Employees", a.staff ? COPY_V.staff[a.staff] : "(not given)"],
    ["Note", a.note || "(none)"],
    ["Revenue check", revenueCheckFails(a.revenue, a.profit) ? "FLAG: profit cannot be that high for that revenue" : "ok"],
    ["Language", run.lang],
    ["Brief ID", briefId],
  ];
  const lead =
    kind === "talk"
      ? "He pressed Talk to us. Hot lead."
      : who.email
        ? "He left his details and saw his range. We emailed him his estimate."
        : "He left his details and saw his range. No email, so call him.";
  const subject =
    kind === "talk"
      ? `Hot lead, asked to speak: ${who.name || "(no name)"} (${run.site})`
      : `New valuation lead: ${who.name} (${run.site})`;
  try {
    await new Resend(key).emails.send({
      from: sender("Gesher Lead"),
      to: NOTIFY_EMAIL,
      ...(who.email ? { replyTo: who.email } : {}),
      subject,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px;">
        <h2 style="color: #16243B; margin: 0 0 8px;">${esc(lead)}</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${rows
            .map(
              ([k, v]) =>
                `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 150px;">${esc(k)}</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(v)}</td></tr>`,
            )
            .join("")}
        </table>
        ${run.resultMd ? `<h3 style="color: #16243B;">What he read</h3><pre style="white-space: pre-wrap; font-family: Georgia, serif; font-size: 14px;">${esc(run.resultMd)}</pre>` : ""}
      </div>`,
    });
  } catch (err) {
    console.error(`[estimate] office@ notice failed, briefId=${briefId}:`, err);
  }
}

// ─── POST /api/valuation/unlock ─────────────────────────────────────────────
async function handleUnlock(req: Request, res: Response) {
  const briefId = text((req.body as { briefId?: unknown })?.briefId, 40);
  const who = readContact(req.body);
  const problem = contactProblem(who.name, who.phone, who.email);
  if (problem) {
    res.status(400).json({ problem });
    return;
  }
  const run = briefId ? findRun(briefId, (req.body as { runToken?: unknown })?.runToken) : null;
  if (!run) {
    res.status(404).json({ error: serverMessage("busy", "en") });
    return;
  }
  if (run.variant !== "number") {
    res.status(409).json({});
    return;
  }
  // His details first, the moment he sends them. Then the range.
  sheetThen(briefId, () =>
    updateValuationRow(briefId, {
      contactName: who.name,
      contactPhone: who.phone,
      contactEmail: who.email,
      gaveDetails: "yes",
    }),
  );
  res.json({ range: run.rangeText });
  void sendOwnerEmail(briefId, run, who);
  void notifyBen("details", briefId, run, who);
}

// ─── POST /api/valuation/talk ───────────────────────────────────────────────
async function handleTalk(req: Request, res: Response) {
  const briefId = text((req.body as { briefId?: unknown })?.briefId, 40);
  const who = readContact(req.body);
  const run = briefId ? findRun(briefId, (req.body as { runToken?: unknown })?.runToken) : null;
  if (!run) {
    res.status(404).json({ error: serverMessage("busy", "en") });
    return;
  }

  if (run.variant === "number") {
    // He already left his details at the popup. They ride along for Ben's
    // email only; the Sheet has them.
    sheetThen(briefId, () => updateValuationRow(briefId, { askedToSpeak: "yes" }));
    res.json({ ok: true });
    void sendTalkConfirmation(briefId, run, who);
    void notifyBen("talk", briefId, run, who);
    return;
  }

  // The two no-number cases: the boxes sit in the card, and "Talk to us" is
  // both his details and the ask.
  const problem = contactProblem(who.name, who.phone, who.email);
  if (problem) {
    res.status(400).json({ problem });
    return;
  }
  sheetThen(briefId, () =>
    updateValuationRow(briefId, {
      contactName: who.name,
      contactPhone: who.phone,
      contactEmail: who.email,
      gaveDetails: "yes",
      askedToSpeak: "yes",
    }),
  );
  res.json({ ok: true });
  // His estimate letter first, then the short confirmation, both only when he
  // left an email. In that order, so the confirmation is the last word.
  void sendOwnerEmail(briefId, run, who).then(() => sendTalkConfirmation(briefId, run, who));
  void notifyBen("talk", briefId, run, who);
}

export function registerEstimateRoutes(app: Express): void {
  app.post("/api/valuation/estimate", handleEstimate);
  app.post("/api/valuation/unlock", handleUnlock);
  app.post("/api/valuation/talk", handleTalk);
}
