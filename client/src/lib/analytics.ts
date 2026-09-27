/**
 * Google Analytics 4 and the Meta Pixel. One file, so there is one place to
 * look when a number in either dashboard looks wrong.
 *
 * Both IDs come from Render, never from this file:
 *   VITE_GA4_MEASUREMENT_ID   the G-XXXXXXX id of the GA4 web stream
 *   VITE_META_PIXEL_ID        the number id of the Meta dataset (the pixel)
 *
 * Vite bakes VITE_ values into the page at build time. So a change to either
 * one in Render needs a fresh deploy to show up, not just a restart.
 *
 * Blank means off. No script tag is added, nothing is sent, and every track
 * call below quietly does nothing. That is the local and preview default.
 *
 * Why the tags are added from code and not pasted into index.html: the old
 * umami tag sat in index.html with a %VITE_...% placeholder, and when the var
 * was missing it shipped the literal placeholder and threw an error on every
 * page. Doing it here means a blank var loads nothing at all.
 *
 * The four events. Each fires in both tools, at the moment it really happens.
 *
 *   What happened               GA4 event          Meta event
 *   Contact form sent (2xx)     contact_submit     Lead (standard)
 *   Valuation run started       valuation_start    ValuationStart (custom)
 *   Valuation result on screen  valuation_done     ValuationDone (custom)
 *   A "talk to us" click        talk_click         Contact (standard)
 *
 * Lead and Contact are Meta's own standard names on purpose. Ads can be told to
 * find more people who do a standard event without any extra setup in Meta.
 *
 * Page views. GA4 counts every page change on its own ("enhanced measurement",
 * on by default in the stream settings). Meta does not, so trackPageView sends
 * Meta a PageView each time the route changes.
 */

type Params = Record<string, string | number | undefined>;

type Gtag = (...args: unknown[]) => void;
type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: unknown;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const GA4_ID = (import.meta.env.VITE_GA4_MEASUREMENT_ID ?? "").trim();
const PIXEL_ID = (import.meta.env.VITE_META_PIXEL_ID ?? "").trim();

// A typo in Render should switch the tag off, not send junk to Google or Meta.
const GA4_ON = /^G-[A-Z0-9]+$/.test(GA4_ID);
const PIXEL_ON = /^\d+$/.test(PIXEL_ID);

let started = false;

function addScript(src: string): void {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

function startGa4(): void {
  window.dataLayer = window.dataLayer || [];
  // Google's own snippet, typed. gtag has to push the arguments object itself,
  // not a copy of it, or GA4 ignores the call.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA4_ID);
  addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_ID)}`);
}

function startPixel(): void {
  // Meta's base code, typed. It queues calls until fbevents.js arrives.
  if (!window.fbq) {
    const n = function (...args: unknown[]) {
      if (n.callMethod) n.callMethod.apply(n, args);
      else n.queue.push(args);
    } as Fbq;
    n.queue = [];
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    window.fbq = n;
    if (!window._fbq) window._fbq = n;
    addScript("https://connect.facebook.net/en_US/fbevents.js");
  }
  window.fbq("init", PIXEL_ID);
  window.fbq("track", "PageView");
}

/** Called once from main.tsx. Safe to call with both vars blank. */
export function initAnalytics(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  try {
    if (GA4_ON) startGa4();
    if (PIXEL_ON) startPixel();
  } catch {
    // An ad blocker or a broken tag must never take the page down with it.
  }
}

// The first route is already counted by init, so skip it here.
let lastPath: string | null = null;

/** Meta PageView on a client-side route change. GA4 does this by itself. */
export function trackPageView(path: string): void {
  if (lastPath === null) {
    lastPath = path;
    return;
  }
  if (path === lastPath) return;
  lastPath = path;
  try {
    if (PIXEL_ON && window.fbq) window.fbq("track", "PageView");
  } catch {
    // never break the page over a counter
  }
}

function send(ga4Name: string, meta: { name: string; standard: boolean }, params: Params): void {
  try {
    if (GA4_ON && window.gtag) window.gtag("event", ga4Name, params);
    if (PIXEL_ON && window.fbq) {
      window.fbq(meta.standard ? "track" : "trackCustom", meta.name, params);
    }
  } catch {
    // never break the page over a counter
  }
}

/** The contact form went through (the server said 2xx). */
export function trackContactSubmit(params: { form: "home" | "valuation"; lang: string }): void {
  send("contact_submit", { name: "Lead", standard: true }, params);
}

/** A valuation run was sent to the engine. */
export function trackValuationStart(params: { lang: string }): void {
  send("valuation_start", { name: "ValuationStart", standard: false }, params);
}

/**
 * The result screen opened. range_variant is "number" when a range is on
 * screen, "by-hand" when the business was too small or too big to price and
 * the page shows the by-hand card instead.
 */
export function trackValuationDone(params: { lang: string; range_variant: string }): void {
  send("valuation_done", { name: "ValuationDone", standard: false }, params);
}

/** Any "talk to us" button. placement says which one. */
export function trackTalkClick(params: { placement: string; lang: string }): void {
  send("talk_click", { name: "Contact", standard: true }, params);
}
