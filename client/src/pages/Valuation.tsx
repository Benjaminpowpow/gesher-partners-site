/**
 * /valuation: the valuation estimate, a lead magnet.
 *
 * Spec: site/35-valuation-lead-magnet.md. Look: site/36-valuation-estimate-
 * mock.html, locked by Ben on Oct 1 2026 and ported here as it is.
 *
 * Four screens. The front door asks seven questions, five of them required,
 * behind a quiet gate. The working screen follows the engine's real signals.
 * The result shows his company, the Market card in clear, and the Value card
 * and the range blurred under a popup; his name and a phone or an email open
 * the range. Two cases have no number (the engine cannot tell what the
 * business does, or profit is over ₪10M): no lock, and the contact boxes sit
 * in the card. The error screen catches the rest.
 *
 * THE LOCK IS ON THE SERVER. This page never holds the range until
 * /api/valuation/unlock sends it, after his details are saved. The figure
 * under the blur is a placeholder. See server/routes/valuationEstimate.ts.
 *
 * WORDS. Every word on this page comes from valuationCopy.ts through the
 * context below. Never write a sentence inline in this file. Hebrew is a copy
 * swap: the layout is logical, figures sit in <bdi>, the slider follows dir.
 * Until the Hebrew pass, /he/valuation runs the old tool (ValuationLegacy.tsx).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Lockup } from "@/components/Lockup";
import {
  HEBREW_VALUATION_LIVE,
  VALUATION_COPY,
  VALUATION_PATH,
  WORKING_STAGE_IDS,
  type VCopy,
  type VLang,
} from "./valuationCopy";
import {
  NOTE_MAX,
  PROFIT_CODES,
  REQUIRED_FIELDS,
  REVENUE_CODES,
  SERIOUS_MAX,
  SERIOUS_MIN,
  STAFF_CODES,
  TIMELINE_CODES,
  answeredCount,
  contactProblem,
  looksLikeEmail,
  looksLikeIsraeliPhone,
  missingRequired,
  type ContactProblem,
  type EstimateAnswers,
  type EstimateVariant,
  type RequiredField,
} from "@shared/valuationEstimate";
import { trackContactSubmit, trackTalkClick, trackValuationDone, trackValuationStart } from "@/lib/analytics";
import "./valuation.css";

// ─── Language plumbing ──────────────────────────────────────────────────────
const VCtx = createContext<{ copy: VCopy; lang: VLang }>({ copy: VALUATION_COPY.en, lang: "en" });
const useV = () => useContext(VCtx);

type Screen = "front" | "working" | "result" | "error";

/** What a finished run hands the result screen. The range is not in here. */
interface RunResult {
  briefId: string;
  runToken: string;
  variant: EstimateVariant;
  company: string;
  oneliner: string;
  resultMd: string;
  logo: string;
  domain: string;
}

interface Contact {
  name: string;
  phone: string;
  email: string;
}

const EMPTY_ANSWERS: EstimateAnswers = {
  url: "",
  timeline: "",
  serious: null,
  revenue: "",
  profit: "",
  staff: "",
  note: "",
};

/** To the very top, at once. The site's base CSS makes scrolling smooth. */
export function scrollToTop(): void {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
}

// ─── The phone keyboard ─────────────────────────────────────────────────────
// On a phone the keyboard covers the bottom of the screen without making the
// page any shorter: only the "visual viewport" shrinks. So while he types his
// email, the button under it can sit behind the keyboard. These keep it in
// sight (Ben, Oct 2), without pushing the box he is typing in off the top.

const KEYBOARD_SETTLE_MS = 350; // the keyboard slides up; measure after it has

function visibleArea(): { top: number; bottom: number } {
  const vv = window.visualViewport;
  const top = vv ? vv.offsetTop : 0;
  return { top, bottom: top + (vv ? vv.height : window.innerHeight) };
}

/** Scroll the page just enough that the button shows above the keyboard. */
function keepInSight(button: HTMLElement, typing: Element | null): void {
  const margin = 12;
  const area = visibleArea();
  const b = button.getBoundingClientRect();
  const need = b.bottom - (area.bottom - margin);
  if (need <= 0) return;
  // Never so far that the box he is typing in goes above the top.
  const room = typing ? typing.getBoundingClientRect().top - (area.top + margin) : need;
  const by = Math.min(need, Math.max(0, room));
  if (by > 0) window.scrollBy({ top: by, left: 0, behavior: "instant" as ScrollBehavior });
}

/** For a form in the page (the popup over the range, the inline boxes). */
function useSubmitInSight(formRef: React.RefObject<HTMLFormElement | null>): void {
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      const active = document.activeElement;
      const button = form.querySelector<HTMLElement>('button[type="submit"]');
      if (button && active && form.contains(active) && active !== button) keepInSight(button, active);
    };
    const onFocus = () => {
      clearTimeout(timer);
      timer = setTimeout(run, KEYBOARD_SETTLE_MS);
    };
    form.addEventListener("focusin", onFocus);
    window.visualViewport?.addEventListener("resize", run);
    return () => {
      clearTimeout(timer);
      form.removeEventListener("focusin", onFocus);
      window.visualViewport?.removeEventListener("resize", run);
    };
  }, [formRef]);
}

/**
 * For the talk popup, which is pinned to the screen: it follows the visible
 * area, so it shrinks above the keyboard and scrolls inside itself.
 */
function useVisibleBox(): React.CSSProperties | undefined {
  const [box, setBox] = useState<React.CSSProperties | undefined>(undefined);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setBox({ top: vv.offsetTop, height: vv.height, bottom: "auto" });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return box;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

// ─── Small helpers ──────────────────────────────────────────────────────────

/**
 * Whatever he typed into the box on the home page. It rides in history state,
 * never in the address, so GA4 and the Meta Pixel cannot record his company.
 * An old ?site= link still works and is cleaned off the address on arrival.
 */
function readSiteParam(): string {
  if (typeof window === "undefined") return "";
  try {
    const fromState = (window.history.state as { site?: unknown } | null)?.site;
    const raw =
      typeof fromState === "string"
        ? fromState
        : new URLSearchParams(window.location.search).get("site") ?? "";
    const oneLine = raw.replace(/[\r\n\t]+/g, " ").trim();
    if (!oneLine || oneLine.length > 200) return "";
    return oneLine.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function stripSiteParam(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("site")) return;
    params.delete("site");
    const rest = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname + (rest ? `?${rest}` : "") + window.location.hash,
    );
  } catch {
    // never break the page over the address bar
  }
}

