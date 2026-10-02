/**
 * The engine pieces both valuation doors share: which model runs, what a run
 * costs, the Hebrew guard, the refusal sentences, and reading the meta block
 * off what the model wrote. Moved here unchanged from routes/exitBrief.ts on
 * Oct 1, 2026, so the valuation estimate (routes/valuationEstimate.ts) and the
 * old Hebrew tool run the same engine. The new runner for the estimate is at
 * the bottom.
 */
import Anthropic from "@anthropic-ai/sdk";
import { COPY_V } from "../../client/src/pages/valuationCopy";
import { EXIT_BRIEF_SYSTEM_PROMPT, HEBREW_ADDENDUM } from "./exitBriefSkill";

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
export const BRIEF_MODEL = process.env.EXIT_BRIEF_MODEL || "claude-haiku-4-5";

// Haiku 4.5 does not take the "adaptive" thinking setting. Sonnet and Opus do,
// and on those models thinking is spent out of max_tokens, so the ceiling has
// to be bigger when it is on. Keyed off the model name so flipping the env var
// above does the right thing by itself.
//
// A function of the model, not a constant, because a Hebrew run can fall back
// to Sonnet for one attempt (see the Hebrew guard below) while the default
// stays Haiku.
export function modelSettings(model: string): { adaptiveThinking: boolean; maxTokens: number } {
  const adaptiveThinking = !model.includes("haiku");
  return { adaptiveThinking, maxTokens: adaptiveThinking ? 16_000 : 8_000 };
}

// ─── The Hebrew guard ───────────────────────────────────────────────────────
// Two real Hebrew runs on Sep 27 got one Hebrew brief and one English brief
// from the same code (site/31). Haiku does not obey the addendum every time.
// Ben's call: keep Haiku and make it obey. Three layers:
//   1. The user message opens with HEBREW_LINE on a Hebrew run.
//   2. If the cards still hold fewer than MIN_HEBREW_LETTERS Hebrew letters,
//      the run is thrown away and run once more on the same model.
//   3. If that fails too, one last run on HEBREW_FALLBACK_MODEL.
// Every retry logs "[exit-brief] hebrew-retry", so Ben can count them in the
// Render log. A run that failed the check is never cached and never emailed.
export const HEBREW_LINE =
  "כתוב את כל הכרטיסים ואת כל שדות הטקסט ב-JSON בעברית. / Write every card and every JSON text field in Hebrew.";
export const MIN_HEBREW_LETTERS = 40;
export const HEBREW_FALLBACK_MODEL = "claude-sonnet-5";

/** How many Hebrew letters a piece of text holds. */
export function hebrewLetterCount(text: string): number {
  return (text.match(/[\u0590-\u05FF]/g) ?? []).length;
}

/**
 * True when a Hebrew run came back in English. Only the cards the model wrote
 * count (Market and Value); the Range card is the server's own. A site the
 * model could not read has no cards, so it is never a failure here.
 */
