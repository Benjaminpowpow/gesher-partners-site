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

/** What breaks the rules, in words the engine can act on. Empty when nothing does. */
export function briefProblems(resultMd: string): string[] {
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
  return out;
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