function deriveDomain(url: string): string {
  try {
    const u = new URL(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.trim();
  }
}

/** The name we show until the engine sends his real one: his domain, dressed up. */
function deriveName(url: string, fallback: string): string {
  const base = deriveDomain(url).split(".")[0];
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : fallback;
}

/** "Carmel Print" is CP. Letters in any script; never empty. */
function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean);
  const out = words.slice(0, 2).map((w) => w.charAt(0)).join("").toUpperCase();
  return out || "G";
}

/** **bold** to <strong>, and nothing else. No HTML from the engine, ever. */
function renderInline(text: string): React.ReactNode {
  return text
    .replace(/^\s*[-*•]\s+/, "")
    .split("**")
    .map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

/** A company title with the name isolated, so a Latin name never flips a Hebrew line. */
function withBdi(title: (company: string) => string, company: string): React.ReactNode {
  const [before, after = ""] = title("\u0000").split("\u0000");
  return (
    <>
      {before}
      <bdi>{company}</bdi>
      {after}
    </>
  );
}

/**
 * The two cards out of what the engine wrote. Value lines carry a tag,
 * "positive:" or "watch:", sometimes inside the bold. The tag never reaches
 * the owner; the one risk is named in its label instead (the mockup).
 */
function parseCards(md: string): {
  market: string[];
  value: { watch: boolean; tagged: boolean; label: string; body: string }[];
} {
  const market: string[] = [];
  const value: { watch: boolean; tagged: boolean; label: string; body: string }[] = [];
  let cur: "market" | "value" | null = null;
  for (const raw of (md || "").split("\n")) {
    const line = raw.trim();
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      const h = heading[1].trim();
      cur = h === "Market" ? "market" : h === "Value" ? "value" : null;
      continue;
    }
    if (!cur || !line) continue;
    if (cur === "market") {
      market.push(line);
      continue;
    }
    let text = line.replace(/^\s*[-*•]\s+/, "");
    const flag = text.match(/^(\*\*)?\s*(positive|watch):\s*/i);
    const watch = flag ? flag[2].toLowerCase() === "watch" : false;
    const tagged = Boolean(flag);
    if (flag) text = (flag[1] || "") + text.slice(flag[0].length);
    const bold = text.match(/^\*\*(.+?)\*\*\s*(.*)$/);
    value.push(bold ? { watch, tagged, label: bold[1].trim(), body: bold[2].trim() } : { watch, tagged, label: "", body: text });
  }
  return { market, value };
}

// ─── Reading the meta block while it streams ─────────────────────────────────
// The engine writes a fenced json block first, then the cards. The working
// screen reads it live for his company name, and its closing is the
// "Learning about your business" checkpoint. Same rules as the server's
// parseMetaAndBody: take the first fence that opens an object, wherever it
// sits, and keep looking until the run ends.

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

function parseStreamMeta(raw: string): { company_name?: string } | null {
  try {
    const value: unknown = JSON.parse(raw.trim());
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as { company_name?: string };
  } catch {
    return null;
  }
}

