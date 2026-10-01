/**
 * The spend guards on a valuation run, shared by both doors: the old Hebrew
 * tool (POST /api/exit-brief) and the valuation estimate (POST
 * /api/valuation/estimate). One set of counters, so "10 a day" is 10 for the
 * whole site, whichever page they came from.
 *
 * Moved here unchanged from routes/exitBrief.ts on Oct 1, 2026.
 */
import type { Request } from "express";
import { createHash } from "node:crypto";

// ─── Spend guards ───────────────────────────────────────────────────────────
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
export const IP_COOLDOWN_MS = 60_000;

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

/**
 * Why this run may not start, or null when it may. Checks only; countRun is
 * what spends one. "overCap" covers both the site-wide cap and this visitor's
 * share of it, because the owner reads the same sentence either way.
 */
export function gateRefusal(ip: string, now: number = Date.now()): "cooldown" | "overCap" | null {
  const last = rateLimitStore.get(ip) ?? 0;
  if (now - last < IP_COOLDOWN_MS) return "cooldown";

  rollDayIfNeeded();

  if (briefsToday >= dailyCap()) {
    console.warn(`[exit-brief] Daily cap of ${dailyCap()} reached for ${usageDay}.`);
    return "overCap";
  }

  if ((briefsTodayByIp.get(ip) ?? 0) >= perIpDailyLimit()) {
    console.warn(`[exit-brief] Per-IP daily limit of ${perIpDailyLimit()} reached.`);
    return "overCap";
  }
  return null;
}

/**
 * Spend one run. Called the moment a run starts, not at the end: a run that
 * starts has already cost money, whether or not it finishes.
 */
export function countRun(ip: string, now: number = Date.now()): void {
  rateLimitStore.set(ip, now);
  briefsToday += 1;
  briefsTodayByIp.set(ip, (briefsTodayByIp.get(ip) ?? 0) + 1);
}

/** For the tests only: a clean day. */
export function resetGatesForTests(): void {
  rateLimitStore.clear();
  briefsTodayByIp.clear();
  briefsToday = 0;
  usageDay = todayKey();
}

// How many times each domain has been run. Three or more is an owner who
// keeps coming back, which Ben wants flagged in the sheet.
const runsByDomain = new Map<string, number>();

/** Count one more run on this domain and return the new total. */
export function countDomainRun(domain: string): number {
  const n = (runsByDomain.get(domain) ?? 0) + 1;
  runsByDomain.set(domain, n);
  return n;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

// Store the IP hashed, abuse only. We never keep the raw IP. Matches the firm's
// "we never share your numbers" promise.
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 64);
}
