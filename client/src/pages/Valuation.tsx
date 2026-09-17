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
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Lockup } from "@/components/Lockup";
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
const TIME_TO_SELL = [
  { value: "under-6m", label: "Within 6 months" },
  { value: "6-12m", label: "6 to 12 months" },
  { value: "1-2y", label: "1 to 2 years" },
  { value: "over-2y", label: "Over 2 years" },
  { value: "exploring", label: "Just exploring" },
];

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
// meant it before he presses the button.
function formatAmount(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `NIS ${m % 1 === 0 ? m : m.toFixed(1)}M`;
  }
  if (n >= 1_000) return `NIS ${Math.round(n / 1_000)}K`;
  return `NIS ${n}`;
}

// The line that has to sit under every number this tool produces. It is a read
// off a website and a couple of figures, not a valuation anyone should sign.
const ESTIMATE_DISCLAIMER =
  "This is an estimate, not a valuation. It is built from public information and whatever you tell us here, in a few minutes. A real number needs your financials and a proper look. Nothing here is an offer, or advice to buy or sell.";

// The three real stages of a run. The page advances them off the live stream
// (read -> learn when the web search starts -> write when text arrives), not a timer.
const WORKING_STAGES = [
  { id: "read", label: "Reading your website" },
  { id: "learn", label: "Learning your size and your story" },
  { id: "write", label: "Writing your brief" },
] as const;

const WORKING_TAGLINES = [
  "We work only for you, the seller.",
  "We run a real competitive process, buyers in Israel and abroad.",
  "We tell you the truth, even when the truth is wait a year.",
];

// Working-screen timings.
const REASSURE_AFTER_MS = 18000; // a stage running this long shows the "still on it" line
const TAG_MS = 6500; // tagline rotation cadence
const COMPANY_REVEAL_MS = 2200; // skeleton -> filled company card
const LEARN_FALLBACK_MS = 5000; // move off "Reading" if no search signal arrives
const HARD_TIMEOUT_MS = 180000; // never hang: fall back to the calm screen after 3 min

// The sent screen used to carry two cards selling what a call is like and a
// "Talk to us" button under them. Both went on Sep 17. He had just handed over
// his name, his email and his phone; the button reopened the same form and asked
// again, and the cards pitched a man who had already said yes. His one job on
// this screen is to go and open the email.

// ─── Helpers ─────────────────────────────────────────────────────────────────
// The lead email should read the way the screen read: "Within six months", not
// "under-6m".
function labelForTimeToSell(value?: string): string | undefined {
  if (!value) return undefined;
  return TIME_TO_SELL.find((o) => o.value === value)?.label;
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

function deriveName(url: string): string {
  const domain = deriveDomain(url);
  if (!domain) return "Your business";
  const base = domain.split(".")[0];
  if (!base) return "Your business";
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
  const m = text.match(/^(positive|watch):\s*/i);
  const type = m ? (m[1].toLowerCase() as "positive" | "watch") : null;
  if (m) text = text.slice(m[0].length);
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
// meta fields, not from the markdown, so we only need Market and Value here.
function parseResultMarkdown(md: string): { Market: string[]; Value: string[] } {
  const out: { Market: string[]; Value: string[] } = { Market: [], Value: [] };
  let cur: "Market" | "Value" | null = null;
  for (const raw of (md || "").split("\n")) {
    const line = raw.trim();
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      const name = heading[1].trim();
      cur = name === "Market" || name === "Value" ? name : null;
      continue;
    }
    if (cur && line) out[cur].push(line);
  }
  return out;
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
      {parsed && <p className="v-field-echo">We read that as {formatAmount(parsed)}</p>}
    </div>
  );
}

