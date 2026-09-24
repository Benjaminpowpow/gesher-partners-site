/**
 * /valuation — the Valuation Snapshot page.
 *
 * One page, six states (front door, working, result, lead capture, success, error).
 * Ported from the Claude design (tools/exit-brief/page-design) into the repo's
 * React + TypeScript. The dev-only Tweaks panel and state switcher were dropped.
 *
 * It is wired to the v7 engine:
 *  - Working calls POST /api/exit-brief, reads the stream, and on "done" pulls the
 *    JSON meta (company, range, buyer types) plus result_md.
 *  - Result renders Market + Value from result_md, and builds the Range card from
 *    the meta fields (range_variant, range_text, buyer_types) per 07-page-skill-bridge.
 *  - Lead capture posts to /api/exit-brief/pdf-request with the briefId.
 *
 * LANGUAGE. One component, two copy tables, exactly like Home.tsx. Every word
 * on this page lives in valuationCopy.ts and reaches the screen through
 * VCopyContext. English is at /valuation, Hebrew at /he/valuation, and the
 * route picks which table is handed down. The Hebrew page renders right to
 * left: lang="he" dir="rtl" plus the .v-rtl class on the page root, which
 * valuation.css keys its few visual flips off. Never write a sentence inline
 * in this file again; it makes the Hebrew twin impossible to keep in step.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Lockup } from "@/components/Lockup";
import {
  COPY_V,
  HEBREW_VALUATION_LIVE,
  TIME_TO_SELL_VALUES,
  VALUATION_COPY,
  WORKING_STAGE_IDS,
  otherLangHref,
  type TimeToSellValue,
  type VCopy,
  type VLang,
} from "./valuationCopy";
import "./valuation.css";

// Every "talk to us" on this page opens a small form right here. It used to be
// a link to /#contact, which dropped the owner at the top of the home page with
// no form in sight, because this is a single-page app and the browser had
// nothing to scroll to yet. He had just been shown his range. Sending him away
// to hunt for a form at that exact moment was the worst place on the site to
// lose him. On the home page "talk to us" still scrolls to the form, because
// there the form is already on the page.
//
// The buttons live in five different child components, so the page listens for
// one event rather than threading a setter through all of them.
const TALK_EVENT = "gesher:talk";

function openTalk(): void {
  window.dispatchEvent(new CustomEvent(TALK_EVENT));
}

type ScreenId =
  | "front-door"
  | "working"
  | "result"
  | "lead-capture"
  | "success"
  | "error";

interface Company {
  name: string;
  oneliner?: string;
  domain?: string;
}

interface Ctx {
  url: string;
  /** What he typed, verbatim. parseAmount turns it into a number at send time. */
  revenue: string;
  profit: string;
  /** One of TIME_TO_SELL. The one field here that tells Ben who to call today. */
  timeToSell: string;
  briefId?: string;
  /**
   * The finished run, signed by the server. Held so the brief can still be
   * emailed after a deploy has emptied the server's in-memory store, which is
   * what made a real request fail on Sep 17.
   */
  runToken?: string;
  company?: Company;
  resultMd?: string;
  rangeVariant?: "number" | "by-hand";
  rangeText?: string;
  buyerTypes?: string;
  lead?: { name: string; email: string; phone: string };
  // What the server said when it refused. Set only when the server sent a real
  // sentence, which is how the daily cap reaches the seller. Everything else
  // keeps the page's own "we could not read that site" wording.
  errorMessage?: string;
}

type Patch = Partial<Ctx>;
type Go = (next: ScreenId, patch?: Patch) => void;

interface StateProps {
  ctx: Ctx;
  go: Go;
  setCtx: React.Dispatch<React.SetStateAction<Ctx>>;
}

// ─── Language plumbing ───────────────────────────────────────────────────────
// Same shape as Home.tsx: one context carrying the copy table and the language,
// so no component below has to be handed a prop it does not use.
const VCopyContext = createContext<{ copy: VCopy; lang: VLang }>({
  copy: VALUATION_COPY.en,
  lang: "en",
});
const useVCopy = () => useContext(VCopyContext);

// The language switch, "EN / עב", both always visible, the active one bold
// navy. Real anchors, not client-side routes, so the server sends the right
// per-language head with the new page. Hidden behind HEBREW_VALUATION_LIVE
// until the Hebrew words exist; the routes work either way.
function VLangSwitch() {
  const { copy: C, lang } = useVCopy();
  if (!HEBREW_VALUATION_LIVE) return null;
  const isHe = lang === "he";
  const search = typeof window === "undefined" ? "" : window.location.search;
  const here = isHe ? "/he/valuation" : "/valuation";
  const there = otherLangHref(lang, search);
  return (
    <div className="v-lang-switch" role="group" aria-label={C.nav.langAriaLabel}>
      <a
        href={isHe ? there : here}
        lang="en"
        className={isHe ? undefined : "lang-on"}
        aria-current={isHe ? undefined : "true"}
      >
        {C.nav.langEn}
      </a>
      <span className="lang-sep" aria-hidden="true">
        /
      </span>
      <a
        href={isHe ? here : there}
        lang="he"
        className={isHe ? "lang-on" : undefined}
        aria-current={isHe ? "true" : undefined}
      >
        {C.nav.langHe}
      </a>
    </div>
  );
}

// ─── Intake ──────────────────────────────────────────────────────────────────
// Revenue and profit used to be dropdowns of bands, and the engine was handed
// the midpoint of whichever band he picked. So an owner turning over 21M and one
// turning over 49M both arrived as 35M. Ben killed the bands on Sep 17: he types
// the number now, and the engine gets the number he typed.
//
// Owner salary is gone entirely. It was the third box in a row of three, it is
// the most personal thing on the page, and it was asked before the man had any
// reason to trust us.

// How long until he wants to be out. The one thing on this form that tells Ben
// who to call today, which is what Ofir keeps asking for.
// Digits, not words. A man scanning a dropdown reads "6" faster than "six",
// and these are five options he is meant to pick from at a glance.
//
// The five codes live in valuationCopy.ts (TIME_TO_SELL_VALUES) and the labels
// sit beside them in each language's table.

/**
 * Read a number the way a business owner writes one.
 *
 * "12M", "1.2m", "₪4,500,000", "750000", "2.5 million", "12 מיליון" all have to
 * land on the same number, because this box replaced a dropdown and the whole
 * point of losing the dropdown was that he stops rounding himself into a bucket.
 *
 * Returns undefined when there is no number in there at all, which the caller
 * treats as "he skipped it", not as an error.
 */
function parseAmount(raw: string): number | undefined {
  const text = raw.trim().toLowerCase();
  if (!text) return undefined;

  // Strip currency marks, spaces and thousands separators, keep digits and dot.
  const digits = text.replace(/[^0-9.]/g, "");
  if (!digits || digits === ".") return undefined;
  const n = Number(digits);
  if (!isFinite(n) || n <= 0) return undefined;

  // A trailing unit multiplies. "1.2m" is 1,200,000, not 1.2.
  if (/(m|mm|million|מיליון)\s*$/.test(text)) return Math.round(n * 1_000_000);
  if (/(k|thousand|אלף)\s*$/.test(text)) return Math.round(n * 1_000);

  // No unit. A bare "12" from a man being asked his annual revenue in shekels
  // means twelve million, not twelve shekels. Anything under a thousand is read
  // as millions; everything above it is taken at face value.
  if (n < 1_000) return Math.round(n * 1_000_000);
  return Math.round(n);
}

