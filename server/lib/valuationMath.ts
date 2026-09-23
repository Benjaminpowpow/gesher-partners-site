/**
 * The range, computed on the server. v2 (Sep 23, 2026).
 *
 * Until v2 the model did the arithmetic in its own head and printed the
 * number. Same site, three runs, three different ranges, and once 110M for a
 * business with 1M of profit. So the model no longer touches a number. It
 * reads the site, names the vertical, picks three buyer types. This file does
 * the rest, the same way every time:
 *
 *   Tier 1 (website only):    headcount x revenue per head x margin = EBITDA.
 *                             LOW = EBITDA x band floor x 0.8, rounded down.
 *                             HIGH = 2 x LOW.
 *   Tier 2 (revenue given):   EBITDA = revenue x margin.
 *                             LOW = EBITDA x band floor. HIGH = 1.5 x LOW.
 *   Tier 3 (profit given):    EBITDA = profit.
 *                             LOW = EBITDA x band floor. HIGH = 1.25 x LOW.
 *
 * The band, margin and revenue per head come from Section 4 of the bundle,
 * parsed once at boot, so there is one source of truth: change the bundle,
 * the math follows. The rules are Ben's, in
 * tools/exit-brief/10-generation-rules-v2.md in the vault.
 */
import { EXIT_BRIEF_SYSTEM_PROMPT } from "./exitBriefSkill";

export interface VerticalRow {
  id: string;
  /** EBITDA multiple, floor and top. For healthcare-services it is a revenue multiple. */
  floor: number;
  top: number;
  /** EBITDA over revenue, as a fraction. Undefined when the band is on revenue. */
  margin?: number;
  /** Revenue per employee, in NIS. */
  perHead: number;
  /** The seller-facing buyer types line from the library. */
  buyers: string;
  /**
   * The headcount used when neither the site nor LinkedIn gives one. A guess
   * with a label, which is why Tier 1 is 2x wide. 10 for businesses that move
   * goods (revenue per head is high, so a small team is a real business), 20
   * for businesses that sell people's time.
   */
  defaultHeadcount: number;
}

const GOODS = new Set([
  "industrial-equipment-distribution",
  "fmcg-distribution",
  "medical-distribution",
  "retail",
  "logistics-freight",
  "insurance-brokerage",
  "backup-distributor",
]);

// The backup band rows in the bundle carry a bold label, not an id. The model
// is told to return these ids, so the label maps here.
const BACKUP_IDS: Record<string, string> = {
  Maker: "backup-maker",
  "Distributor / importer": "backup-distributor",
  "Commoditized service": "backup-commoditized-service",
  "Skilled / recurring service": "backup-skilled-service",
  "Software / recurring tech": "backup-software",
  "Route / contract operator": "backup-route-operator",
};

function nis(amount: string, unit: string): number {
  const n = Number(amount);
  return unit.toUpperCase() === "M" ? n * 1_000_000 : n * 1_000;
}

/** Read every vertical and backup row out of Section 4 of the bundle. */
export function parseVerticals(bundle: string = EXIT_BRIEF_SYSTEM_PROMPT): Map<string, VerticalRow> {
  const rows = new Map<string, VerticalRow>();
  const section = bundle.slice(bundle.indexOf("## Section 4"));

  // The 16 digests. Each starts "### id: Title".
  const blocks = section.split(/^### (?=[a-z0-9-]+: )/m).slice(1);
  for (const block of blocks) {
    const id = block.slice(0, block.indexOf(":")).trim();
    const band = block.match(/\*\*Band[^*]*\*\*\s*(\d+(?:\.\d+)?)x to (\d+(?:\.\d+)?)x/);
    const recipe = block.match(/\*\*Recipe:\*\*([^\n]*)/);
    const buyers = block.match(/\*\*Buyers line:\*\*\s*"([^"]+)"/);
    if (!band || !recipe || !buyers) continue;
    const margin = recipe[1].match(/margin (\d+(?:\.\d+)?)%/);
    const perHead = recipe[1].match(/₪(\d+(?:\.\d+)?)(K|M) per head/i);
    if (!perHead) continue;
    rows.set(id, {
      id,
      floor: Number(band[1]),
      top: Number(band[2]),
      margin: margin ? Number(margin[1]) / 100 : undefined,
      perHead: nis(perHead[1], perHead[2]),
      buyers: buyers[1],
      defaultHeadcount: GOODS.has(id) ? 10 : 20,
    });
  }

  // The backup table. One row per business model.
  const table = /^\| \*\*([^*]+)\*\*[^|]*\|[^|]*\| (\d+(?:\.\d+)?)x to (\d+(?:\.\d+)?)x \| (\d+)% \| ₪(\d+(?:\.\d+)?)(K|M) \|/gm;
  const buyersByModel = new Map<string, string>();
  const buyersRe = /^- \*\*([^:*]+):\*\* (.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = buyersRe.exec(section))) {
    if (BACKUP_IDS[m[1].trim()]) buyersByModel.set(BACKUP_IDS[m[1].trim()], m[2].trim().replace(/\.$/, ""));
  }
  while ((m = table.exec(section))) {
    const id = BACKUP_IDS[m[1].trim()];
    if (!id) continue;
    rows.set(id, {
      id,
      floor: Number(m[2]),
      top: Number(m[3]),
      margin: Number(m[4]) / 100,
      perHead: nis(m[5], m[6]),
      buyers: buyersByModel.get(id) ?? "a larger Israeli operator in your space, and funds that buy founder-run businesses your size",
      defaultHeadcount: GOODS.has(id) ? 10 : 20,
    });
  }
  return rows;
}

