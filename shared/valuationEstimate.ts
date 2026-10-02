/**
 * The valuation estimate: what the front door asks, and the rules the page and
 * the server must agree on.
 *
 * Spec: site/35-valuation-lead-magnet.md in the vault (Ben, Oct 1 2026).
 *
 * These are codes, not words. They ride in the request, are checked by the
 * server against the lists below, and never change with the language. The
 * words for each code live in client/src/pages/valuationCopy.ts.
 *
 * Shared on purpose. The gate on the front door, the contact rules on the
 * popup and the inline form, and the revenue check are each written once,
 * here, and both sides call the same function. A rule that lives in two places
 * drifts, and a drift here is a lead the page accepts and the server refuses.
 */

export const TIMELINE_CODES = ["now", "within-1y", "1-2y", "2-5y", "exploring"] as const;
export type TimelineCode = (typeof TIMELINE_CODES)[number];

export const REVENUE_CODES = ["under-5", "5-10", "10-25", "25-50", "over-50"] as const;
export type RevenueCode = (typeof REVENUE_CODES)[number];

export const PROFIT_CODES = ["under-1", "1-2.5", "2.5-5", "5-10", "over-10"] as const;
export type ProfitCode = (typeof PROFIT_CODES)[number];

export const STAFF_CODES = ["2-10", "11-50", "51-100", "over-100"] as const;
export type StaffCode = (typeof STAFF_CODES)[number];

/** The seriousness slider runs 1 to 10. */
export const SERIOUS_MIN = 1;
export const SERIOUS_MAX = 10;

/** The longest note we keep. A sentence or two is the point, not an essay. */
export const NOTE_MAX = 1000;

/**
 * The profit band the range math reads, in NIS millions. "hi: null" is the
 * open top, which gets no number at all (35, round 3).
 *
 * Under ₪1M is priced as a ₪0.5M to ₪1M band (35, "The range math"). A real
 * business under half a million of profit is rare in the sell box, and pricing
 * from zero would put a zero on the screen.
 */
export const PROFIT_BAND: Record<ProfitCode, { lo: number; hi: number | null }> = {
  "under-1": { lo: 0.5, hi: 1 },
  "1-2.5": { lo: 1, hi: 2.5 },
  "2.5-5": { lo: 2.5, hi: 5 },
  "5-10": { lo: 5, hi: 10 },
  "over-10": { lo: 10, hi: null },
};

// The revenue check reads the middle of each band as he picked it. "Under X"
// has its middle at half of X (Under ₪1M is 0.5 here, not the 0.5 to 1 the
// price uses). An open top has no middle, so its bottom edge stands in: the
// smallest it can be, which never flags a pair by guessing high.
const PROFIT_MID: Record<ProfitCode, number> = {
  "under-1": 0.5,
  "1-2.5": 1.75,
  "2.5-5": 3.75,
  "5-10": 7.5,
  "over-10": 10,
};
const REVENUE_MID: Record<RevenueCode, number> = {
  "under-5": 2.5,
  "5-10": 7.5,
  "10-25": 17.5,
  "25-50": 37.5,
  "over-50": 50,
};

/** The profit margin above which the Sheet flags the row (Ben, Oct 2: 30%). */
export const REVENUE_CHECK_MARGIN = 0.3;

/**
 * The revenue check. True flags the row in the Sheet; the owner still sees his
 * range, revenue is a check, not an input.
 *
 * Ben, Oct 2: flag when the middle of his profit band divided by the middle
 * of his revenue band is above 30%. Man Ltd's test (₪2.5M to 5M profit on
 * ₪5M to 10M revenue) is 3.75 / 7.5 = 50%, a flag. The Oct 1 rule (only
 * impossible pairs) let it through as "ok".
 */
export function revenueCheckFails(revenue: RevenueCode, profit: ProfitCode): boolean {
  return PROFIT_MID[profit] / REVENUE_MID[revenue] > REVENUE_CHECK_MARGIN;
}