// What we show back to him under the box, so he can see we read it the way he
// meant it before he presses the button. The prefix is a word, so it comes from
// the copy table; the default is the English one, because the same function
// also builds the "NIS 12M" that rides to Ben's lead email on every run.
function formatAmount(n: number, prefix: string = COPY_V.money.prefix): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${prefix} ${m % 1 === 0 ? m : m.toFixed(1)}M`;
  }
  if (n >= 1_000) return `${prefix} ${Math.round(n / 1_000)}K`;
  return `${prefix} ${n}`;
}

// The five real stages of a run. The page advances them off the live stream, never
// off a timer. It used to sit 27 seconds on one stage called "Writing your brief"
// with a single dot, which is why a 42 second run felt broken. Each stage now ends
// on something the engine actually sent:
//   read   -> the "searching" phase message
//   learn  -> the JSON meta block at the top of the stream closes
//   market -> "## Value" arrives in the text
//   value  -> "## Range and call" arrives in the text
//   range  -> the "done" message
//
// The ids are the signals. The labels live in valuationCopy.ts.
const STAGE_COUNT = WORKING_STAGE_IDS.length;

// Working-screen timings.
const REASSURE_AFTER_MS = 25000; // one stage running this long shows the long-step line
const TAG_MS = 6500; // tagline rotation cadence
const COMPANY_REVEAL_MS = 2200; // skeleton -> filled company card
const LEARN_FALLBACK_MS = 5000; // move off "Reading" if no search signal arrives
const HARD_TIMEOUT_MS = 180000; // never hang: fall back to the calm screen after 3 min

// ─── The ring ────────────────────────────────────────────────────────────────
// The engine never says how far along it is, so the ring is driven by the five
// checkpoints above. Each one is worth a fifth. Between checkpoints it creeps
// toward the next one at the pace of a normal run and stops short of it, so it
// never says a step is finished before the engine does. It never goes backwards.
// A fast run jumps ahead, a slow run waits.

// What a normal run takes per stage, measured on the live site 2026-09-22. This
// is the pace the ring creeps at, not a clock the owner waits out.
const MEDIAN_STAGE_MS = [5000, 10000, 10000, 10000, 7000];
const RING_CREEP = 0.88; // how far into a stage the ring may get on its own
const RING_R = 60; // matches the r on the two circles in the SVG below
const RING_C = 2 * Math.PI * RING_R;
const RING_SNAP_MS = 220; // the run to 100% once the engine says done
const RING_HANDOVER_MS = 600; // then the result page opens

// The sent screen used to carry two cards selling what a call is like and a
// "Talk to us" button under them. Both went on Sep 17. He had just handed over
// his name, his email and his phone; the button reopened the same form and asked
// again, and the cards pitched a man who had already said yes. His one job on
// this screen is to go and open the email.

// ─── Helpers ─────────────────────────────────────────────────────────────────
// The lead email should read the way the screen read: "Within six months", not
// "under-6m".
//
// Always the English label, on both pages. This string goes to the engine, to
// Ben's lead email and into the "Time to sell" column of the Sheet, and that
// column has to sort and read the same whichever door the owner came in by.
function labelForTimeToSell(value?: string): string | undefined {
  if (!value) return undefined;
  return COPY_V.timeToSell[value as TimeToSellValue];
}

// What he typed, tidied for a human to read in an email. Undefined when he
// left the box empty, so the email says "(none)" instead of "NIS NaN".
function amountLabel(raw?: string): string | undefined {
  const n = parseAmount(raw ?? "");
  return n ? formatAmount(n) : undefined;
}

// Whatever the owner typed into the box on the home page.
//
// This used to throw away anything that did not already look like a domain, so
// a man who typed his company's name instead of its address arrived here to an
// empty box and had to start again, with no sign that anything had happened to
// what he wrote. Now it comes through as typed. If it is not a website the run
// will say so, and at least he can see what he put in and fix it.
//
// Still bounded: one line, nothing enormous. React escapes it on the way into
// the field, and the value only ever becomes a URL after normalizeUrl.
function readSiteParam(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = new URLSearchParams(window.location.search).get("site") ?? "";
    const oneLine = raw.replace(/[\r\n\t]+/g, " ").trim();
    if (!oneLine || oneLine.length > 200) return "";
    return oneLine.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  } catch {
    return "";
  }
}

// Deliberately loose. Something before the @, something after it, a dot, and
// something after that. It catches "ben@gmail", which is the real mistake an
// owner makes, without turning away a legitimate address we have not thought of.
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(value.trim());
}

function deriveDomain(url: string): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : "https://" + url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

// The name we show until the engine sends his real one. It comes off the
// address, so it is Latin either way; the fallback when the address gives us
// nothing is a word, so it comes from the copy table.
function deriveName(url: string, fallback: string): string {
  const domain = deriveDomain(url);
  if (!domain) return fallback;
  const base = domain.split(".")[0];
  if (!base) return fallback;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

// Sellers type bare domains ("manltd.co.il"). The engine needs a real address with
// a scheme, so add https:// when it is missing. Without this the run fails outright.
function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : "https://" + trimmed;
}

// Render a safe inline subset of markdown: **bold** becomes <strong>, and a leading
// bullet marker is dropped. No HTML injection: we only build React text and <strong>.
function renderInline(text: string): React.ReactNode {
  const cleaned = text.replace(/^\s*[-*•]\s+/, "");
  return cleaned
    .split("**")
    .map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

// A Value point may begin with a flag the brain emits: "positive:" or "watch:".
// It drives a small arrow icon (navy up = positive, burgundy down = watch) and is
// stripped before display. No flag means no icon (we never guess).
function renderValuePoint(line: string, key: number): React.ReactNode {
  let text = line.replace(/^\s*[-*•]\s+/, "");
  // The flag comes bare ("positive: Scale and age.") or wrapped in the bold the
  // model puts round the opening phrase ("**positive: Scale and age.**"). Only
  // the bare shape used to be handled, so on a run that bolded it the word
  // "positive:" went out to the seller with no arrow. Either way the flag is
  // ours and not his, so it comes out and the bold stays where it was.
  const m = text.match(/^(\*\*)?\s*(positive|watch):\s*/i);
  const type = m ? (m[2].toLowerCase() as "positive" | "watch") : null;
  if (m) text = (m[1] || "") + text.slice(m[0].length);
  return (
    <p key={key} className={"v-point" + (type ? " has-icon v-point-" + type : "")}>
      {type && (
        <span className="v-point-icon" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14">
            {type === "positive" ? (
              <path d="M8 13V3.5M4 7.5L8 3.5l4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M8 3v9.5M4 8.5L8 12.5l4-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </span>
      )}
      <span className="v-point-text">{renderInline(text)}</span>
    </p>
  );
}

// Section keys the page renders out of result_md. The Range card is built from the
// meta fields (the number, the buyer line), plus one thing from the markdown since
// v8: the sentence right under the number, where the engine names what it assumed
// ("It assumes about 20 staff and a 16% margin. Tell us if that is off."). That
// line is the hook for real numbers, and until Sep 22 the page never showed it.
function parseResultMarkdown(md: string): { Market: string[]; Value: string[]; rangeLead: string } {
  const out: { Market: string[]; Value: string[] } = { Market: [], Value: [] };
  const range: string[] = [];
  let cur: "Market" | "Value" | "Range" | null = null;
  for (const raw of (md || "").split("\n")) {
    const line = raw.trim();
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      const name = heading[1].trim();
      cur = name === "Market" || name === "Value" ? name : name.startsWith("Range") ? "Range" : null;
      continue;
    }
    if (!cur || !line) continue;
    if (cur === "Range") range.push(line);
    else out[cur].push(line);
  }
  // The lead is what sits between the "# ₪..." line and the buyer line. The
  // buyer line and the fixed closing sentence are rendered from the meta, so
  // stop at the first of them.
  //
  // These three openers are English, and on a Hebrew run the engine writes
  // that prose in Hebrew, so this test could never find them. That is why
  // server/lib/valuation-hebrew-addendum.md tells the engine to end the Range
  // card at the assumption sentence on a Hebrew run and leave the buyer line
  // and the fee line to the page, which prints them from its own table.
  const lead: string[] = [];
  for (const line of range) {
    if (line.startsWith("#")) continue;
    if (/^(There are real buyers|We work only for you|\*\*Talk to us)/i.test(line)) break;
    lead.push(line);
  }
  return { ...out, rangeLead: lead.join(" ") };
}

// ─── Reading the meta block while it streams ─────────────────────────────────
// The engine writes a fenced ```json block first, then the cards. The server
// splits the same block off at the end (parseMetaAndBody in routes/exitBrief.ts).
// The working screen has to do it live, because two things hang off it: the
// company one-liner in the card, and the point where "Learning your size and
// your story" is finished. Seeing his own business described back to him is the
// proof the tool actually read him.
interface StreamMeta {
  company_name?: string;
  company_oneliner?: string;
}