// ─── Front door ──────────────────────────────────────────────────────────────
function FrontDoorState({ ctx, go }: StateProps) {
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
        <h1 className="v-front-h1">Tell us about your business.</h1>
        <p className="v-front-lede">
          Your website is all we need to start. Your numbers make the range a great
          deal sharper.
        </p>

        <form className="v-front-form" onSubmit={handleSubmit} noValidate>
          <div className="v-field">
            <label htmlFor="v-url" className="v-field-label">
              Your website
            </label>
            <input
              id="v-url"
              type="text"
              className={"v-input" + (touched && urlBad ? " has-error" : "")}
              placeholder="yourcompany.co.il"
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
                We need your website to start.
              </p>
            )}
          </div>

          <div className="v-field">
            <label htmlFor="v-when" className="v-field-label">
              When would you want to sell
            </label>
            <div className="v-select-wrap">
              <select
                id="v-when"
                className="v-select"
                value={timeToSell}
                onChange={(e) => setTimeToSell(e.target.value)}
              >
                <option value="">Select...</option>
                {TIME_TO_SELL.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
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
            label="Approximate annual revenue (NIS)"
            hint="e.g. 12M"
            value={revenue}
            onChange={setRevenue}
          />
          <AmountField
            id="v-profit"
            label="Approximate annual pre-tax profit (NIS)"
            hint="e.g. 1.5M"
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
            100% confidential. We never share your numbers.
          </p>

          <button type="submit" className="v-btn v-btn-primary v-btn-block">
            Get my valuation
          </button>
        </form>

        <p className="v-disclaimer">{ESTIMATE_DISCLAIMER}</p>
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
  const [stageIdx, setStageIdx] = useState(0); // 0 read, 1 learn, 2 write, 3 done
  const [stageStartedAt, setStageStartedAt] = useState(() => Date.now());
  const [tagIdx, setTagIdx] = useState(0);
  const [companyRevealed, setCompanyRevealed] = useState(false);
  const [reassure, setReassure] = useState(false);
  const domain = useMemo(() => deriveDomain(ctx.url), [ctx.url]);
  const name = useMemo(() => deriveName(ctx.url), [ctx.url]);

  // Reset the per-stage timer when the active stage changes (drives the reassurance line).
  useEffect(() => {
    setStageStartedAt(Date.now());
    setReassure(false);
  }, [stageIdx]);

  // Rotating italic tagline.
  useEffect(() => {
    const t = setInterval(
      () => setTagIdx((i) => (i + 1) % WORKING_TAGLINES.length),
      TAG_MS,
    );
    return () => clearInterval(t);
  }, []);

  // Company card: brief skeleton, then the real logo. Seeing their own logo is the proof.
  useEffect(() => {
    const t = setTimeout(() => setCompanyRevealed(true), COMPANY_REVEAL_MS);
    return () => clearTimeout(t);
  }, []);

  // Reassurance line, only when a stage runs long (most often the middle one).
  useEffect(() => {
    if (stageIdx >= WORKING_STAGES.length) return;
    const t = setTimeout(() => setReassure(true), REASSURE_AFTER_MS);
    return () => clearTimeout(t);
  }, [stageStartedAt, stageIdx]);

  // Fallback so the screen always moves off "Reading" even if the search signal is
  // missed. The real signals below override this.
  useEffect(() => {
    const t = setTimeout(() => setStageIdx((s) => (s < 1 ? 1 : s)), LEARN_FALLBACK_MS);
    return () => clearTimeout(t);
  }, []);

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
        const payload: Record<string, string> = { url: ctx.url };
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
                setStageIdx((s) => (s < 1 ? 1 : s)); // -> Learning your size and your story
              } else if (msg.type === "chunk") {
                setStageIdx((s) => (s < 2 ? 2 : s)); // first text -> Writing your brief
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

        setStageIdx(WORKING_STAGES.length); // all done
        go("result", {
          briefId: done.briefId,
          runToken: done.run_token,
          resultMd: md,
          company: {
            name: meta.company_name || deriveName(ctx.url),
            oneliner: meta.company_oneliner,
            domain: deriveDomain(ctx.url),
          },
          rangeVariant: meta.range_variant === "by_hand" ? "by-hand" : "number",
          rangeText: meta.range_text || "",
          buyerTypes: meta.buyer_types || "",
        });
      } catch (err) {
        if (active) go("error", { errorMessage: undefined });
      }
    }

    run();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(hardStop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="v-working">
      <div className="v-working-left">
        <h2 className="v-working-h2">Building your valuation</h2>
        <p className="v-working-sub">
          This takes a minute, sometimes two.
        </p>

        <ol className="v-stages" aria-live="polite" aria-label="Build progress">
          {WORKING_STAGES.map((stage, i) => {
            const status = i < stageIdx ? "done" : i === stageIdx ? "active" : "pending";
            const isLong = stage.id === "learn";
            return (
              <li key={stage.id} className={"v-stage is-" + status + (isLong ? " is-long" : "")}>
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
                  {status === "active" && !isLong && <span className="v-stage-dot"></span>}
                  {status === "active" && isLong && (
                    <span className="v-stage-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </span>
                  )}
                </span>
                <span className="v-stage-label">{stage.label}</span>
              </li>
            );
          })}
        </ol>

        <p
          className={
            "v-reassure" +
            (reassure && stageIdx < WORKING_STAGES.length ? " is-visible" : "")
          }
          aria-live="polite"
        >
          Still on it. A thorough read takes a little longer.
        </p>

        <div className="v-tagline" aria-hidden="true">
          {WORKING_TAGLINES.map((t, i) => (
            <span
              key={i}
              className={"v-tagline-line" + (i === tagIdx ? " is-visible" : "")}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="v-working-right">
        <div className="v-company-card">
          {companyRevealed ? (
            <div className="v-company-content v-fade-in" key="filled">
              <CompanyLogo domain={domain} name={name} className="v-company-logo" />
              <div className="v-company-body">
                <h3 className="v-company-name">{name}</h3>
                <p className="v-company-tagline">Reading your website.</p>
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
    </section>
  );
}

// ─── Result ──────────────────────────────────────────────────────────────────
function ResultState({ ctx, go }: StateProps) {
  const company = ctx.company || { name: deriveName(ctx.url), domain: deriveDomain(ctx.url) };
  const variant = ctx.rangeVariant || "number";
  const sections = useMemo(() => parseResultMarkdown(ctx.resultMd || ""), [ctx.resultMd]);
  const buyerLine = ctx.buyerTypes
    ? `There are real buyers for a business like yours: ${ctx.buyerTypes}`
    : "";

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
            <h1 className="v-result-title">Your {company.name} Valuation Snapshot</h1>
            <p className="v-result-disclaimer">
              Strictly private. Built from public sources. Not an offer or a valuation opinion.
            </p>
          </div>
        </header>

        <div className="v-cards">
          <article className="v-card">
            <h2 className="v-card-h">Market</h2>
            <div className="v-card-body">
              {sections.Market.map((p, i) => (
                <p key={i}>{renderInline(p)}</p>
              ))}
            </div>
          </article>

          <article className="v-card">
            <h2 className="v-card-h">Value</h2>
            <div className="v-card-body">
              {sections.Value.map((p, i) => renderValuePoint(p, i))}
            </div>
          </article>

          <article className="v-card v-card-accent">
            <h2 className="v-card-h">Your range</h2>

            {variant === "number" ? (
              <>
                {ctx.rangeText && <p className="v-range">{ctx.rangeText}</p>}
                <div className="v-card-body">
                  {buyerLine && <p>{buyerLine}</p>}
                  <p className="v-trust">
                    We work only for you, the seller. Most of our fee comes only when you sell.
                  </p>
                </div>
                <div className="v-card-actions">
                  <button
                    type="button"
                    className="v-btn v-btn-primary v-btn-block"
                    onClick={openTalk}
                  >
                    Talk to us
                  </button>
                  <button
                    type="button"
                    className="v-btn v-btn-outline v-btn-block"
                    onClick={() => go("lead-capture")}
                  >
                    Get the one-page brief
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="v-byhand-lead">We price your space by hand.</p>
                <div className="v-card-body">
                  <p>
                    Your business is not a cookie cutter case, so we will not throw out a
                    number we cannot stand behind.
                  </p>
                  {buyerLine && <p>{buyerLine}</p>}
                  <p className="v-trust">
                    We work only for you, the seller. Most of our fee comes only when you sell.
                  </p>
                </div>
                <div className="v-card-actions">
                  <button
                    type="button"
                    className="v-btn v-btn-primary v-btn-block"
                    onClick={openTalk}
                  >
                    Build your number with Ofir and Benjamin
                  </button>
                </div>
              </>
            )}
          </article>

          {/* The number he just read, said plainly for what it is. It sits under
              the range, not buried in a footer, because this is the screen where
              a man decides what to believe. */}
          <p className="v-disclaimer">{ESTIMATE_DISCLAIMER}</p>
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
      ? "Please tell us your name."
      : !email.trim()
        ? "Please add your email. That is where the brief goes."
        : !looksLikeEmail(email)
          ? "That email looks incomplete. Check it and try again."
          : phoneBad
            ? "Please add a phone number."
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
            aria-label="Close"
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
            Get your one-page brief
          </h2>
          <p className="v-modal-sub">It lands in your inbox in a few seconds.</p>

          <form className="v-modal-form" onSubmit={handleSubmit} noValidate>
            <div className="v-field">
              <label htmlFor="lc-name" className="v-field-label">
                Your name
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
                Email
              </label>
              <input
                id="lc-email"
                type="email"
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
                Phone
              </label>
              <input
                id="lc-phone"
                type="tel"
                className={"v-input v-input-sm" + (touched && phoneBad ? " has-error" : "")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                inputMode="tel"
                required
              />
            </div>

            <p className="v-modal-quiet">
              100% confidential. We never share your numbers.
            </p>

            {/* A field he has to fix comes first. Only once the form is clean
                does a failed send get to speak, so the two never argue. */}
            {problem ? (
              <p className="v-modal-error" role="alert">
                {problem}
              </p>
            ) : (
              failed && (
                <p className="v-modal-error" role="alert">
                  We could not send it. Please try again, or write to us at
                  office@gesherpartners.com and we will send it by hand.
                </p>
              )
            )}

            <button
              type="submit"
              className="v-btn v-btn-primary v-btn-block v-modal-submit"
              disabled={submitting}
            >
              {submitting ? "Sending..." : failed ? "Try again" : "Send"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Success ─────────────────────────────────────────────────────────────────
function SuccessState({ ctx }: StateProps) {
  const company = ctx.company?.name?.trim();
  return (
    <section className="v-success">
      <div className="v-success-inner">
        <h1 className="v-success-h1">Thank you. Check your inbox.</h1>
        <p className="v-success-sub">
          Your {company ? `${company} ` : ""}Valuation Snapshot will arrive within a few
          minutes.
        </p>
        {/* The sending domain is new, so some first emails will be filtered.
            Saying so costs nothing and saves the lead. */}
        <p className="v-success-next">
          Not there? Check spam, or write to{" "}
          <a className="v-success-mail" href="mailto:office@gesherpartners.com">
            office@gesherpartners.com
          </a>
          .
        </p>
      </div>
    </section>
  );
}

// ─── Error ───────────────────────────────────────────────────────────────────
function ErrorState({ ctx, go }: StateProps) {
  // Two different dead ends, two different headings. When the server handed
  // back a sentence (the daily cap, the per-minute limit, a busy engine) it is
  // the truth and it goes on screen. Otherwise we could not read the site.
  const serverSaid = ctx.errorMessage;
  return (
    <section className="v-error">
      <div className="v-error-inner">
        <h1 className="v-error-h1">
          {serverSaid ? "Not right now." : "We could not read that site."}
        </h1>
        <p className="v-error-sub">
          {serverSaid ??
            "Sometimes a site is too quiet, or in Hebrew only. That is no problem."}
        </p>
        <div className="v-error-actions">
          <button
            type="button"
            className="v-btn v-btn-primary v-error-btn"
            onClick={openTalk}
          >
            Talk to us instead
          </button>
          <button
            type="button"
            className="v-btn v-btn-outline v-error-btn"
            onClick={() => {
              allowRerun();
              go("front-door", { errorMessage: undefined });
            }}
          >
            Try a different URL
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
      ? "Please tell us your name."
      : !reach.trim()
        ? "Please leave a phone number or an email so we can answer."
        : reachIsEmail && !looksLikeEmail(reach)
          ? "That email looks incomplete. Check it and try again."
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
          sourcePage: "/valuation",
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
        <button type="button" className="v-modal-close" aria-label="Close" onClick={onClose}>
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
              Thank you.
            </h2>
            <p className="v-modal-sub">
              We read every note ourselves. You will hear from Ofir or Ben within two
              business days.
            </p>
            <button
              type="button"
              className="v-btn v-btn-primary v-btn-block v-modal-submit"
              onClick={onClose}
            >
              Close
            </button>
          </>
        ) : (
          <>
            <h2 id="v-talk-title" className="v-modal-title">
              Talk to us.
            </h2>
            <p className="v-modal-sub">
              {ctx.briefId
                ? "We will bring your range to the call."
                : "Tell us where you are. We will tell you honestly if we can help."}
            </p>

            <form className="v-modal-form" onSubmit={handleSubmit} noValidate>
              <div className="v-field">
                <label htmlFor="talk-name" className="v-field-label">
                  Your name
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
                  Phone or email
                </label>
                <input
                  id="talk-reach"
                  type="text"
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
                  What is on your mind (optional)
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
                    Your note did not go through. Please try again, or write to us at
                    office@gesherpartners.com.
                  </p>
                )
              )}

              <button
                type="submit"
                className="v-btn v-btn-primary v-btn-block v-modal-submit"
                disabled={status === "sending"}
              >
                {status === "sending" ? "Sending..." : status === "failed" ? "Try again" : "Send"}
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

export default function Valuation() {
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

  const StateComponent = STATE_COMPONENTS[state] || FrontDoorState;

  return (
    <div className="v-page" data-state={state}>
      <header className="v-topbar">
        <a className="brand" href="/" aria-label="gesher home">
          {/* The same lockup the home page uses, tagline and all. This page
              used to show the mark and wordmark only, so an owner who came
              here off an ad never saw what the firm does. */}
          <Lockup markHeight={24} />
        </a>
        <button type="button" className="talk" onClick={openTalk}>
          Talk to us
        </button>
      </header>

      <main className="v-main" id="main">
        <StateComponent ctx={ctx} go={go} setCtx={setCtx} />
      </main>

      {talkOpen && <TalkModal ctx={ctx} onClose={() => setTalkOpen(false)} />}
    </div>
  );
}
