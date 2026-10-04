/**
 * Keeping the engine's two cards short and honest (Ben, Oct 2, after the live
 * test). The bundle asks for it (v9.1); this checks it, because a small model
 * does not always count.
 *
 *   Market: 40 words at most.
 *   Value: two positives and one watch, each a bold label and one sentence,
 *          20 words at most with the label.
 *   The watch never guesses. eshet.co.il's said its customers "likely
 *   represent a significant share of revenue": a guess about a number nobody
 *   showed us.
 *
 * Words are counted the way a reader sees them: the positive:/watch: tags and
 * the ** marks do not count.
 */

export const MARKET_MAX_WORDS = 40;
export const VALUE_POINT_MAX_WORDS = 20;

/** Words that turn a fact into a guess. Said plainly or not at all. */
const GUESS = /\b(likely|probably|possibly|presumably|perhaps|appears? to|seems? to|suggests?|significant share|large share|big share|most of (?:your|the|its) (?:revenue|sales|business))\b/i;

export function wordCount(text: string): number {
  return text
    .replace(/\*\*/g, " ")
    .replace(/^\s*(?:positive|watch):\s*/i, "")
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** The first sentence, and nothing after it. A trim, never a rewrite. */
function firstSentence(text: string): string {
  const t = text.trim();
  const m = t.match(/^[\s\S]*?[.!?](?=\s|$)/);
  return (m ? m[0] : t).trim();
}

export interface ValuePoint {
  /** "plain" when the engine forgot the tag. Kept, never dropped. */
  kind: "positive" | "watch" | "plain";
  label: string;
  body: string;
}

/** One Value line, in either shape the engine writes, tagged or not. */
export function readValuePoint(line: string): ValuePoint {
  let text = line.trim().replace(/^[-*•]\s+/, "");
  const flag = text.match(/^(\*\*)?\s*(positive|watch):\s*/i);
  const kind = flag ? (flag[2].toLowerCase() as "positive" | "watch") : "plain";
  if (flag) text = (flag[1] || "") + text.slice(flag[0].length);
  const bold = text.match(/^\*\*(.+?)\*\*\s*(.*)$/);
  return bold ? { kind, label: bold[1].trim(), body: bold[2].trim() } : { kind, label: "", body: text.trim() };
}

function writeValuePoint(p: ValuePoint): string {
  const tag = p.kind === "plain" ? "" : `${p.kind}: `;
  return `${tag}${p.label ? `**${p.label}** ` : ""}${p.body}`.trim();
}

interface Cards {
  market: string[];
  value: ValuePoint[];
}

function split(resultMd: string): Cards {
  const out: Cards = { market: [], value: [] };
  let cur: "market" | "value" | null = null;
  for (const raw of resultMd.split("\n")) {
    const line = raw.trim();
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      cur = h[1] === "Market" ? "market" : h[1] === "Value" ? "value" : null;
      continue;
    }
    if (!line || !cur) continue;
    if (cur === "market") out.market.push(line);
    else out.value.push(readValuePoint(line));
  }
  return out;
}

function join(c: Cards): string {
  const parts: string[] = [];
  if (c.market.length) parts.push("## Market", c.market.join("\n"));
  if (c.value.length) parts.push("## Value", c.value.map(writeValuePoint).join("\n"));
  return parts.join("\n\n");
}

/**
 * The cards as the page and the email will show them: each Value point cut
 * to its label and first sentence. Market is left whole here.
 */
export function tidyBrief(resultMd: string): string {
  const c = split(resultMd);
  if (!c.market.length && !c.value.length) return resultMd.trim();
  return join({
    market: c.market,
    value: c.value.map((p) => ({ ...p, body: firstSentence(p.body) })),
  });
}

// ─── Years (Ben, Oct 2) ─────────────────────────────────────────────────────
// Never how long the business has run. The Man Ltd run said "25 years" for a
// company founded in 1995: a count goes stale, and a model that works one out
// gets it wrong. The cards may give the founding year, and only a year the
// site itself shows ("since 1995").

const NUM_WORD =
  "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|" +
  "sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred";