interface MetaRead {
  meta: StreamMeta;
  /** Where the seller-facing markdown starts, so headings are never hunted inside the JSON. */
  bodyFrom: number;
}

/** Walk an object from its opening brace to its matching close. Null while it is still arriving. */
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

/** Nothing but fences, rules and blank space in front of the meta block. */
function isBlankLead(s: string): boolean {
  return !/[A-Za-z]{3}/.test(s.replace(/json/gi, "").replace(/[-\s`_*]/g, ""));
}

/** Parses, and looks like our meta rather than some other object the model wrote. */
function parseStreamMeta(raw: string): StreamMeta | null {
  try {
    const value: unknown = JSON.parse(raw.trim());
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const meta = value as StreamMeta & { range_variant?: string };
    if (!meta.company_name && !meta.company_oneliner && !meta.range_variant) return null;
    return meta;
  } catch {
    return null;
  }
}

/**
 * Read the meta block out of what has streamed so far.
 *
 * Returns null while the block is still arriving, so the caller can just try
 * again on the next chunk. Two shapes, the same two the server trusts in
 * parseMetaAndBody: a fenced block, and a bare object at the head when the model
 * forgets the fence.
 *
 * The fenced block is taken from wherever it sits, not only from the very top.
 * The prompt says no preamble, and the model writes one anyway while it is
 * searching. This function used to demand a clean run-up and so it never found
 * the block on a real run, while the server, which has no such demand, found it
 * every time. Page and server have to agree on this block or the card says one
 * thing and the result page says another.
 */
function readMetaBlock(text: string): MetaRead | null {
  // The first fence that actually opens an object. A code fence in the model's
  // preamble is skipped, the same way the server's regex skips it.
  const open = text.match(/```(?:json)?\s*(?=\{)/i);
  if (open && typeof open.index === "number") {
    const after = open.index + open[0].length;
    const close = text.indexOf("```", after);
    if (close === -1) return null; // the block has not closed yet
    const meta = parseStreamMeta(text.slice(after, close));
    if (meta) return { meta, bodyFrom: close + 3 };
  }

  const head = text.slice(0, 4000);
  const brace = head.indexOf("{");
  if (brace !== -1 && isBlankLead(head.slice(0, brace))) {
    const obj = balancedObject(text, brace);
    if (!obj) return null;
    const meta = parseStreamMeta(obj);
    if (meta) return { meta, bodyFrom: brace + obj.length };
  }

  return null;
}

function CompanyLogo({
  domain,
  name,
  className,
}: {
  domain?: string;
  name: string;
  className: string;
}) {
  const [errored, setErrored] = useState(false);
  const letter = name.charAt(0).toUpperCase() || "G";
  if (domain && !errored) {
    return (
      <div className={className} aria-hidden="true">
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
          onError={() => setErrored(true)}
        />
      </div>
    );
  }
  return (
    <div className={className} aria-hidden="true">
      {letter}
    </div>
  );
}

// NumberSelect lived here: the "Pick a range" dropdown used by both the front
// door and the lead popup. Both ask for typed numbers now. Removed Sep 17.

// A number the owner types, with what we read it as shown back underneath.
function AmountField({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { copy: C } = useVCopy();
  const parsed = parseAmount(value);
  return (
    <div className="v-field">
      <label htmlFor={id} className="v-field-label">
        {label}
      </label>
      <input
        id={id}
        type="text"
        className="v-input"
        placeholder={hint}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
      />
      {/* He sees us read his number back before he commits to it. "12" coming
          back as NIS 12M is the difference between trust and a support email.
          Only once there is something to read back: the empty version of this
          line printed the same sentence under both boxes, which was noise. */}
      {parsed && (
        <p className="v-field-echo">
          {C.front.echo(formatAmount(parsed, C.money.prefix))}
        </p>
      )}
    </div>
  );
}

// ─── Front door ──────────────────────────────────────────────────────────────
function FrontDoorState({ ctx, go }: StateProps) {
  const { copy: C } = useVCopy();
  const [url, setUrl] = useState(ctx.url || "");
  const [timeToSell, setTimeToSell] = useState(ctx.timeToSell || "");
  const [revenue, setRevenue] = useState(ctx.revenue || "");
  const [profit, setProfit] = useState(ctx.profit || "");
  const [touched, setTouched] = useState(false);

  const urlBad = !url.trim();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    go("working", { url: normalized, timeToSell, revenue, profit });
  }

  return (
    <section className="v-front">
      <div className="v-front-inner">
        <h1 className="v-front-h1">{C.front.headline}</h1>
        <p className="v-front-lede">{C.front.lede}</p>

        <form className="v-front-form" onSubmit={handleSubmit} noValidate>
          <div className="v-field">
            <label htmlFor="v-url" className="v-field-label">
              {C.front.urlLabel}
            </label>
            {/* A web address is Latin whatever the page language is, so the
                box keeps its own direction and the placeholder with it. */}
            <input
              id="v-url"
              type="text"
              dir="ltr"
              className={"v-input" + (touched && urlBad ? " has-error" : "")}
              placeholder={C.front.urlPlaceholder}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoComplete="url"
              inputMode="url"
              spellCheck={false}
              autoCapitalize="off"
              required
            />
            {touched && urlBad && (
              <p className="v-field-error" role="alert">
                {C.front.urlError}
              </p>
            )}
          </div>

          <div className="v-field">
            <label htmlFor="v-when" className="v-field-label">
              {C.front.whenLabel}
            </label>
            <div className="v-select-wrap">
              <select
                id="v-when"
                className="v-select"
                value={timeToSell}
                onChange={(e) => setTimeToSell(e.target.value)}
              >
                <option value="">{C.front.whenPlaceholder}</option>
                {TIME_TO_SELL_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {C.timeToSell[value]}
                  </option>
                ))}
              </select>
              <svg className="v-select-chev" viewBox="0 0 12 12" aria-hidden="true">
                <path
                  d="M2.5 4.5L6 8l3.5-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <AmountField
            id="v-rev"
            label={C.front.revenueLabel}
            hint={C.front.revenueHint}
            value={revenue}
            onChange={setRevenue}
          />
          <AmountField
            id="v-profit"
            label={C.front.profitLabel}
            hint={C.front.profitHint}
            value={profit}
            onChange={setProfit}
          />

          <p className="v-front-confidential">
            <svg viewBox="0 0 16 16" aria-hidden="true" className="v-lock">
              <path
                d="M4.5 7V5a3.5 3.5 0 017 0v2M3.5 7h9v6.5h-9z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {C.front.confidential}
          </p>

          <button type="submit" className="v-btn v-btn-primary v-btn-block">
            {C.front.submit}
          </button>
        </form>

        <p className="v-disclaimer">{C.disclaimer}</p>
      </div>
    </section>
  );
}

// Module-level guard so the paid generate call fires once per URL, even through a
// React StrictMode mount/unmount/remount in dev.
let lastFiredUrl: string | null = null;

// Let the seller try the same URL again after a dead end. Without this the guard
// above blocks the second run and the working screen sits there for three
// minutes. It matters now that a run can be refused by the daily cap: the honest
// move after "try again later" is to let him try again.
function allowRerun(): void {
  lastFiredUrl = null;
}

// ─── Working ─────────────────────────────────────────────────────────────────
function WorkingState({ ctx, go }: StateProps) {
  const { copy: C, lang } = useVCopy();
  // 0 to 4 is the stage being worked on now. 5 means the engine has finished.
  const [stageIdx, setStageIdx] = useState(0);
  const [tagIdx, setTagIdx] = useState(0);
  const [companyRevealed, setCompanyRevealed] = useState(false);
  const [reassure, setReassure] = useState(false);
  const [progress, setProgress] = useState(0);
  const [finishing, setFinishing] = useState(false);
  // What the meta block said, read live the moment it closed.
  const [companyName, setCompanyName] = useState<string | undefined>(undefined);
  const [oneliner, setOneliner] = useState<string | undefined>(undefined);

  const domain = useMemo(() => deriveDomain(ctx.url), [ctx.url]);
  const name = useMemo(
    () => deriveName(ctx.url, C.working.companyFallbackName),
    [ctx.url, C.working.companyFallbackName],
  );

  const runStartedAt = useRef(Date.now());
  const stageRef = useRef(0); // the same number as stageIdx, readable inside the stream loop
  // When the stage on screen now began. A ref, not state, because the ring reads
  // it in the same tick the stage changes, and a state update lands a render
  // later. With state it read the old start time once per checkpoint and threw
  // the ring most of the way into the next segment.
  const stageStartedAt = useRef(Date.now());
  const peakRef = useRef(0); // the ring never goes backwards
  const handoverRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Move the checklist on, once, and leave one line in the console with the
   * milliseconds since the run started. Nothing on the server records how long
   * a real run takes, so those console lines are the only way to time a run
   * checkpoint by checkpoint.
   */
  const advanceTo = useCallback((next: number) => {
    if (next <= stageRef.current) return;
    stageRef.current = next;
    stageStartedAt.current = Date.now();
    const finished = WORKING_STAGE_IDS[next - 1];
    console.log(
      `[valuation] ${finished ?? "done"} ${Date.now() - runStartedAt.current}ms`,
    );
    setStageIdx(next);
  }, []);

  // Rotating italic tagline.
  const taglineCount = C.taglines.length;
  useEffect(() => {
    const t = setInterval(
      () => setTagIdx((i) => (i + 1) % taglineCount),
      TAG_MS,
    );
    return () => clearInterval(t);
  }, [taglineCount]);

  // Company card: brief skeleton, then the real logo. Seeing their own logo is the proof.
  useEffect(() => {
    const t = setTimeout(() => setCompanyRevealed(true), COMPANY_REVEAL_MS);
    return () => clearTimeout(t);
  }, []);

  // The long-step line, only when one stage runs past 25 seconds. The clock
  // restarts every time the stage changes.
  useEffect(() => {
    setReassure(false);
    if (stageIdx >= STAGE_COUNT) return;
    const t = setTimeout(() => setReassure(true), REASSURE_AFTER_MS);
    return () => clearTimeout(t);
  }, [stageIdx]);

  // Fallback so the screen always moves off "Reading" even if the search signal is
  // missed. The real signals below override it. It is the only timer left that
  // moves a stage.
  useEffect(() => {
    const t = setTimeout(() => advanceTo(1), LEARN_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [advanceTo]);

  // The ring creeps toward the next checkpoint while the engine works, and stops
  // 88% of the way there. Landing a checkpoint is what carries it over.
  useEffect(() => {
    if (finishing || stageIdx >= STAGE_COUNT) return;
    function tick() {
      const inStage = Date.now() - stageStartedAt.current;
      const median = MEDIAN_STAGE_MS[stageIdx] || 10000;
      const share = Math.min(RING_CREEP, (inStage / median) * RING_CREEP);
      const next = Math.max(
        (stageIdx + share) / STAGE_COUNT,
        peakRef.current,
      );
      peakRef.current = next;
      setProgress(next);
    }
    tick();
    const t = setInterval(tick, 100);
    return () => clearInterval(t);
  }, [stageIdx, finishing]);

  // The real valuation. Fire once, read the stream, advance stages on real signals,
  // and never hang: a hard stop falls back to the calm screen.
  useEffect(() => {
    if (lastFiredUrl === ctx.url) return; // already running/ran for this URL
    lastFiredUrl = ctx.url;

    const controller = new AbortController();
    let active = true;
    const hardStop = setTimeout(() => {
      if (active) {
        active = false;
        controller.abort();
        go("error", { errorMessage: undefined });
      }
    }, HARD_TIMEOUT_MS);

    async function run() {
      try {
        // His own figures, not the midpoint of a band he was made to pick.
        // The language of the page at the moment he pressed the button is the
        // language of the brief, the email and the row in Ben's Sheet. It
        // travels with the run and is saved on it, so nothing downstream ever
        // has to guess.
        const payload: Record<string, string> = { url: ctx.url, lang };
        const rev = parseAmount(ctx.revenue);
        const prof = parseAmount(ctx.profit);
        if (rev) payload.revenue = String(rev);
        if (prof) payload.pretax_profit = String(prof);
        if (ctx.timeToSell) payload.time_to_sell = labelForTimeToSell(ctx.timeToSell) ?? "";

        const res = await fetch("/api/exit-brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          // The server refuses for two different reasons and the seller should
          // not be told the wrong one. A 429 means we hit a limit, and the
          // server's own sentence points at Ofir. Anything else falls back to
          // the page's "we could not read that site."
          let serverMessage: string | undefined;
          try {
            const body = (await res.json()) as { error?: string };
            if (typeof body.error === "string" && body.error.trim()) {
              serverMessage = body.error.trim();
            }
          } catch {
            // Not JSON. Nothing to show, use the page's own wording.
          }
          if (active) go("error", { errorMessage: serverMessage });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        // Everything the model has written so far, and where its seller-facing
        // markdown starts. Headings are only ever hunted past that point, so a
        // word inside the meta JSON can never move the checklist.
        let streamed = "";
        let bodyFrom = -1;
        let metaFound = false;
        let done: {
          briefId?: string;
          meta?: Record<string, string>;
          result_md?: string;
          run_token?: string;
        } | null =
          null;

        while (true) {
          const { value, done: streamDone } = await reader.read();
          if (streamDone) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const msg = JSON.parse(line);
              if (msg.type === "phase" && msg.phase === "searching") {
                advanceTo(1); // -> Learning your size and your story
              } else if (msg.type === "chunk") {
                streamed += typeof msg.data === "string" ? msg.data : "";

                // Checkpoint 2. The meta block has closed and can be read, so
                // his own business goes into the card.
                //
                // Kept separate from bodyFrom on purpose. The prompt says the
                // block comes first and it does not always come first, so the
                // page goes on looking for it right to the end of the run
                // instead of giving up once the checklist has moved. Late is
                // worth having: the card is the one place he sees that we read
                // his business, not somebody else's.
                if (!metaFound) {
                  const read = readMetaBlock(streamed);
                  if (read) {
                    metaFound = true;
                    setCompanyName(read.meta.company_name?.trim() || undefined);
                    setOneliner(read.meta.company_oneliner?.trim() || undefined);
                    console.log(
                      `[valuation] meta block read ${Date.now() - runStartedAt.current}ms`,
                    );
                    if (bodyFrom === -1) {
                      bodyFrom = read.bodyFrom;
                      advanceTo(2); // -> Reading your market
                    }
                  }
                }

                // Safety net. If the meta block has not turned up by the time
                // the first card heading does, the heading moves the checklist
                // instead. The card keeps saying "Reading your website", which
                // is honest, and the console says this happened.
                if (bodyFrom === -1) {
                  const market = streamed.indexOf("## Market");
                  if (market !== -1) {
                    bodyFrom = market;
                    console.log(
                      `[valuation] no meta block yet, ## Market moved the list ${Date.now() - runStartedAt.current}ms`,
                    );
                    advanceTo(2);
                  }
                }

                // Checkpoints 3 and 4, as each card heading lands.
                if (bodyFrom !== -1 && stageRef.current < 4) {
                  const body = streamed.slice(bodyFrom);
                  if (body.includes("## Range and call")) advanceTo(4);
                  else if (body.includes("## Value")) advanceTo(3);
                }
              } else if (msg.type === "done") {
                done = msg;
              }
            } catch {
              // ignore partial/non-JSON lines
            }
          }
        }

        if (!active) return;
        if (!done || !done.briefId) {
          go("error", { errorMessage: undefined });
          return;
        }

        const meta = done.meta || {};
        const md = done.result_md || "";

        // The brain marks a run it could not read at the exact domain given. Send the
        // seller straight to the error screen, never a brief guessed from a same-name site.
        if (meta.range_variant === "unreadable") {
          go("error", { errorMessage: undefined });
          return;
        }

        // Never draw blank cards. If the engine could not read the site, the meta is
        // empty and the markdown has no Market/Value content. Show the calm fallback.
        const parsed = parseResultMarkdown(md);
        const usable =
          parsed.Market.length > 0 ||
          parsed.Value.length > 0 ||
          Boolean(meta.range_text && meta.range_text.trim()) ||
          meta.range_variant === "by_hand";
        if (!usable) {
          go("error", { errorMessage: undefined });
          return;
        }

        advanceTo(STAGE_COUNT); // the fifth checkpoint, all five landed

        const patch: Patch = {
          briefId: done.briefId,
          runToken: done.run_token,
          resultMd: md,
          company: {
            name:
              meta.company_name ||
              deriveName(ctx.url, C.working.companyFallbackName),
            oneliner: meta.company_oneliner,
            domain: deriveDomain(ctx.url),
          },
          rangeVariant: meta.range_variant === "by_hand" ? "by-hand" : "number",
          rangeText: meta.range_text || "",
          buyerTypes: meta.buyer_types || "",
        };

        // A by-hand result has no number to hand over, so it opens the way it
        // does today, with the ring stopped where it stands. Only a finished run
        // with a range earns the run to 100%. Nothing runs to 100% on a dead end.
        if (patch.rangeVariant === "by-hand") {
          go("result", patch);
          return;
        }

        setFinishing(true);
        peakRef.current = 1;
        setProgress(1);
        handoverRef.current = setTimeout(() => {
          if (active) go("result", patch);
        }, RING_SNAP_MS + RING_HANDOVER_MS);
      } catch (err) {
        if (active) go("error", { errorMessage: undefined });
      }
    }

    run();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(hardStop);
      if (handoverRef.current) clearTimeout(handoverRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = Math.round(progress * 100);
  const shownName = companyName || name;

  return (
    <section className="v-working">
      <div className="v-working-head">
        <h2 className="v-working-h2">{C.working.heading}</h2>
        <p className="v-working-sub">{C.working.sub}</p>
      </div>

      <div className="v-working-left">
        <ol
          className="v-stages"
          aria-live="polite"
          aria-label={C.working.stagesAriaLabel}
        >
          {WORKING_STAGE_IDS.map((stageId, i) => {
            const status = i < stageIdx ? "done" : i === stageIdx ? "active" : "pending";
            return (
              <li key={stageId} className={"v-stage is-" + status}>
                <span className="v-stage-mark" aria-hidden="true">
                  {status === "done" && (
                    <svg viewBox="0 0 18 18" className="v-stage-check">
                      <path
                        d="M4 9.5l3.2 3L14 6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {status === "active" && <span className="v-stage-dot"></span>}
                </span>
                <span className="v-stage-label">{C.stages[stageId]}</span>
              </li>
            );
          })}
        </ol>

        <p
          className={
            "v-reassure" +
            (reassure && stageIdx < STAGE_COUNT ? " is-visible" : "")
          }
          aria-live="polite"
        >
          {C.working.longStep}
        </p>
      </div>

      <div className="v-working-right">
        {/* Fills once, never spins. A wheel says "waiting". This says "working". */}
        <div className="v-ring-wrap">
          <div
            className={"v-ring" + (finishing ? " is-finishing" : "")}
            role="img"
            aria-label={C.working.ringAriaLabel(pct)}
          >
            <svg viewBox="0 0 132 132" aria-hidden="true">
              <circle className="track" cx="66" cy="66" r={RING_R} />
              <circle
                className="fill"
                cx="66"
                cy="66"
                r={RING_R}
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - progress)}
              />
            </svg>
            {/* A percentage stays "42%", never "%42", on a right-to-left page. */}
            <span className="v-ring-num" dir="ltr">
              {pct}%
            </span>
          </div>
        </div>

        <div className="v-company-card">
          {companyRevealed ? (
            <div className="v-company-content v-fade-in" key="filled">
              <CompanyLogo domain={domain} name={shownName} className="v-company-logo" />
              <div className="v-company-body">
                {/* Until the engine sends his real name this is his domain
                    dressed up, so it is Latin and must not flip on the Hebrew
                    page. His own name, when it lands, is left alone. */}
                <h3 className="v-company-name">
                  {companyName ? shownName : <span dir="ltr">{shownName}</span>}
                </h3>
                {/* The key swap replays the fade, so the moment his own business
                    is described back to him is the moment the line changes. */}
                <p
                  className="v-company-tagline v-fade-in"
                  key={oneliner ? "oneliner" : "reading"}
                >
                  {oneliner || C.working.companyReading}
                </p>
              </div>
            </div>
          ) : (
            <div className="v-company-content v-skeleton" key="skeleton" aria-hidden="true">
              <div className="v-skel-logo"></div>
              <div className="v-skel-lines">
                <div className="v-skel-line v-skel-short"></div>
                <div className="v-skel-line v-skel-long"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="v-tagline-slot">
        <div className="v-tagline" aria-hidden="true">
          {C.taglines.map((t, i) => (
            <span
              key={i}
              className={"v-tagline-line" + (i === tagIdx ? " is-visible" : "")}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Result ──────────────────────────────────────────────────────────────────
function ResultState({ ctx, go }: StateProps) {
  const { copy: C } = useVCopy();
  const company = ctx.company || {
    name: deriveName(ctx.url, C.working.companyFallbackName),
    domain: deriveDomain(ctx.url),
  };
  const variant = ctx.rangeVariant || "number";
  const sections = useMemo(() => parseResultMarkdown(ctx.resultMd || ""), [ctx.resultMd]);
  const buyerLine = ctx.buyerTypes ? C.result.buyerLine(ctx.buyerTypes) : "";

  // This used to leave a note in sessionStorage for the home page's contact
  // form, because "talk to us" sent the owner there. It opens a popup on this
  // page now, and that popup sends the run itself, so the note had nowhere left
  // to go. Cut Sep 17 with the rest of the handoff.

  return (
    <section className="v-result">
      <div className="v-result-inner">
        <header className="v-result-header">
          <CompanyLogo domain={company.domain} name={company.name} className="v-result-logo" />
          <div className="v-result-titlewrap">
            <h1 className="v-result-title">{C.result.title(company.name)}</h1>
            <p className="v-result-disclaimer">{C.result.privateLine}</p>
          </div>
        </header>

        <div className="v-cards">
          <article className="v-card">
            <h2 className="v-card-h">{C.result.cardMarket}</h2>
            <div className="v-card-body">
              {sections.Market.map((p, i) => (
                <p key={i}>{renderInline(p)}</p>
              ))}
            </div>
          </article>

          <article className="v-card">
            <h2 className="v-card-h">{C.result.cardValue}</h2>
            <div className="v-card-body">
              {sections.Value.map((p, i) => renderValuePoint(p, i))}
            </div>
          </article>

          <article className="v-card v-card-accent">
            <h2 className="v-card-h">{C.result.cardRange}</h2>

            {variant === "number" ? (
              <>
                {/* "₪3.8M to ₪4.8M" is a figure. It reads the same way round
                    on both pages, inside a card that may be right to left. */}
                {ctx.rangeText && (
                  <p className="v-range">
                    <span dir="ltr">{ctx.rangeText}</span>
                  </p>
                )}
                <div className="v-card-body">
                  {sections.rangeLead && <p>{renderInline(sections.rangeLead)}</p>}
                  {buyerLine && <p>{buyerLine}</p>}
                  <p className="v-trust">{C.result.trust}</p>
                </div>
                <div className="v-card-actions">
                  <button
                    type="button"
                    className="v-btn v-btn-primary v-btn-block"
                    onClick={openTalk}
                  >
                    {C.result.talkBtn}
                  </button>
                  <button
                    type="button"
                    className="v-btn v-btn-outline v-btn-block"
                    onClick={() => go("lead-capture")}
                  >
                    {C.result.briefBtn}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="v-byhand-lead">{C.result.byHandLead}</p>
                <div className="v-card-body">
                  <p>{C.result.byHandBody}</p>
                  {buyerLine && <p>{buyerLine}</p>}
                  <p className="v-trust">{C.result.trust}</p>
                </div>
                <div className="v-card-actions">
                  <button
                    type="button"
                    className="v-btn v-btn-primary v-btn-block"
                    onClick={openTalk}
                  >
                    {C.result.byHandBtn}
                  </button>
                </div>
              </>
            )}
          </article>

          {/* The number he just read, said plainly for what it is. It sits under
              the range, not buried in a footer, because this is the screen where
              a man decides what to believe. */}
          <p className="v-disclaimer">{C.disclaimer}</p>
        </div>
      </div>

      {/* The sticky bar that used to sit here said "Talk to Ofir Ben Haim and
          Benjamin Aronson". It covered the bottom of the range card with a
          second, weaker version of the button already inside it. Cut Sep 17. */}
    </section>
  );
}

// ─── Lead capture (modal over the result) ────────────────────────────────────
function LeadCaptureState({ ctx, go, setCtx }: StateProps) {
  const { copy: C } = useVCopy();
  const [name, setName] = useState(ctx.lead?.name || "");
  const [email, setEmail] = useState(ctx.lead?.email || "");
  const [phone, setPhone] = useState(ctx.lead?.phone || "");
  // This box used to ask for revenue, profit and owner salary a second time.
  // The front door asks for them now, before the range is built, which is the
  // only moment they can change the answer. Asking again here made an owner
  // fill in numbers that were never going to be used. Cut Sep 17.
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>("input, select, button")?.focus();
    }, 50);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") go("result");
    }
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [go]);

  // Say which field is wrong, in his words. Pressing the button with an empty
  // phone box used to do nothing at all, and typing "ben@gmail" got him "we
  // could not send it", which points the blame at us instead of at the typo.
  const nameBad = !name.trim();
  const emailBad = !email.trim() || !looksLikeEmail(email);
  const phoneBad = !phone.trim();
  const valid = !nameBad && !emailBad && !phoneBad;
  const problem = !touched
    ? null
    : nameBad
      ? C.brief.errName
      : !email.trim()
        ? C.brief.errEmailMissing
        : !looksLikeEmail(email)
          ? C.brief.errEmailBad
          : phoneBad
            ? C.brief.errPhone
            : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setFailed(false);
    if (!valid || submitting) return;

    const lead = { name: name.trim(), email: email.trim(), phone: phone.trim() };
    setCtx((c) => ({ ...c, lead }));
    setSubmitting(true);

    try {
      const payload: Record<string, string> = {
        ...lead,
        briefId: ctx.briefId || "",
        // Our own signed copy of the run, handed back in case the server has
        // restarted since it made it.
        runToken: ctx.runToken || "",
      };
      // What he told us at the front door, carried through so Ben opens this
      // email and sees the man, his numbers and his timing in one place.
      const rev = parseAmount(ctx.revenue);
      const prof = parseAmount(ctx.profit);
      if (rev) {
        payload.revenue = String(rev);
        payload.revenueBand = formatAmount(rev);
      }
      if (prof) {
        payload.pretax_profit = String(prof);
        payload.profitBand = formatAmount(prof);
      }
      payload.timeToSell = labelForTimeToSell(ctx.timeToSell) ?? "";
      payload.site = ctx.company?.domain || ctx.url || "";
      payload.companyName = ctx.company?.name ?? "";
      payload.rangeShown = ctx.rangeText ?? "";
      const res = await fetch("/api/exit-brief/pdf-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      // This used to thank him no matter what. It now promises him an email, so
      // it has to wait and find out whether the email actually left. Telling a
      // man his brief is coming when it is not is worse than telling him no.
      if (!res.ok) {
        setFailed(true);
        setSubmitting(false);
        return;
      }
    } catch {
      setFailed(true);
      setSubmitting(false);
      return;
    }
    go("success", { lead });
  }

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) go("result");
  }

  return (
    <>
      <ResultState ctx={ctx} go={() => {}} setCtx={setCtx} />
      <div className="v-modal-backdrop" onMouseDown={handleBackdrop}>
        <div ref={dialogRef} className="v-modal" role="dialog" aria-modal="true" aria-labelledby="v-modal-title">
          <button
            type="button"
            className="v-modal-close"
            aria-label={C.brief.closeAriaLabel}
            onClick={() => go("result")}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M3.5 3.5l9 9M12.5 3.5l-9 9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <h2 id="v-modal-title" className="v-modal-title">
            {C.brief.title}
          </h2>
          <p className="v-modal-sub">{C.brief.sub}</p>

          <form className="v-modal-form" onSubmit={handleSubmit} noValidate>
            <div className="v-field">
              <label htmlFor="lc-name" className="v-field-label">
                {C.brief.nameLabel}
              </label>
              <input
                id="lc-name"
                type="text"
                className={"v-input v-input-sm" + (touched && nameBad ? " has-error" : "")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>

            <div className="v-field">
              <label htmlFor="lc-email" className="v-field-label">
                {C.brief.emailLabel}
              </label>
              {/* An address is Latin, and a phone number reads left to right
                  even in Hebrew. Both boxes keep their own direction. */}
              <input
                id="lc-email"
                type="email"
                dir="ltr"
                className={"v-input v-input-sm" + (touched && emailBad ? " has-error" : "")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                autoCapitalize="off"
                required
              />
            </div>

            <div className="v-field">
              <label htmlFor="lc-phone" className="v-field-label">
                {C.brief.phoneLabel}
              </label>
              <input
                id="lc-phone"
                type="tel"
                dir="ltr"
                className={"v-input v-input-sm" + (touched && phoneBad ? " has-error" : "")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                inputMode="tel"
                required
              />
            </div>

            <p className="v-modal-quiet">{C.brief.quiet}</p>

            {/* A field he has to fix comes first. Only once the form is clean
                does a failed send get to speak, so the two never argue. */}
            {problem ? (
              <p className="v-modal-error" role="alert">
                {problem}
              </p>
            ) : (
              failed && (
                <p className="v-modal-error" role="alert">
                  {C.brief.sendFailed}
                </p>
              )
            )}

            <button
              type="submit"
              className="v-btn v-btn-primary v-btn-block v-modal-submit"
              disabled={submitting}
            >
              {submitting ? C.brief.sending : failed ? C.brief.retry : C.brief.submit}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Success ─────────────────────────────────────────────────────────────────
function SuccessState({ ctx }: StateProps) {
  const { copy: C } = useVCopy();
  const company = ctx.company?.name?.trim();
  return (
    <section className="v-success">
      <div className="v-success-inner">
        <h1 className="v-success-h1">{C.success.heading}</h1>
        <p className="v-success-sub">
          {company ? C.success.subWithCompany(company) : C.success.subPlain}
        </p>
        {/* The sending domain is new, so some first emails will be filtered.
            Saying so costs nothing and saves the lead. */}
        <p className="v-success-next">
          {C.success.notThere}
          <a className="v-success-mail" href={`mailto:${C.success.mail}`} dir="ltr">
            {C.success.mail}
          </a>
          {C.success.notThereEnd}
        </p>
      </div>
    </section>
  );
}

// ─── Error ───────────────────────────────────────────────────────────────────
function ErrorState({ ctx, go }: StateProps) {
  const { copy: C } = useVCopy();
  // Two different dead ends, two different headings. When the server handed
  // back a sentence (the daily cap, the per-minute limit, a busy engine) it is
  // the truth and it goes on screen. The server picks that sentence by the
  // language the run was started in. Otherwise we could not read the site.
  const serverSaid = ctx.errorMessage;
  return (
    <section className="v-error">
      <div className="v-error-inner">
        <h1 className="v-error-h1">
          {serverSaid ? C.error.headingBlocked : C.error.headingUnreadable}
        </h1>
        <p className="v-error-sub">{serverSaid ?? C.error.subUnreadable}</p>
        <div className="v-error-actions">
          <button
            type="button"
            className="v-btn v-btn-primary v-error-btn"
            onClick={openTalk}
          >
            {C.error.talkBtn}
          </button>
          <button
            type="button"
            className="v-btn v-btn-outline v-error-btn"
            onClick={() => {
              allowRerun();
              go("front-door", { errorMessage: undefined });
            }}
          >
            {C.error.retryBtn}
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Talk to us (popup, any state) ───────────────────────────────────────────
// The short form behind every "talk to us" on this page. Three boxes and a
// message, because a man who has just read his range wants to say one thing and
// be done. When he ran a valuation, it rides along with the lead, so the note
// that reaches office@ says who he is and what he was quoted.
function TalkModal({ ctx, onClose }: { ctx: Ctx; onClose: () => void }) {
  const { copy: C, lang } = useVCopy();
  const [name, setName] = useState(ctx.lead?.name || "");
  const [reach, setReach] = useState(ctx.lead?.email || ctx.lead?.phone || "");
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>("input, textarea, button")?.focus();
    }, 50);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const nameBad = !name.trim();
  // One box takes a phone or an email, same as the home page. It only has to be
  // something we can answer on.
  const reachIsEmail = reach.includes("@");
  const reachBad = !reach.trim() || (reachIsEmail && !looksLikeEmail(reach));
  const problem = !touched
    ? null
    : nameBad
      ? C.talk.errName
      : !reach.trim()
        ? C.talk.errReachMissing
        : reachIsEmail && !looksLikeEmail(reach)
          ? C.talk.errEmailBad
          : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (nameBad || reachBad || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: reachIsEmail ? reach.trim() : undefined,
          phone: reachIsEmail ? undefined : reach.trim(),
          message: message.trim() || "(no message)",
          // Which door he came in by. The Sheet's "Source page" column is how
          // Ben tells a Hebrew visitor from an English one.
          sourcePage: lang === "he" ? "/he/valuation" : "/valuation",
          ...(ctx.briefId
            ? {
                valuation: {
                  briefId: ctx.briefId,
                  site: ctx.company?.domain || ctx.url,
                  company: ctx.company?.name,
                  range: ctx.rangeText,
                  revenue: amountLabel(ctx.revenue),
                  profit: amountLabel(ctx.profit),
                  timeToSell: labelForTimeToSell(ctx.timeToSell),
                },
              }
            : {}),
        }),
      });
      setStatus(res.ok ? "sent" : "failed");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div
      className="v-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="v-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="v-talk-title"
      >
        <button
          type="button"
          className="v-modal-close"
          aria-label={C.talk.closeAriaLabel}
          onClick={onClose}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M3.5 3.5l9 9M12.5 3.5l-9 9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {status === "sent" ? (
          <>
            <h2 id="v-talk-title" className="v-modal-title">
              {C.talk.sentTitle}
            </h2>
            <p className="v-modal-sub">{C.talk.sentBody}</p>
            <button
              type="button"
              className="v-btn v-btn-primary v-btn-block v-modal-submit"
              onClick={onClose}
            >
              {C.talk.closeBtn}
            </button>
          </>
        ) : (
          <>
            <h2 id="v-talk-title" className="v-modal-title">
              {C.talk.title}
            </h2>
            <p className="v-modal-sub">
              {ctx.briefId ? C.talk.subWithRun : C.talk.subNoRun}
            </p>

            <form className="v-modal-form" onSubmit={handleSubmit} noValidate>
              <div className="v-field">
                <label htmlFor="talk-name" className="v-field-label">
                  {C.talk.nameLabel}
                </label>
                <input
                  id="talk-name"
                  type="text"
                  className={"v-input v-input-sm" + (touched && nameBad ? " has-error" : "")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="v-field">
                <label htmlFor="talk-reach" className="v-field-label">
                  {C.talk.reachLabel}
                </label>
                {/* A phone number or an address, either way Latin. */}
                <input
                  id="talk-reach"
                  type="text"
                  dir="ltr"
                  className={"v-input v-input-sm" + (touched && reachBad ? " has-error" : "")}
                  value={reach}
                  onChange={(e) => setReach(e.target.value)}
                  spellCheck={false}
                  autoCapitalize="off"
                  required
                />
              </div>

              <div className="v-field">
                <label htmlFor="talk-message" className="v-field-label">
                  {C.talk.messageLabel}
                </label>
                <textarea
                  id="talk-message"
                  className="v-input v-input-sm"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              {problem ? (
                <p className="v-modal-error" role="alert">
                  {problem}
                </p>
              ) : (
                status === "failed" && (
                  <p className="v-modal-error" role="alert">
                    {C.talk.sendFailed}
                  </p>
                )
              )}

              <button
                type="submit"
                className="v-btn v-btn-primary v-btn-block v-modal-submit"
                disabled={status === "sending"}
              >
                {status === "sending"
                  ? C.talk.sending
                  : status === "failed"
                    ? C.talk.retry
                    : C.talk.submit}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const STATE_COMPONENTS: Record<ScreenId, (props: StateProps) => React.ReactElement> = {
  "front-door": FrontDoorState,
  working: WorkingState,
  result: ResultState,
  "lead-capture": LeadCaptureState,
  success: SuccessState,
  error: ErrorState,
};

export default function Valuation({ lang = "en" }: { lang?: VLang }) {
  const copy = VALUATION_COPY[lang];
  const dir = lang === "he" ? "rtl" : "ltr";
  const [state, setState] = useState<ScreenId>("front-door");
  const [talkOpen, setTalkOpen] = useState(false);
  const [ctx, setCtx] = useState<Ctx>({
    // The home page hero asks for the website and sends it here in ?site=, so
    // the box on this page is already filled when he arrives and he does not
    // have to type it twice. Read once, on mount.
    url: readSiteParam(),
    revenue: "",
    profit: "",
    timeToSell: "",
  });

  const go: Go = (next, patch) => {
    if (patch) setCtx((c) => ({ ...c, ...patch }));
    setState(next);
  };

  // Every "talk to us" button on this page, wherever it sits, lands here.
  useEffect(() => {
    function onTalk() {
      setTalkOpen(true);
    }
    window.addEventListener(TALK_EVENT, onTalk);
    return () => window.removeEventListener(TALK_EVENT, onTalk);
  }, []);

  // The server sets <html lang dir> on first load (server/_core/vite.ts).
  // This keeps it right after a client-side hop, and puts it back to English
  // on the way out, the same way Home.tsx does.
  useEffect(() => {
    const el = document.documentElement;
    el.lang = lang;
    el.setAttribute("dir", dir);
    return () => {
      el.lang = "en";
      el.setAttribute("dir", "ltr");
    };
  }, [lang, dir]);

  const StateComponent = STATE_COMPONENTS[state] || FrontDoorState;

  return (
    <VCopyContext.Provider value={{ copy, lang }}>
      <div
        className={lang === "he" ? "v-page v-rtl" : "v-page"}
        data-state={state}
        lang={lang}
        dir={dir}
      >
        <header className="v-topbar">
          <a className="brand" href={lang === "he" ? "/he/" : "/"} aria-label={copy.nav.homeAriaLabel}>
            {/* The same lockup the home page uses, tagline and all. This page
                used to show the mark and wordmark only, so an owner who came
                here off an ad never saw what the firm does. */}
            <Lockup markHeight={24} />
          </a>
          <div className="v-topbar-right">
            <VLangSwitch />
            <button type="button" className="talk" onClick={openTalk}>
              {copy.nav.talkToUs}
            </button>
          </div>
        </header>

        <main className="v-main" id="main">
          <StateComponent ctx={ctx} go={go} setCtx={setCtx} />
        </main>

        {talkOpen && <TalkModal ctx={ctx} onClose={() => setTalkOpen(false)} />}
      </div>
    </VCopyContext.Provider>
  );
}