/** Everything the front door collects. Empty string or null is "not answered". */
export interface EstimateAnswers {
  url: string;
  timeline: TimelineCode | "";
  /** Null until he touches the slider. A default 5 nobody chose is not an answer. */
  serious: number | null;
  revenue: RevenueCode | "";
  profit: ProfitCode | "";
  staff: StaffCode | "";
  note: string;
}

/** The five answers the range cannot be built without (35, locked call 2). */
export const REQUIRED_FIELDS = ["url", "timeline", "serious", "revenue", "profit"] as const;
export type RequiredField = (typeof REQUIRED_FIELDS)[number];

function answered(a: EstimateAnswers, field: RequiredField): boolean {
  switch (field) {
    case "url":
      return a.url.trim().length > 0;
    case "timeline":
      return (TIMELINE_CODES as readonly string[]).includes(a.timeline);
    case "serious":
      return (
        typeof a.serious === "number" &&
        Number.isInteger(a.serious) &&
        a.serious >= SERIOUS_MIN &&
        a.serious <= SERIOUS_MAX
      );
    case "revenue":
      return (REVENUE_CODES as readonly string[]).includes(a.revenue);
    case "profit":
      return (PROFIT_CODES as readonly string[]).includes(a.profit);
  }
}

/** The required answers still missing, in the order they sit on the page. */
export function missingRequired(a: EstimateAnswers): RequiredField[] {
  return REQUIRED_FIELDS.filter((f) => !answered(a, f));
}

/** How many of the five are in. Drives the progress line. */
export function answeredCount(a: EstimateAnswers): number {
  return REQUIRED_FIELDS.length - missingRequired(a).length;
}

/**
 * Loose on purpose: something, an @, something, a dot, two or more characters.
 * It catches "ben@gmail", the real mistake, without turning away an address we
 * have not thought of. The same test as the locked mockup.
 */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/**
 * Which of the four contact messages applies, or null when the details are
 * good. One rule for the popup over the range and the inline form on the two
 * no-number cases. The order is the mockup's: nothing at all, then the name,
 * then a way to reach him, then a broken email. A phone alone is enough, an
 * email alone is enough.
 */
export type ContactProblem = "all" | "name" | "reach" | "phoneBad" | "emailBad";

export function contactProblem(
  name: string,
  phone: string,
  email: string,
): ContactProblem | null {
  const n = name.trim();
  const p = phone.trim();
  const e = email.trim();
  if (!n && !p && !e) return "all";
  if (!n) return "name";
  if (!p && !e) return "reach";
  if (p && !looksLikeIsraeliPhone(p)) return "phoneBad";
  if (e && !looksLikeEmail(e)) return "emailBad";
  return null;
}

/**
 * An Israeli phone number, the way owners write one (Ben, Oct 2). Israeli
 * numbers only: written with the leading 0 they have 9 digits (a landline,
 * 03-1234567) or 10 (a mobile, 050-1234567). It may come with +972 (or 00972
 * or 972) in place of the 0, or with the 0 left off. Spaces, dashes, dots and
 * brackets are fine. The digit after the 0 is 2 to 9: no Israeli number
 * starts 01, so "15678728" is turned away, and so is a foreign number.
 */
export function looksLikeIsraeliPhone(value: string): boolean {
  const s = value.trim().replace(/[\s\-.()]/g, "");
  let national: string;
  const intl = s.match(/^(?:\+|00)?972(\d+)$/);
  if (intl) national = intl[1];
  else if (/^\d+$/.test(s)) national = s;
  else return false;
  const withZero = national.startsWith("0") ? national : `0${national}`;
  return /^0[2-9]\d{7,8}$/.test(withZero);
}

/**
 * What the result screen is.
 *   locked:  a range exists and stays on the server until he leaves details.
 *   by_hand: the engine could not tell what the business does, or its industry
 *            has no profit multiple yet. No number, no lock.
 *   big:     profit over ₪10M. No number, no lock.
 */
export type EstimateVariant = "locked" | "by_hand" | "big";