function readMetaBlock(text: string): { meta: { company_name?: string }; bodyFrom: number } | null {
  const open = text.match(/```(?:json)?\s*(?=\{)/i);
  if (open && typeof open.index === "number") {
    const after = open.index + open[0].length;
    const close = text.indexOf("```", after);
    if (close === -1) return null;
    const meta = parseStreamMeta(text.slice(after, close));
    if (meta) return { meta, bodyFrom: close + 3 };
  }
  const head = text.slice(0, 4000);
  const brace = head.indexOf("{");
  if (brace !== -1 && !/[A-Za-z]{3}/.test(head.slice(0, brace).replace(/json/gi, "").replace(/[-\s`_*]/g, ""))) {
    const obj = balancedObject(text, brace);
    if (!obj) return null;
    const meta = parseStreamMeta(obj);
    if (meta) return { meta, bodyFrom: brace + obj.length };
  }
  return null;
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path fill="currentColor" d="M4 7V5a4 4 0 1 1 8 0v2h1v8H3V7h1zm2 0h4V5a2 2 0 1 0-4 0v2z" />
    </svg>
  );
}

function Hourglass() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        d="M4 1.5h8M4 14.5h8M5 1.5c0 3.5 6 3.5 6 6.5s-6 3-6 6.5M11 1.5c0 3.5-6 3.5-6 6.5s6 3 6 6.5"
      />
    </svg>
  );
}

function Chevron() {
  return (
    <svg className="ve-chev" viewBox="0 0 12 8" aria-hidden="true">
      <path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * His logo, pulled from his own site by the server. Shown only once it has
 * loaded and looks like a logo: at least 32px, and not a wide banner. Until
 * then, and whenever it fails, his initials. Never a broken image.
 */
function CompanyLogo({ src, name }: { src?: string; name: string }) {
  const [good, setGood] = useState<string | null>(null);
  useEffect(() => {
    setGood(null);
    if (!src) return;
    let live = true;
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const ratio = h ? w / h : 0;
      if (live && w >= 32 && h >= 32 && ratio >= 0.5 && ratio <= 2) setGood(src);
    };
    img.src = src;
    return () => {
      live = false;
    };
  }, [src]);
  if (good) {
    return (
      <div className="ve-logo has-img" aria-hidden="true">
        <img src={good} alt="" onError={() => setGood(null)} />
      </div>
    );
  }
  return (
    <div className="ve-logo" aria-hidden="true">
      {initials(name)}
    </div>
  );
}

function Confidential({ text }: { text: string }) {
  return (
    <p className="ve-confidential">
      <LockIcon />
      {text}
    </p>
  );
}

function problemText(C: VCopy, p: ContactProblem): string {
  return {
    all: C.gate.errAll,
    name: C.gate.errName,
    reach: C.gate.errReach,
    phoneBad: C.gate.errPhoneBad,
    emailBad: C.gate.errEmailBad,
  }[p];
}

const PROBLEMS = new Set<string>(["all", "name", "reach", "phoneBad", "emailBad"]);

/** The server's answer to a bad form, as the line to show. */
function serverProblem(C: VCopy, p: unknown): string {
  return typeof p === "string" && PROBLEMS.has(p) ? problemText(C, p as ContactProblem) : C.server.busy;
}

/**
 * The icon before each Value point (Ben, Oct 2): a check for a strength, an
 * alert for the watch, in the brand's navy and burgundy. A point the engine
 * did not tag gets no icon; the page never guesses.
 */
function ValueIcon({ watch }: { watch: boolean }) {
  return (
    <span className={"ve-value-icon" + (watch ? " is-watch" : " is-positive")} aria-hidden="true">
      <svg viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.3" />
        {watch ? (
          <path d="M8 4.2v4.6M8 11.2v.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        ) : (
          <path d="M5 8.3l2 2 4-4.3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </span>
  );
}

/** Name, phone and email: the popup's boxes and the inline form's boxes. */
function ContactFields({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: Contact;
  onChange: (c: Contact) => void;
}) {
  const { copy: C } = useV();
  return (
    <>
      <div>
        <label className="ve-lbl" htmlFor={`${idPrefix}-name`}>
          {C.gate.nameLabel}
        </label>
        <input
          className="ve-input"
          id={`${idPrefix}-name`}
          type="text"
          autoComplete="name"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </div>
      <div className="ve-pair">
        <div>
          <label className="ve-lbl" htmlFor={`${idPrefix}-phone`}>
            {C.gate.phoneLabel}
          </label>
          {/* A phone number and an address read left to right in any language. */}
          <input
            className="ve-input"
            id={`${idPrefix}-phone`}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            value={value.phone}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
          />
        </div>
        <div>
          <label className="ve-lbl" htmlFor={`${idPrefix}-email`}>
            {C.gate.emailLabel}
          </label>
          <input
            className="ve-input"
            id={`${idPrefix}-email`}
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            spellCheck={false}
            autoCapitalize="off"
            value={value.email}
            onChange={(e) => onChange({ ...value, email: e.target.value })}
          />
        </div>
      </div>
    </>
  );
}

async function postJson(path: string, body: object): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let data: Record<string, unknown> = {};
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      data = {};
    }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: {} };
  }
}

// ─── Screen 1. The front door ───────────────────────────────────────────────

function FrontDoor({
  answers,
  setAnswers,
  tried,
  onContinue,
}: {
  answers: EstimateAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<EstimateAnswers>>;
  tried: boolean;
  onContinue: (fromKeyboard: boolean) => void;
}) {
  const { copy: C } = useV();
  const missing = useMemo(() => new Set(tried ? missingRequired(answers) : []), [tried, answers]);
  const sliderRef = useRef<HTMLInputElement>(null);
  const touched = answers.serious !== null;

  const set = <K extends keyof EstimateAnswers>(key: K, value: EstimateAnswers[K]) =>
    setAnswers((a) => ({ ...a, [key]: value }));

  const setSerious = (n: number) => {
    if (Number.isInteger(n) && n >= SERIOUS_MIN && n <= SERIOUS_MAX) set("serious", n);
  };

  const errProps = (field: RequiredField) =>
    missing.has(field) ? { "aria-invalid": true as const, "aria-describedby": `ve-${field}-err` } : {};

  const errLine = (field: RequiredField, text: string) =>
    missing.has(field) ? (
      <p className="ve-q-err" id={`ve-${field}-err`}>
        {text}
      </p>
    ) : null;

  const qClass = (field: RequiredField) => "ve-q" + (missing.has(field) ? " is-err" : "");

  // A tap on Continue only scrolls to the first missing answer, as in the
  // mockup, so a phone does not throw its keyboard up. From the keyboard, the
  // focus goes there too, so he can carry on typing.
  const byPointer = useRef(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onContinue(!byPointer.current);
    byPointer.current = false;
  }

  const select = (
    id: string,
    field: "timeline" | "revenue" | "profit" | "staff",
    codes: readonly string[],
    labels: Record<string, string>,
  ) => (
    <div className="ve-select-wrap">
      {/* A real <select>, so a phone opens its own picker. */}
      <select
        id={id}
        className={"ve-select" + (answers[field] ? "" : " is-empty")}
        value={answers[field]}
        onChange={(e) => set(field, e.target.value as never)}
        {...(field === "staff" ? {} : errProps(field))}
      >
        <option value="" disabled hidden>
          {C.front.selectPlaceholder}
        </option>
        {codes.map((code) => (
          <option key={code} value={code}>
            {labels[code]}
          </option>
        ))}
      </select>
      <Chevron />
    </div>
  );

  return (
    <section className="ve-front" aria-labelledby="ve-h-front">
      <h1 id="ve-h-front" tabIndex={-1}>
        {C.front.headline}
      </h1>

      <form className="ve-form" onSubmit={handleSubmit} noValidate>
        <div className={qClass("url")} id="ve-q-url">
          <label className="ve-q-label" htmlFor="ve-url">
            {C.front.urlLabel}
          </label>
          {/* A web address is Latin whatever the page language is. */}
          <input
            className="ve-input"
            id="ve-url"
            name="url"
            type="text"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="off"
            spellCheck={false}
            dir="ltr"
            placeholder={C.front.urlPlaceholder}
            value={answers.url}
            onChange={(e) => set("url", e.target.value)}
            {...errProps("url")}
          />
          {errLine("url", C.front.urlError)}
        </div>

        <div className={qClass("timeline")} id="ve-q-timeline">
          <label className="ve-q-label" htmlFor="ve-timeline">
            {C.front.whenLabel}
          </label>
          {select("ve-timeline", "timeline", TIMELINE_CODES, C.timeToSell)}
          {errLine("timeline", C.front.missing)}
        </div>

        <div className={qClass("serious")} id="ve-q-serious">
          <label className="ve-q-label" htmlFor="ve-serious">
            {C.front.seriousLabel}
          </label>
          <div className="ve-serious-row">
            <output className="ve-serious-val" htmlFor="ve-serious" aria-live="polite">
              {touched ? answers.serious : C.front.seriousEmpty}
            </output>
            <div className="ve-slider-wrap">
              {/* Starts with no answer. It sits on 5 with a hollow thumb, and
                  only counts once he drags it, taps it or taps a number. */}
              <input
                ref={sliderRef}
                className={"ve-slider" + (touched ? "" : " untouched")}
                id="ve-serious"
                type="range"
                min={SERIOUS_MIN}
                max={SERIOUS_MAX}
                step={1}
                value={answers.serious ?? 5}
                aria-valuetext={touched ? C.front.seriousValueText(answers.serious!) : C.front.seriousNotChosen}
                onChange={(e) => setSerious(Number(e.target.value))}
                onPointerDown={() => {
                  if (!touched) setTimeout(() => setSerious(Number(sliderRef.current?.value)), 0);
                }}
                {...errProps("serious")}
              />
              <div className="ve-ticks" aria-hidden="true">
                {Array.from({ length: SERIOUS_MAX - SERIOUS_MIN + 1 }, (_, i) => i + SERIOUS_MIN).map((n) => (
                  <button key={n} type="button" tabIndex={-1} onClick={() => setSerious(n)}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="ve-ends">
            <span>{C.front.seriousEnds.low}</span>
            <span>{C.front.seriousEnds.high}</span>
          </div>
          {errLine("serious", C.front.missing)}
        </div>

        <div className={qClass("revenue")} id="ve-q-revenue">
          <label className="ve-q-label" htmlFor="ve-revenue">
            {C.front.revenueLabel}
          </label>
          {select("ve-revenue", "revenue", REVENUE_CODES, C.revenue)}
          {errLine("revenue", C.front.missing)}
        </div>

        <div className={qClass("profit")} id="ve-q-profit">
          <label className="ve-q-label" htmlFor="ve-profit">
            {C.front.profitLabel}
          </label>
          {select("ve-profit", "profit", PROFIT_CODES, C.profit)}
          {errLine("profit", C.front.missing)}
        </div>

        <div className="ve-q" id="ve-q-staff">
          <label className="ve-q-label" htmlFor="ve-staff">
            {C.front.staffLabel}
          </label>
          {select("ve-staff", "staff", STAFF_CODES, C.staff)}
        </div>

        <div className="ve-q" id="ve-q-note">
          <label className="ve-q-label" htmlFor="ve-note">
            {C.front.noteLabel}
          </label>
          <textarea
            className="ve-input"
            id="ve-note"
            name="note"
            rows={3}
            maxLength={NOTE_MAX}
            value={answers.note}
            onChange={(e) => set("note", e.target.value)}
          />
        </div>

        <div className="ve-submit-zone">
          <button
            className="ve-btn block"
            type="submit"
            onPointerDown={() => {
              byPointer.current = true;
            }}
          >
            {C.front.submit}
          </button>
          <p className="ve-contact-note">{C.front.contactNote}</p>
          <Confidential text={C.front.confidential} />
        </div>
      </form>
      <p className="ve-disclaimer">{C.disclaimer}</p>
    </section>
  );
}

// ─── Screen 2. While it works ───────────────────────────────────────────────

const STAGE_COUNT = WORKING_STAGE_IDS.length;
const REASSURE_AFTER_MS = 25000;
const TAG_MS = 6500;
const LEARN_FALLBACK_MS = 5000;
const HARD_TIMEOUT_MS = 180000;
// The ring creeps toward the next checkpoint at the pace of a normal run and
// stops short of it, so it never says a step is done before the engine does.
const MEDIAN_STAGE_MS = [5000, 10000, 10000, 10000, 7000];
const RING_CREEP = 0.88;
const RING_C = 2 * Math.PI * 52; // r = 52, as in the mockup
const RING_HANDOVER_MS = 650;

// One paid run per press of Continue, even through a double mount in dev.
let firedRun = -1;

function Working({
  runNo,
  answers,
  lang,
  onDone,
  onError,
}: {
  runNo: number;
  answers: EstimateAnswers;
  lang: VLang;
  onDone: (r: RunResult) => void;
  onError: (message?: string) => void;
}) {
  const { copy: C } = useV();
  const [stageIdx, setStageIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [tagIdx, setTagIdx] = useState(0);
  const [reassure, setReassure] = useState(false);
  const [company, setCompany] = useState<string | undefined>();
  const [logo, setLogo] = useState<string | undefined>();

  const domain = useMemo(() => deriveDomain(answers.url), [answers.url]);
  const shownName = company || deriveName(answers.url, C.working.companyFallbackName);

  const startedAt = useRef(Date.now());
  const stageRef = useRef(0);
  const stageStartedAt = useRef(Date.now());
  const peakRef = useRef(0);

  const advanceTo = useCallback((next: number) => {
    if (next <= stageRef.current) return;
    stageRef.current = next;
    stageStartedAt.current = Date.now();
    // Nothing on the server times a run, so these console lines are the clock.
    console.log(`[valuation] ${WORKING_STAGE_IDS[next - 1] ?? "done"} ${Date.now() - startedAt.current}ms`);
    setStageIdx(next);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTagIdx((i) => (i + 1) % C.taglines.length), TAG_MS);
    return () => clearInterval(t);
  }, [C.taglines.length]);

  useEffect(() => {
    setReassure(false);
    if (stageIdx >= STAGE_COUNT) return;
    const t = setTimeout(() => setReassure(true), REASSURE_AFTER_MS);
    return () => clearTimeout(t);
  }, [stageIdx]);

  useEffect(() => {
    const t = setTimeout(() => advanceTo(1), LEARN_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [advanceTo]);

  useEffect(() => {
    if (finishing || stageIdx >= STAGE_COUNT) return;
    const tick = () => {
      const inStage = Date.now() - stageStartedAt.current;
      const share = Math.min(RING_CREEP, (inStage / (MEDIAN_STAGE_MS[stageIdx] || 10000)) * RING_CREEP);
      const next = Math.max((stageIdx + share) / STAGE_COUNT, peakRef.current);
      peakRef.current = next;
      setProgress(next);
    };
    tick();
    const t = setInterval(tick, prefersReducedMotion() ? 500 : 100);
    return () => clearInterval(t);
  }, [stageIdx, finishing]);

  // The run. Fired once, read as a stream, stages moved only by real signals.
  useEffect(() => {
    if (firedRun === runNo) return;
    firedRun = runNo;
    trackValuationStart({ lang });

    const controller = new AbortController();
    let active = true;
    let handover: ReturnType<typeof setTimeout> | null = null;
    const hardStop = setTimeout(() => {
      if (!active) return;
      active = false;
      controller.abort();
      onError(undefined);
    }, HARD_TIMEOUT_MS);

    (async () => {
      try {
        const res = await fetch("/api/valuation/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: answers.url.trim(),
            lang,
            timeline: answers.timeline,
            serious: answers.serious,
            revenue: answers.revenue,
            profit: answers.profit,
            staff: answers.staff,
            note: answers.note.trim(),
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          // A refusal carries the server's own sentence (the cooldown, the
          // daily cap, a busy engine). Anything else is "could not read".
          let message: string | undefined;
          try {
            const body = (await res.json()) as { error?: unknown };
            if (typeof body.error === "string" && body.error.trim()) message = body.error.trim();
          } catch {
            // not JSON
          }
          if (active) onError(message);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamed = "";
        let bodyFrom = -1;
        let metaFound = false;
        let done: Record<string, unknown> | null = null;
        // The server's own sentence when the engine was busy mid-run.
        let failed: string | undefined;

        for (;;) {
          const { value, done: end } = await reader.read();
          if (end) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.trim()) continue;
            let msg: Record<string, unknown>;
            try {
              msg = JSON.parse(line) as Record<string, unknown>;
            } catch {
              continue;
            }
            if (msg.type === "phase" && msg.phase === "searching") advanceTo(1);
            else if (msg.type === "site" && typeof msg.logo === "string") setLogo(msg.logo);
            else if (msg.type === "chunk") {
              streamed += typeof msg.data === "string" ? msg.data : "";
              if (!metaFound) {
                const read = readMetaBlock(streamed);
                if (read) {
                  metaFound = true;
                  if (read.meta.company_name?.trim()) setCompany(read.meta.company_name.trim());
                  if (bodyFrom === -1) {
                    bodyFrom = read.bodyFrom;
                    advanceTo(2);
                  }
                }
              }
              if (bodyFrom === -1) {
                const market = streamed.indexOf("## Market");
                if (market !== -1) {
                  bodyFrom = market;
                  advanceTo(2);
                }
              }
              if (bodyFrom !== -1 && streamed.slice(bodyFrom).includes("## Value")) advanceTo(3);
            } else if (msg.type === "phase" && msg.phase === "pricing") advanceTo(4);
            else if (msg.type === "done") done = msg;
            else if (msg.type === "error" && typeof msg.error === "string") failed = msg.error;
          }
        }

        if (!active) return;
        const variant = done?.variant;
        if (!done || typeof done.briefId !== "string" || !["locked", "by_hand", "big"].includes(String(variant))) {
          onError(failed);
          return;
        }

        advanceTo(STAGE_COUNT);
        const result: RunResult = {
          briefId: done.briefId,
          runToken: String(done.run_token ?? ""),
          variant: variant as EstimateVariant,
          company: String(done.company_name || "") || deriveName(answers.url, C.working.companyFallbackName),
          oneliner: String(done.company_oneliner ?? ""),
          resultMd: String(done.result_md ?? ""),
          logo: String(done.logo ?? ""),
          domain,
        };
        setFinishing(true);
        peakRef.current = 1;
        setProgress(1);
        handover = setTimeout(
          () => {
            if (!active) return;
            trackValuationDone({ lang, range_variant: variant === "locked" ? "number" : "by-hand" });
            onDone(result);
          },
          prefersReducedMotion() ? 0 : RING_HANDOVER_MS,
        );
      } catch {
        if (active) onError(undefined);
      }
    })();

    return () => {
      active = false;
      controller.abort();
      clearTimeout(hardStop);
      if (handover) clearTimeout(handover);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runNo]);

  const pct = Math.round(progress * 100);

  return (
    <section className="ve-working" aria-labelledby="ve-h-working">
      <div className="ve-co-head">
        <CompanyLogo src={logo} name={shownName} />
        <div style={{ minWidth: 0 }}>
          <div className="nm">
            <bdi>{shownName}</bdi>
          </div>
          <div className="url">
            <bdi>{domain}</bdi>
          </div>
        </div>
      </div>
      <h1 id="ve-h-working" tabIndex={-1}>
        {C.working.heading}
      </h1>
      <p className="sub">{C.working.sub}</p>
      <div className="ve-ring-row">
        <div className="ve-ring" role="img" aria-label={C.working.ringAriaLabel(pct)}>
          <svg viewBox="0 0 112 112" aria-hidden="true">
            <circle className="track" cx="56" cy="56" r="52" />
            <circle
              className="fill"
              cx="56"
              cy="56"
              r="52"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - progress)}
            />
          </svg>
          {/* "42%", never "%42", on a right-to-left page. */}
          <div className="ve-ring-pct" dir="ltr" aria-hidden="true">
            {pct}%
          </div>
        </div>
        <ol className="ve-steps" aria-label={C.working.stagesAriaLabel} aria-live="polite">
          {WORKING_STAGE_IDS.map((id, i) => (
            <li key={id} className={i < stageIdx ? "done" : i === stageIdx ? "now" : ""}>
              <span className="dot" aria-hidden="true"></span>
              {C.stages[id]}
            </li>
          ))}
        </ol>
      </div>
      {reassure && stageIdx < STAGE_COUNT && <p className="ve-long-step">{C.working.longStep}</p>}
      <p className="ve-tagline" aria-hidden="true">
        {C.taglines[tagIdx]}
      </p>
    </section>
  );
}

// ─── Screen 3. The result ───────────────────────────────────────────────────

function Result({
  run,
  answers,
  lang,
  contact,
  setContact,
  onUnlocked,
}: {
  run: RunResult;
  answers: EstimateAnswers;
  lang: VLang;
  contact: Contact;
  setContact: (c: Contact) => void;
  onUnlocked: (range: string) => void;
}) {
  const { copy: C } = useV();
  const special = run.variant !== "locked";
  const [range, setRange] = useState<string | null>(null);
  const locked = !special && range === null;
  const cards = useMemo(() => parseCards(run.resultMd), [run.resultMd]);

  // The popup's state.
  const [gateMsg, setGateMsg] = useState<string | null>(null);
  const [gateBusy, setGateBusy] = useState(false);

  // The one CTA, and the inline form on the two no-number cases.
  const [ctaDone, setCtaDone] = useState(false);
  const [ctaBusy, setCtaBusy] = useState(false);
  const [ctaMsg, setCtaMsg] = useState<string | null>(null);

  const rangeHeadingRef = useRef<HTMLHeadingElement>(null);
  const gateFormRef = useRef<HTMLFormElement>(null);
  const inlineFormRef = useRef<HTMLFormElement>(null);
  useSubmitInSight(gateFormRef);
  useSubmitInSight(inlineFormRef);

  const token = { briefId: run.briefId, runToken: run.runToken };

  // The range opens right away, and focus lands on it. After the render, so
  // the cards are no longer inert, and a tick later, because Firefox moves
  // focus to the page itself when the popup's button leaves the page.
  useEffect(() => {
    if (!range) return;
    const t = setTimeout(() => {
      const h = rangeHeadingRef.current;
      h?.focus({ preventScroll: true });
      h?.closest("article")?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    }, 0);
    return () => clearTimeout(t);
  }, [range]);

  async function submitGate(e: React.FormEvent) {
    e.preventDefault();
    if (gateBusy) return;
    const problem = contactProblem(contact.name, contact.phone, contact.email);
    if (problem) {
      setGateMsg(problemText(C, problem));
      return;
    }
    setGateMsg(null);
    setGateBusy(true);
    const r = await postJson("/api/valuation/unlock", {
      ...token,
      name: contact.name.trim(),
      phone: contact.phone.trim(),
      email: contact.email.trim(),
    });
    setGateBusy(false);
    if (r.ok && typeof r.data.range === "string" && r.data.range) {
      setRange(r.data.range);
      onUnlocked(r.data.range);
      trackContactSubmit({ form: "valuation", lang });
      return;
    }
    const p = r.data.problem;
    setGateMsg(serverProblem(C, p));
  }

  async function talk(withDetails: boolean) {
    if (ctaBusy) return;
    if (withDetails) {
      const problem = contactProblem(contact.name, contact.phone, contact.email);
      if (problem) {
        setCtaMsg(problemText(C, problem));
        return;
      }
    }
    setCtaMsg(null);
    setCtaBusy(true);
    trackTalkClick({ placement: special ? "result_by_hand" : "result", lang });
    const r = await postJson("/api/valuation/talk", {
      ...token,
      name: contact.name.trim(),
      phone: contact.phone.trim(),
      email: contact.email.trim(),
    });
    setCtaBusy(false);
    if (r.ok) {
      setCtaDone(true);
      if (withDetails) trackContactSubmit({ form: "valuation", lang });
      return;
    }
    const p = r.data.problem;
    setCtaMsg(serverProblem(C, p));
  }

  const done = (
    <p className="ve-call-done" role="status">
      {C.result.callDone}
    </p>
  );

  const scarcity = (
    <p className="ve-scarcity">
      <Hourglass />
      {C.result.scarcity}
    </p>
  );

  let cta: React.ReactNode;
  if (ctaDone) {
    cta = done;
  } else if (special) {
    cta = (
      <>
        <p className="ve-cta-lead">{C.result.specialCta}</p>
        <form
          ref={inlineFormRef}
          className="ve-inline-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void talk(true);
          }}
        >
          <ContactFields idPrefix="ve-i" value={contact} onChange={setContact} />
          {ctaMsg && (
            <p className="ve-inline-err" role="alert">
              {ctaMsg}
            </p>
          )}
          <div className="ve-cta-act">
            <button className="ve-btn" type="submit" disabled={ctaBusy} aria-busy={ctaBusy}>
              {C.result.callBtn}
            </button>
            {scarcity}
          </div>
          <Confidential text={C.gate.confidential} />
        </form>
      </>
    );
  } else {
    cta = (
      <>
        <p className="ve-cta-lead">{C.result.ctaLead}</p>
        <p className="ve-cta-body">{C.result.ctaBody}</p>
        <div className="ve-cta-act">
          <button
            className="ve-btn"
            type="button"
            disabled={ctaBusy}
            aria-busy={ctaBusy}
            onClick={() => void talk(false)}
          >
            {C.result.callBtn}
          </button>
          {scarcity}
        </div>
        {ctaMsg && (
          <p className="ve-cta-err" role="alert">
            {ctaMsg}
          </p>
        )}
      </>
    );
  }

  const company = run.company;

  return (
    <section className="ve-result" aria-labelledby="ve-h-result">
      <h1 className="ve-r-title" id="ve-h-result" tabIndex={-1}>
        {withBdi(special ? C.result.specialTitle : C.result.title, company)}
      </h1>
      <p className="ve-r-private">{C.result.privateLine}</p>

      <div className="ve-r-grid">
        <div className="ve-r-main">
          {cards.market.length > 0 && (
            <article className="ve-card" aria-labelledby="ve-h-market">
              <h2 id="ve-h-market">{C.result.cardMarket}</h2>
              {cards.market.map((line, i) => (
                <p key={i}>{renderInline(line)}</p>
              ))}
            </article>
          )}

          <div className={"ve-locked-zone" + (locked ? " is-locked" : "")}>
            <div className="ve-blurrable" aria-hidden={locked || undefined} inert={locked}>
              {cards.value.length > 0 && (
                <article className="ve-card" aria-labelledby="ve-h-value">
                  <h2 id="ve-h-value">{C.result.cardValue}</h2>
                  {cards.value.map((v, i) => (
                    <p className={"ve-value-item" + (v.tagged ? " has-icon" : "")} key={i}>
                      {v.tagged && <ValueIcon watch={v.watch} />}
                      <span className="ve-value-text">
                        {v.label && (
                          <>
                            <strong>{v.watch && !/^watch\b/i.test(v.label) ? C.result.watchLabel(v.label) : v.label}</strong>{" "}
                          </>
                        )}
                        {renderInline(v.body)}
                      </span>
                    </p>
                  ))}
                </article>
              )}

              <article className="ve-card" aria-labelledby="ve-h-range">
                <h2 id="ve-h-range" ref={rangeHeadingRef} tabIndex={-1}>
                  {special ? C.result.cardSpecial : C.result.cardRange}
                </h2>
                {special ? (
                  <div>
                    <p className="ve-byhand-lead">{run.variant === "big" ? C.result.bigLead : C.result.byHandLead}</p>
                    <p className="ve-range-line">{run.variant === "big" ? C.result.bigBody : C.result.byHandBody}</p>
                  </div>
                ) : (
                  <div>
                    {/* While locked this is a placeholder: the real range is
                        not on this page until the server sends it. */}
                    <p className="ve-range-fig">
                      <bdi>{range ?? C.result.rangeFigure("00", "00")}</bdi>
                    </p>
                    <p className="ve-range-line">{C.result.rangeLine}</p>
                  </div>
                )}
                <div className="ve-cta">{cta}</div>
              </article>
            </div>

            {locked && (
              <div className="ve-gate" role="region" aria-labelledby="ve-h-gate">
                <form ref={gateFormRef} className="ve-gate-card" noValidate onSubmit={submitGate}>
                  <p className="ve-eyebrow">{C.gate.label}</p>
                  <h2 id="ve-h-gate">{C.gate.heading}</h2>
                  <p className="gsub">{C.gate.sub}</p>
                  <ContactFields idPrefix="ve-g" value={contact} onChange={setContact} />
                  {gateMsg && (
                    <p className="ve-gate-err" role="alert">
                      {gateMsg}
                    </p>
                  )}
                  <button className="ve-btn block" type="submit" disabled={gateBusy} aria-busy={gateBusy}>
                    {C.gate.submit}
                  </button>
                  <Confidential text={C.gate.confidential} />
                </form>
              </div>
            )}
          </div>
          <p className="ve-disclaimer">{C.disclaimer}</p>
        </div>

        <aside className="ve-card ve-co-card" aria-label={C.result.companyAriaLabel}>
          <CompanyLogo src={run.logo || undefined} name={company} />
          <p className="ve-co-name">
            <bdi>{company}</bdi>
          </p>
          {run.oneliner && <p className="ve-co-desc">{run.oneliner}</p>}
          <p className="ve-co-url">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" />
              <path d="M1.5 8h13M8 1.5c2 2 2 11 0 13M8 1.5c-2 2-2 11 0 13" fill="none" stroke="currentColor" />
            </svg>
            <bdi>{run.domain}</bdi>
          </p>
          <dl className="ve-co-bands">
            <div>
              <dt>{C.result.coRevenue}</dt>
              <dd>
                <bdi>{answers.revenue ? C.revenue[answers.revenue] : ""}</bdi>
              </dd>
            </div>
            <div>
              <dt>{C.result.coProfit}</dt>
              <dd>
                <bdi>{answers.profit ? C.profit[answers.profit] : ""}</bdi>
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}

// ─── When it cannot run ─────────────────────────────────────────────────────

function ErrorScreen({ message, onRetry, onTalk }: { message?: string; onRetry: () => void; onTalk: () => void }) {
  const { copy: C } = useV();
  return (
    <section className="ve-error" aria-labelledby="ve-h-error">
      <h1 id="ve-h-error" tabIndex={-1}>
        {message ? C.error.headingBlocked : C.error.headingUnreadable}
      </h1>
      <p>{message ?? C.error.subUnreadable}</p>
      <div className="ve-error-actions">
        <button type="button" className="ve-btn" onClick={onTalk}>
          {C.error.talkBtn}
        </button>
        <button type="button" className="ve-btn ve-btn-outline" onClick={onRetry}>
          {C.error.retryBtn}
        </button>
      </div>
    </section>
  );
}

// ─── The talk popup, behind "Talk to us" in the top bar ──────────────────────
// A short note to office@ through the contact form's route. When he ran an
// estimate, it rides along so the note says who he is.

function TalkModal({
  onClose,
  run,
  answers,
  contact,
  range,
}: {
  onClose: () => void;
  run: RunResult | null;
  answers: EstimateAnswers;
  contact: Contact;
  range: string | null;
}) {
  const { copy: C, lang } = useV();
  const [name, setName] = useState(contact.name);
  const [reach, setReach] = useState(contact.email || contact.phone);
  const [message, setMessage] = useState("");
  const [tried, setTried] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const dialogRef = useRef<HTMLDivElement>(null);
  const box = useVisibleBox();

  // The send button in sight inside the popup while he types.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onFocus = (e: FocusEvent) => {
      if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        dialog.querySelector<HTMLElement>('button[type="submit"]')?.scrollIntoView({ block: "nearest" });
        (e.target as HTMLElement).scrollIntoView({ block: "nearest" });
      }, KEYBOARD_SETTLE_MS);
    };
    dialog.addEventListener("focusin", onFocus);
    return () => {
      clearTimeout(timer);
      dialog.removeEventListener("focusin", onFocus);
    };
  }, []);
  const opener = useRef<Element | null>(typeof document !== "undefined" ? document.activeElement : null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Start on the name box, not the close button, and only if he is not
    // already in a box: a fast tap must never have its focus pulled away
    // (a space typed into the close button would close the popup).
    const t = setTimeout(() => {
      const dialog = dialogRef.current;
      if (!dialog || dialog.contains(document.activeElement)) return;
      dialog.querySelector<HTMLElement>("input, textarea")?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        // Keep Tab inside the popup while it is open.
        const items = dialogRef.current.querySelectorAll<HTMLElement>("input, textarea, button");
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    const back = opener.current;
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      if (back instanceof HTMLElement) back.focus();
    };
  }, [onClose]);

  const isEmail = reach.includes("@");
  // One box for a phone or an email. An email has to look whole, and a phone
  // has to be Israeli (Ben, Oct 2), the same rules as the popup.
  const reachProblem = !reach.trim()
    ? C.talk.errReachMissing
    : isEmail
      ? looksLikeEmail(reach)
        ? null
        : C.talk.errEmailBad
      : looksLikeIsraeliPhone(reach)
        ? null
        : C.gate.errPhoneBad;
  const problem = !tried ? null : !name.trim() ? C.talk.errName : reachProblem;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!name.trim() || reachProblem) return;
    if (status === "sending") return;
    setStatus("sending");
    const r = await postJson("/api/contact", {
      name: name.trim(),
      email: isEmail ? reach.trim() : undefined,
      phone: isEmail ? undefined : reach.trim(),
      message: message.trim() || "(no message)",
      sourcePage: VALUATION_PATH[lang],
      ...(run
        ? {
            valuation: {
              briefId: run.briefId,
              site: run.domain,
              company: run.company,
              range: range ?? "",
              revenue: answers.revenue ? C.revenue[answers.revenue] : "",
              profit: answers.profit ? C.profit[answers.profit] : "",
              timeToSell: answers.timeline ? C.timeToSell[answers.timeline] : "",
            },
          }
        : {}),
    });
    setStatus(r.ok ? "sent" : "failed");
    if (r.ok) trackContactSubmit({ form: "valuation", lang });
  }

  return (
    <div className="ve-modal-backdrop" style={box} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} className="ve-modal" role="dialog" aria-modal="true" aria-labelledby="ve-talk-title">
        <button type="button" className="ve-modal-close" aria-label={C.talk.closeAriaLabel} onClick={onClose}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        {status === "sent" ? (
          <>
            <h2 id="ve-talk-title">{C.talk.sentTitle}</h2>
            <p className="ve-modal-sub" role="status">
              {C.talk.sentBody}
            </p>
            <button type="button" className="ve-btn block" onClick={onClose}>
              {C.talk.closeBtn}
            </button>
          </>
        ) : (
          <>
            <h2 id="ve-talk-title">{C.talk.title}</h2>
            <p className="ve-modal-sub">{run ? C.talk.subWithRun : C.talk.subNoRun}</p>
            <form className="ve-inline-form" noValidate onSubmit={submit}>
              <div>
                <label className="ve-lbl" htmlFor="ve-t-name">
                  {C.talk.nameLabel}
                </label>
                <input className="ve-input" id="ve-t-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="ve-lbl" htmlFor="ve-t-reach">
                  {C.talk.reachLabel}
                </label>
                <input
                  className="ve-input"
                  id="ve-t-reach"
                  type="text"
                  dir="ltr"
                  spellCheck={false}
                  autoCapitalize="off"
                  value={reach}
                  onChange={(e) => setReach(e.target.value)}
                />
              </div>
              <div>
                <label className="ve-lbl" htmlFor="ve-t-msg">
                  {C.talk.messageLabel}
                </label>
                <textarea className="ve-input" id="ve-t-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              {problem ? (
                <p className="ve-modal-err" role="alert">
                  {problem}
                </p>
              ) : (
                status === "failed" && (
                  <p className="ve-modal-err" role="alert">
                    {C.talk.sendFailed}
                  </p>
                )
              )}
              <button type="submit" className="ve-btn block" disabled={status === "sending"}>
                {status === "sending" ? C.talk.sending : status === "failed" ? C.talk.retry : C.talk.submit}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── The page ───────────────────────────────────────────────────────────────

export default function Valuation({ lang = "en", copy }: { lang?: VLang; copy?: VCopy }) {
  const C = copy ?? VALUATION_COPY[lang];
  const dir = lang === "he" ? "rtl" : "ltr";
  const [screen, setScreen] = useState<Screen>("front");
  const [answers, setAnswers] = useState<EstimateAnswers>(() => ({ ...EMPTY_ANSWERS, url: readSiteParam() }));
  const [tried, setTried] = useState(false);
  const [runNo, setRunNo] = useState(0);
  const [run, setRun] = useState<RunResult | null>(null);
  const [range, setRange] = useState<string | null>(null);
  const [contact, setContact] = useState<Contact>({ name: "", phone: "", email: "" });
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [talkOpen, setTalkOpen] = useState(false);

  useEffect(() => {
    stripSiteParam();
  }, []);

  // Let him pinch to zoom here. index.html caps the zoom for the whole site;
  // the server lifts it on a direct visit (server/_core/vite.ts), and this
  // lifts it after a hop from the home page, then puts it back on the way out.
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!meta) return;
    const before = meta.content;
    meta.content = "width=device-width, initial-scale=1.0";
    return () => {
      meta.content = before;
    };
  }, []);

  // The server sets <html lang dir> on first load; this keeps it right after a
  // client-side hop, and puts it back on the way out.
  useEffect(() => {
    const el = document.documentElement;
    el.lang = lang;
    el.setAttribute("dir", dir);
    return () => {
      el.lang = "en";
      el.setAttribute("dir", "ltr");
    };
  }, [lang, dir]);

  // Each screen starts at the very top (Ben, Oct 2: a phone landed in the
  // middle of the page), at once, not with the site's smooth scroll. After
  // the first one, its heading takes the focus too, so a screen reader hears
  // where it is and Tab starts from there.
  const first = useRef(true);
  useEffect(() => {
    scrollToTop();
    if (first.current) {
      first.current = false;
      return;
    }
    document.querySelector<HTMLElement>(".ve-main h1")?.focus({ preventScroll: true });
  }, [screen]);

  function onContinue(fromKeyboard: boolean) {
    setTried(true);
    const missing = missingRequired(answers);
    if (missing.length) {
      // Quiet until he presses Continue. Then each missing answer turns red,
      // and the page goes to the first one.
      // After the red lines are on the page: they make it taller, and Safari
      // drops a smooth scroll that the page grows under.
      setTimeout(() => {
        requestAnimationFrame(() => {
          const target = document.getElementById(`ve-q-${missing[0]}`);
          const control = document.getElementById(`ve-${missing[0]}`);
          if (fromKeyboard) control?.focus({ preventScroll: true });
          target?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
        });
      }, 0);
      return;
    }
    setRun(null);
    setRange(null);
    setRunNo((n) => n + 1);
    setScreen("working");
  }

  const openTalk = (placement: string) => {
    trackTalkClick({ placement, lang });
    setTalkOpen(true);
  };
  const closeTalk = useCallback(() => setTalkOpen(false), []);

  const done = answeredCount(answers);
  const percent = Math.round((done / REQUIRED_FIELDS.length) * 100);

  return (
    <VCtx.Provider value={{ copy: C, lang }}>
      <div className="ve" lang={lang} dir={dir} data-screen={screen}>
        <header className="ve-topbar">
          <a className="brand" href={lang === "he" ? "/he/" : "/"} aria-label={C.nav.homeAriaLabel}>
            <Lockup markHeight={32} />
          </a>
          <div className="ve-topbar-end">
            {/* Only where no run is live: switching language is a page load. */}
            {HEBREW_VALUATION_LIVE && (screen === "front" || screen === "error") && (
              <nav className="ve-lang" aria-label={C.nav.langAriaLabel}>
                <a href={VALUATION_PATH.en} lang="en" aria-current={lang === "en" ? "true" : undefined}>
                  {C.nav.langEn}
                </a>
                <span className="sep" aria-hidden="true">
                  /
                </span>
                <a href={VALUATION_PATH.he} lang="he" aria-current={lang === "he" ? "true" : undefined}>
                  {C.nav.langHe}
                </a>
              </nav>
            )}
            <button type="button" className="ve-talk" onClick={() => openTalk("nav")}>
              <span>{C.nav.talkToUs}</span>
            </button>
          </div>
        </header>

        <main className="ve-main" id="main">
          {screen === "front" && (
            <>
              {/* The thin line pinned to the top, and its small label at the end:
                  one step per required answer, 0% to 100% (Ben, Oct 2). */}
              <div className="ve-progress-wrap">
                <div
                  className="ve-progress"
                  role="progressbar"
                  aria-label={C.front.progressAriaLabel}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                  aria-valuetext={C.front.progress(percent)}
                >
                  <div className="ve-progress-fill" style={{ width: `${percent}%` }} />
                </div>
                <span className="ve-progress-label" aria-hidden="true">
                  {C.front.progress(percent)}
                </span>
              </div>
              <FrontDoor answers={answers} setAnswers={setAnswers} tried={tried} onContinue={onContinue} />
            </>
          )}
          {screen === "working" && (
            <Working
              runNo={runNo}
              answers={answers}
              lang={lang}
              onDone={(r) => {
                setRun(r);
                setScreen("result");
              }}
              onError={(message) => {
                setErrorMessage(message);
                setScreen("error");
              }}
            />
          )}
          {screen === "result" && run && (
            <Result
              key={run.briefId}
              run={run}
              answers={answers}
              lang={lang}
              contact={contact}
              setContact={setContact}
              onUnlocked={setRange}
            />
          )}
          {screen === "error" && (
            <ErrorScreen
              message={errorMessage}
              onTalk={() => openTalk("error")}
              onRetry={() => {
                setErrorMessage(undefined);
                setScreen("front");
              }}
            />
          )}
        </main>

        {talkOpen && (
          <TalkModal
            onClose={closeTalk}
            run={run}
            answers={answers}
            contact={contact}
            range={range}
          />
        )}
      </div>
    </VCtx.Provider>
  );
}