export const VERTICALS = parseVerticals();

export interface RangeInput {
  row: VerticalRow;
  /** From the site or LinkedIn, or undefined to use the vertical default. */
  headcount?: number;
  headcountSource?: string;
  revenue?: number;
  profit?: number;
}

export interface RangeResult {
  tier: 1 | 2 | 3;
  /** NIS. Zero when gated. */
  low: number;
  high: number;
  /** "number", or the gate that fired. */
  outcome: "number" | "too_small" | "too_big";
  headcountUsed: number;
  headcountSource: string;
  perHead: number;
  margin: number;
  multiple: number;
}

const M = 1_000_000;

function roundTo(value: number, step: number, mode: "down" | "nearest"): number {
  const q = value / step;
  return (mode === "down" ? Math.floor(q) : Math.round(q)) * step;
}

/** The whole recipe, in one place. */
export function computeRange(input: RangeInput): RangeResult {
  const { row } = input;
  const onRevenue = row.margin === undefined;
  let tier: 1 | 2 | 3;
  let low: number;
  let headcountUsed = 0;
  let headcountSource = "";
  let multiple = row.floor;
  let high: number;

  if (input.profit && input.profit > 0) {
    tier = 3;
    // A revenue-anchored vertical (dental) with only a profit: 4x is the
    // owner-earnings read the library gives that vertical.
    if (onRevenue) {
      if (input.revenue && input.revenue > 0) low = input.revenue * row.floor;
      else {
        multiple = 4.0;
        low = input.profit * multiple;
      }
    } else {
      low = input.profit * row.floor;
    }
    low = roundTo(low, 0.5 * M, "nearest");
    high = roundTo(low * 1.25, 0.5 * M, "nearest");
  } else if (input.revenue && input.revenue > 0) {
    tier = 2;
    low = onRevenue ? input.revenue * row.floor : input.revenue * (row.margin as number) * row.floor;
    low = roundTo(low, 1 * M, "nearest");
    high = roundTo(low * 1.5, 1 * M, "nearest");
  } else {
    tier = 1;
    headcountUsed = input.headcount && input.headcount > 0 ? input.headcount : row.defaultHeadcount;
    headcountSource = input.headcount && input.headcount > 0 ? input.headcountSource ?? "found" : "default";
    const revenue = headcountUsed * row.perHead;
    const ebitda = onRevenue ? revenue : revenue * (row.margin as number);
    low = ebitda * row.floor * 0.8;
    low = roundTo(low, low >= 10 * M ? 5 * M : 1 * M, "down");
    high = low * 2;
  }

  let outcome: RangeResult["outcome"] = "number";
  if (low < 1 * M) outcome = "too_small";
  else if (low > 100 * M) outcome = "too_big";

  return {
    tier,
    low: outcome === "number" ? low : 0,
    high: outcome === "number" ? high : 0,
    outcome,
    headcountUsed,
    headcountSource,
    perHead: row.perHead,
    margin: row.margin ?? 0,
    multiple,
  };
}

/** "₪20M", "₪7.5M". */
export function formatMoney(value: number): string {
  const m = value / M;
  return Number.isInteger(m) ? `₪${m}M` : `₪${m.toFixed(1)}M`;
}

export function rangeText(r: RangeResult): string {
  return r.outcome === "number" ? `${formatMoney(r.low)} to ${formatMoney(r.high)}` : "";
}

// Ben's fixed lines, one per tier. The page prints these from its own copy
// table; this copy is for the markdown that reaches the sheet and the email.
export const TIER_LINES: Record<1 | 2 | 3, string> = {
  1: "Based on what buyers pay for businesses like yours. Your revenue and profit are what tighten it.",
  2: "Based on the revenue you shared and what buyers pay for businesses like yours. Your operating profit is what tightens it.",
  3: "Based on the numbers you shared and what buyers pay for businesses like yours. A conversation is what tightens it.",
};

const TRUST = "We work only for the seller. Most of our fee is paid only when you sell.";
const CALL = "**Talk to us.** We'll name the buyers and show what moves the number.";

/** The Range section as markdown, so the sheet and the email carry the same words as the page. */
export function rangeMarkdown(r: RangeResult | null, buyers: string): string {
  const buyerLine = `There are real buyers for a business like yours: ${buyers}.`;
  if (r && r.outcome === "number") {
    return [
      "## Range and call",
      "",
      `# ${rangeText(r)}`,
      "",
      TIER_LINES[r.tier],
      "",
      buyerLine,
      "",
      TRUST,
      "",
      CALL,
      "",
    ].join("\n");
  }
  const lead =
    r?.outcome === "too_big"
      ? "Your business looks bigger than what this tool prices online. We work on businesses your size by hand, with your numbers in front of us."
      : r?.outcome === "too_small"
        ? "At this size a sale usually goes to a person, not a company, and the price depends on you more than on the market. So we won't throw out a number."
        : "Your space is one we price by hand, so we won't throw out a number we can't stand behind.";
  return ["## Range and call", "", lead, "", buyerLine, "", TRUST, "", CALL, ""].join("\n");
}