const NUM = `(?:\\d{1,3}|(?:${NUM_WORD})(?:-(?:${NUM_WORD}))?)`;
/** A term, not an age: "5-year contracts", "a 10-year warranty". */
const TERM = "warrant(?:y|ies)|guarantees?|contracts?|leases?|agreements?|plans?|terms?|licen[cs]es?|subscriptions?|loans?";
const YEAR_COUNT_SRC =
  `\\b${NUM}\\+?[-\\s]+(?:years?|yrs?|decades?)\\b(?![-\\s]+(?:${TERM})\\b)` +
  `|\\bdecades\\b` +
  `|\\b(?:a\\s+)?quarter[-\\s]century\\b|\\bhalf[-\\s](?:a[-\\s])?century\\b`;
const YEAR_SRC = "\\b(?:18|19|20)\\d{2}\\b";

/** Each count of years in the text: "25 years", "over three decades". */
export function yearCounts(text: string): string[] {
  return Array.from(text.matchAll(new RegExp(YEAR_COUNT_SRC, "gi")), (m) => m[0]);
}

/** Each year in the text that the site does not show. No site text, no check. */
export function yearsNotOnSite(text: string, siteText?: string): string[] {
  if (!siteText) return [];
  return Array.from(text.matchAll(new RegExp(YEAR_SRC, "g")), (m) => m[0]).filter((y) => !siteText.includes(y));
}

/** Everything the cards say a reader would read, labels included. */
function cardText(c: Cards): string {
  return [...c.market, ...c.value.map((p) => `${p.label} ${p.body}`)].join("\n");
}

/** What breaks the rules, in words the engine can act on. Empty when nothing does. */
export function briefProblems(resultMd: string, opts: { siteText?: string } = {}): string[] {
  const c = split(resultMd);
  const out: string[] = [];
  const marketWords = wordCount(c.market.join(" "));
  if (marketWords > MARKET_MAX_WORDS) {
    out.push(`Market is ${marketWords} words. The limit is ${MARKET_MAX_WORDS}.`);
  }
  const positives = c.value.filter((p) => p.kind === "positive").length;
  const watches = c.value.filter((p) => p.kind === "watch").length;
  if (positives !== 2 || watches !== 1) {
    out.push("Value must be exactly two positive: lines and one watch: line.");
  }
  for (const p of c.value) {
    const n = wordCount(`${p.label} ${p.body}`);
    if (n > VALUE_POINT_MAX_WORDS) {
      out.push(`Value point "${p.label || p.body.slice(0, 30)}" is ${n} words. The limit is ${VALUE_POINT_MAX_WORDS}, label included.`);
    }
    const guess = p.kind === "watch" ? `${p.label} ${p.body}`.match(GUESS) : null;
    if (guess) {
      out.push(
        `The watch point guesses ("${guess[0]}"). Say only what SITE TEXT shows. If it shows no real risk, use a risk common in this industry and start the sentence "Common in this industry:".`,
      );
    }
  }
  const all = cardText(c);
  for (const count of Array.from(new Set(yearCounts(all)))) {
    out.push(
      `The cards say "${count}". Never write how long the business has run. Write the founding year SITE TEXT gives ("since 1995"), or leave it out.`,
    );
  }
  for (const year of Array.from(new Set(yearsNotOnSite(all, opts.siteText)))) {
    out.push(`The cards say ${year}, which SITE TEXT does not show. Write only a year SITE TEXT shows, or leave it out.`);
  }
  return out;
}

// The words around a count or a year that go with it when it is taken out.
const COUNT_LEAD_IN =
  /(?:\b(?:with|for|over|across|after|through|spanning|of)\s+)?(?:\b(?:more than|well over|over|nearly|almost|about|some|around|close to)\s+)?$/i;
const COUNT_TAIL =
  /^(?:\s+(?:of|in)\s+(?:experience|business|operations?|history|service|trading|activity|the (?:industry|field|market|trade|business)))?(?:\s+(?:and|of)\s+(?=\S))?/i;
// Hebrew runs write "מאז 1995", the shape of the Man Ltd model in site/39
// section M, so the Hebrew "since" goes with its year too.
const YEAR_LEAD_IN =
  /(?:\(\s*)?(?:\b(?:operating since|active since|dating back to|founded in|established in|since|from|founded|established|est\.?|in)\s+|(?<=^|\s)מאז\s+)?$/i;
const YEAR_TAIL = /^\s*\)?/;