export function failsHebrewCheck(parsed: { meta: { readable?: boolean }; resultMd: string }): boolean {
  if (parsed.meta.readable === false) return false;
  const cards = parsed.resultMd.replace(/\n*## Range and call[\s\S]*$/, "");
  return hebrewLetterCount(cards) < MIN_HEBREW_LETTERS;
}

// The v7 engine takes a light live look at the seller's site. Six searches cost
// 6 cents before a single token is billed. Four is enough to read a small
// Israeli company and saves 2 cents a Brief, which is real money next to what
// the model itself costs now.
export const MAX_WEB_SEARCHES = 2;

// What a run costs, so the Sheet can show it per Brief instead of Ben guessing
// from the Anthropic console at the end of the month.
//
// Dollars per million tokens, straight off the Anthropic pricing page. If you
// put a model in EXIT_BRIEF_MODEL that is not listed here, the cost column goes
// blank rather than lying. Add the row when you add the model.
export const MODEL_RATES: Record<
  string,
  { input: number; output: number; cacheRead: number; cacheWrite: number }
> = {
  "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
};

// Web search is billed on its own, the same on every model.
export const WEB_SEARCH_COST = 0.01;

export type RunUsage = {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  webSearches: number;
};

// A Hebrew run can take up to three attempts, maybe on two models. Each one is
// billed, so the cost column adds them all up. One unknown model blanks it.
export function runCostUsd(attempts: { model: string; usage: RunUsage }[]): string {
  let dollars = 0;
  for (const { model, usage } of attempts) {
    const one = attemptCostUsd(usage, model);
    if (one === null) return "";
    dollars += one;
  }
  return dollars.toFixed(4);
}

export function attemptCostUsd(u: RunUsage, model: string): number | null {
  const rate = MODEL_RATES[model];
  if (!rate) return null;
  // input_tokens from the API excludes what was read from cache, so the two do
  // not double count. Cache writes are not broken out on this path, so a first
  // run of the day reads a little cheap here. It is a floor, not a guess.
  const dollars =
    (u.inputTokens / 1e6) * rate.input +
    (u.outputTokens / 1e6) * rate.output +
    (u.cachedInputTokens / 1e6) * rate.cacheRead +
    u.webSearches * WEB_SEARCH_COST;
  return dollars;
}

// ─── What the server says when it refuses ───────────────────────────────────
// Four sentences, and the seller reads whichever matches the page he is on.
// They are the only words the server puts on the screen, so they are keyed by
// language and picked from the run's own lang.
//
// English is site/35, by key, from COPY_V.server in valuationCopy.ts. The
// Hebrew side is copied verbatim from site/30-hebrew-valuation-copy-ben-picks.md
// and waits for the Hebrew pass. An empty string would fall back to English,
// which is the right failure: a man reads a sentence he may not want rather
// than a blank screen.
export type RunLang = "en" | "he";

export const SERVER_MESSAGES: Record<
  "cooldown" | "overCap" | "notConfigured" | "busy",
  Record<RunLang, string>
> = {
  // He pressed the button twice inside a minute.
  cooldown: {
    en: COPY_V.server.cooldown,
    he: "כבר הרצת ניתוח בדקה האחרונה. חכה רגע ונסה שוב, או קבע שיחה עם הצוות ונכין את זה יחד ידנית.",
  },
  // The day's budget, or this one visitor's share of it, is gone.
  overCap: {
    en: COPY_V.server.overCap,
    he: "הגענו למכסת הניתוחים החינמיים להיום. קבע שיחה עם הצוות ונכין את זה יחד ידנית.",
  },
  notConfigured: {
    en: COPY_V.server.notConfigured,
    he: "מנוע הניתוח עדיין לא מוגדר. קבע שיחה עם הצוות ונכין את זה יחד ידנית.",
  },
  busy: {
    en: COPY_V.server.busy,
    he: "מנוע הניתוח עמוס כרגע. נסה שוב בעוד דקה, או קבע שיחה עם הצוות ונכין את זה יחד ידנית.",
  },
};

export function serverMessage(
  key: keyof typeof SERVER_MESSAGES,
  lang: RunLang,
): string {
  return SERVER_MESSAGES[key][lang] || SERVER_MESSAGES[key].en;
}

/** Only "he" or "en". Anything else, including nothing, is English. */
export function readLang(raw: unknown): RunLang {
  return raw === "he" ? "he" : "en";
}

// The meta block the model returns first. v2: the model names the company,
// the vertical and three buyer types. It returns no number. The fields the
// page and the sheet read (range_variant, range_text, path_used, the four
// recipe numbers, tier) are filled in here, by the server, after the math.
export interface BriefMeta {
  company_name?: string;
  company_oneliner?: string;
  vertical_matched?: string; // a vertical id, a backup-* id, or wild-card
  buyer_types?: string; // "a, b, or c", three generic types
  readable?: boolean;
  // Filled by the server:
  range_variant?: string; // "number" | "by_hand" | "unreadable"
  range_text?: string;
  path_used?: string; // "T1" | "T2" | "T3" | wild_card | too_big | too_small | by_hand | unreadable
  tier?: number;
  headcount_used?: number;
  headcount_source?: string;
  revenue_per_head?: number;
  margin?: number;
  multiple?: number;
}

/**
 * Walk a JSON object from its opening brace to its matching close.
 *
 * The old code used a non-greedy `\{[\s\S]*?\}`, which stops at the FIRST
 * closing brace. Any nested object in the meta ended that match early, the parse
 * failed, and the whole block stayed in the seller-facing markdown.
 */
export function balancedObject(text: string, from: number): string | null {
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
export function parseMetaAndBody(fullMarkdown: string): { meta: BriefMeta; resultMd: string } {
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
export function stripLeadingRules(s: string): string {
  return s.replace(/^(?:\s*(?:-{3,}|_{3,}|\*{3,})\s*)+/g, "").trim();
}

export function domainFromUrl(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

// ─── One engine run, for the valuation estimate (Oct 1, 2026) ────────────────
// The same call the old route makes inline (routes/exitBrief.ts, runModel),
// lifted into a function so the estimate can use it. Same model settings, same
// cached bundle, same two searches, temperature 0 when thinking is off.
//
// The estimate sends the engine the website and nothing else: no bands, no
// timeline. The bundle already says it does not use them, so the brief depends
// on the site alone and one cached brief per site is the right cache.

export interface EngineAttempt {
  model: string;
  usage: RunUsage;
}

export async function runEngine(opts: {
  anthropic: Anthropic;
  model: string;
  lang: RunLang;
  userMessage: string;
  /** Pushed into this list as soon as the call starts, so a failed attempt is still billed. */
  attempts: EngineAttempt[];
  /** The first web search. Called once per run at most. */
  onSearching?: () => void;
  /** Each piece of text as it arrives. Only the first attempt streams. */
  onText?: (text: string) => void;
}): Promise<string> {
  const { anthropic, model, lang, userMessage, attempts, onSearching, onText } = opts;
  const { adaptiveThinking, maxTokens } = modelSettings(model);
  const usage: RunUsage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, webSearches: 0 };
  attempts.push({ model, usage });
  let text = "";

  const stream = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    ...(adaptiveThinking ? { thinking: { type: "adaptive" as const } } : {}),
    ...(adaptiveThinking ? {} : { temperature: 0 }),
    system: [
      { type: "text", text: EXIT_BRIEF_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ...(lang === "he" && HEBREW_ADDENDUM ? [{ type: "text" as const, text: HEBREW_ADDENDUM }] : []),
    ],
    messages: [{ role: "user", content: userMessage }],
    stream: true,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: MAX_WEB_SEARCHES,
      } as unknown as Anthropic.Tool,
    ],
  });

  for await (const event of stream) {
    if (event.type === "message_start") {
      const u = event.message.usage;
      usage.inputTokens = u.input_tokens ?? 0;
      usage.cachedInputTokens = u.cache_read_input_tokens ?? 0;
    } else if (event.type === "content_block_start") {
      const kind = (event as { content_block?: { type?: string } }).content_block?.type;
      if (kind === "server_tool_use" || kind === "web_search_tool_result") onSearching?.();
    } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      text += event.delta.text;
      onText?.(event.delta.text);
    } else if (event.type === "message_delta") {
      usage.outputTokens = event.usage.output_tokens ?? usage.outputTokens;
      const served = (event.usage as { server_tool_use?: { web_search_requests?: number } })
        .server_tool_use?.web_search_requests;
      if (typeof served === "number") usage.webSearches = served;
    }
  }
  return text;
}