function tidyText(s: string): string {
  return s
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/,(\s*,)+/g, ",")
    .replace(/,\s*([.!?])/g, "$1")
    .replace(/([.!?])(?:\s*[.!?])+/g, "$1")
    .replace(/(^|[.!?:]\s+)[,;]\s*/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * One count of years, or one year the site does not show, taken out of a
 * line. A clause between commas goes whole ("..., with 25 years of
 * experience, serving ..."). Otherwise the phrase goes with the words that
 * lead into it ("for over 25 years", "since 1990"), and the sentence keeps
 * its capital.
 */
function cutOne(text: string, at: number, len: number, kind: "count" | "year"): string {
  const sStart = Math.max(text.lastIndexOf(". ", at), text.lastIndexOf("! ", at), text.lastIndexOf("? ", at));
  const from = sStart === -1 ? 0 : sStart + 2;
  const endMatch = text.slice(at + len).search(/[.!?](?=\s|$)/);
  const to = endMatch === -1 ? text.length : at + len + endMatch;
  const sentence = text.slice(from, to);
  const segments = sentence.split(/,\s+/);
  if (segments.length > 1) {
    let pos = from;
    for (let i = 0; i < segments.length; i++) {
      const segEnd = pos + segments[i].length;
      if (at >= pos && at < segEnd && i > 0) {
        const commaStart = text.lastIndexOf(",", pos);
        return tidyText(text.slice(0, commaStart) + text.slice(segEnd));
      }
      pos = segEnd + (text.slice(segEnd).match(/^,\s+/)?.[0].length ?? 0);
    }
  }
  const before = text.slice(0, at);
  const after = text.slice(at + len);
  const lead = before.match(kind === "count" ? COUNT_LEAD_IN : YEAR_LEAD_IN)?.[0] ?? "";
  const tail = after.match(kind === "count" ? COUNT_TAIL : YEAR_TAIL)?.[0] ?? "";
  const head = before.slice(0, before.length - lead.length);
  let rest = after.slice(tail.length);
  // The cut started the sentence: its next word takes the capital.
  if (!head.trim() || /[.!?:]\s*$/.test(head)) rest = rest.replace(/^(\s*)([a-z])/, (_, s, ch) => s + ch.toUpperCase());
  return tidyText(head + " " + rest);
}

function scrubLine(text: string, siteText?: string): string {
  let out = text;
  for (let guard = 0; guard < 10; guard++) {
    const count = new RegExp(YEAR_COUNT_SRC, "i").exec(out);
    if (count) {
      out = cutOne(out, count.index, count[0].length, "count");
      continue;
    }
    const off = yearsNotOnSite(out, siteText)[0];
    if (off) {
      const at = out.search(new RegExp(`\\b${off}\\b`));
      out = cutOne(out, at, off.length, "year");
      continue;
    }
    break;
  }
  return out;
}

/**
 * The last word on years, after the retry: any count of years, and any year
 * the site does not show, is taken out of the cards. A Market sentence after
 * the first that is left with under three words goes too.
 */
export function scrubYears(resultMd: string, opts: { siteText?: string } = {}): string {
  const c = split(resultMd);
  if (!yearCounts(cardText(c)).length && !yearsNotOnSite(cardText(c), opts.siteText).length) return resultMd;
  const market = c.market.map((line) => {
    const sentences = scrubLine(line, opts.siteText).match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? [];
    return sentences
      .map((s) => s.trim())
      .filter((s, i) => i === 0 || wordCount(s) >= 3)
      .join(" ");
  });
  const value = c.value.map((p) => ({
    ...p,
    label: scrubLine(p.label, opts.siteText),
    body: scrubLine(p.body, opts.siteText),
  }));
  return join({ market, value });
}

/**
 * The last word on Market's length: whole sentences, kept in order while they
 * fit in 40 words. The first sentence (who he is) always stays.
 */
export function trimMarket(resultMd: string): string {
  const c = split(resultMd);
  const text = c.market.join(" ");
  if (wordCount(text) <= MARKET_MAX_WORDS) return resultMd;
  const sentences = text.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? [text];
  const kept: string[] = [];
  for (const s of sentences) {
    const next = [...kept, s.trim()].join(" ");
    if (kept.length && wordCount(next) > MARKET_MAX_WORDS) break;
    kept.push(s.trim());
  }
  return join({ market: [kept.join(" ")], value: c.value });
}
