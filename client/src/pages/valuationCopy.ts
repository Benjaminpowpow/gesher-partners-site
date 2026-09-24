/**
 * Every word the valuation tool says, in one place.
 *
 * Same model as the home page (client/src/pages/Home.tsx): one component, two
 * copy tables, the route picks the language and hands it down through a
 * context. COPY_V is the English that is live today, word for word, moved out
 * of Valuation.tsx and not rewritten. COPY_V_HE is its twin.
 *
 * The rule carried over from the home page: Hebrew never changes in code
 * alone. The vault file is written first, then the line is brought here.
 *
 * Three things deliberately stay English even on the Hebrew page, because they
 * are not read by the owner:
 *   - TIME_TO_SELL_VALUES, the codes that ride in the form and the Sheet.
 *   - The label sent to the server in time_to_sell, so Ben's Sheet column
 *     reads the same on a Hebrew run as on an English one.
 *   - The "NIS 12M" shape sent in revenueBand / profitBand for the lead email.
 */

export type VLang = "en" | "he";

/**
 * The toggle on the valuation page is built and routable, but hidden until the
 * Hebrew words exist. Session C flips this to true and the EN / עב pair
 * appears on both pages. Until then /he/valuation only opens if you type it,
 * which is how Ben tests it.
 */
export const HEBREW_VALUATION_LIVE: boolean = false;

/**
 * The five "when would you want to sell" codes. These are values, not words.
 * They never change with the language; only their labels do.
 */
export const TIME_TO_SELL_VALUES = [
  "under-6m",
  "6-12m",
  "1-2y",
  "over-2y",
  "exploring",
] as const;

export type TimeToSellValue = (typeof TIME_TO_SELL_VALUES)[number];

/** The five stages of a run, in order. Ids are signals, labels are words. */
export const WORKING_STAGE_IDS = [
  "read",
  "learn",
  "market",
  "value",
  "range",
] as const;

export type WorkingStageId = (typeof WORKING_STAGE_IDS)[number];

const COPY_V = {
  /* ─── The bar at the top ──────────────────────────────────────────────── */
  nav: {
    homeAriaLabel: "gesher home",
    talkToUs: "Talk to us",
    langAriaLabel: "Language",
    langEn: "EN",
    langHe: "עב",
  },

  /* ─── Screen 1. The front door ────────────────────────────────────────── */
  front: {
    headline: "Tell us about your business.",
    lede: "Your website is all we need for a first estimate.",
    urlLabel: "Your website",
    urlPlaceholder: "yourcompany.co.il",
    urlError: "We need your website to start.",
    whenLabel: "When would you want to sell",
    whenPlaceholder: "Select...",
    revenueLabel: "Approximate annual revenue (NIS)",
    revenueHint: "e.g. 12M",
    profitLabel: "Approximate annual pre-tax profit (NIS)",
    profitHint: "e.g. 1.5M",
    // What we show back to him under the box, so he can see we read his number
    // the way he meant it before he presses the button.
    echo: (amount: string) => `We read that as ${amount}`,
    confidential: "100% confidential. We never share your numbers.",
    submit: "Get my valuation",
  },

  /** The five sell-timing options, by code. */
  timeToSell: {
    "under-6m": "Within 6 months",
    "6-12m": "6 to 12 months",
    "1-2y": "1 to 2 years",
    "over-2y": "Over 2 years",
    exploring: "Just exploring",
  } as Record<TimeToSellValue, string>,

  /**
   * What "NIS 12M" is called on screen. The number itself is built in
   * Valuation.tsx and always reads left to right.
   */
  money: { prefix: "NIS" },

  /**
   * The line that has to sit under every number this tool produces. It is a
   * read off a website and a couple of figures, not a valuation anyone should
   * sign. Shown on the front door and again under the range.
   */
  disclaimer:
    "This is an estimate, not a valuation. It is built from public information and whatever you tell us here, in a few minutes. A real number needs your financials and a proper look. Nothing here is an offer, or advice to buy or sell.",

  /* ─── Screen 2. While it works ────────────────────────────────────────── */
  working: {
    heading: "Building your valuation",
    sub: "This takes a minute, sometimes two.",
    stagesAriaLabel: "Build progress",
    longStep: "This step takes longer than the rest.",
    ringAriaLabel: (percent: number) => `${percent} percent done`,
    // What the company card says until the engine describes his business back
    // to him, about fifteen seconds in.
    companyReading: "Reading your website.",
    // When the address gives us nothing to make a name out of.
    companyFallbackName: "Your business",
  },

  /** The five stages, by id. */
  stages: {
    read: "Reading your website",
    learn: "Learning your size and your story",
    market: "Reading your market",
    value: "Working out the value",
    range: "Setting your range",
  } as Record<WorkingStageId, string>,

  /** The rotating italic line under the checklist. */
  taglines: [
    "We work only for you, the seller.",
    "We run a real competitive process, buyers in Israel and abroad.",
    "We tell you the truth, even when the truth is wait a year.",
  ],

  /* ─── Screen 3. The result ────────────────────────────────────────────── */
  result: {
    title: (company: string) => `Your ${company} Valuation Snapshot`,
    privateLine:
      "Strictly private. Built from public sources. Not an offer or a valuation opinion.",
    // The three card headings the owner reads. The engine writes "## Market",
    // "## Value" and "## Range and call" in English inside its output; those
    // are markers the page matches on and the owner never sees them.
    cardMarket: "Market",
    cardValue: "Value",
    cardRange: "Your range",
    buyerLine: (types: string) =>
      `There are real buyers for a business like yours: ${types}`,
    trust:
      "We work only for you, the seller. Most of our fee comes only when you sell.",
    talkBtn: "Talk to us",
    briefBtn: "Get the one-page brief",
    byHandLead: "We price your space by hand.",
    byHandBody:
      "Your business is not a cookie cutter case, so we will not throw out a number we cannot stand behind.",
    byHandBtn: "Talk to us",
  },

  /* ─── Screen 4. The one-page brief box ────────────────────────────────── */
  brief: {
    title: "Get your one-page brief",
    sub: "It lands in your inbox in a few seconds.",
    closeAriaLabel: "Close",
    nameLabel: "Your name",
    emailLabel: "Email",
    phoneLabel: "Phone",
    quiet: "100% confidential. We never share your numbers.",
    errName: "Please tell us your name.",
    errEmailMissing: "Please add your email. That is where the brief goes.",
    errEmailBad: "That email looks incomplete. Check it and try again.",
    errPhone: "Please add a phone number.",
    sendFailed:
      "We could not send it. Please try again, or write to us at office@gesherpartners.com and we will send it by hand.",
    submit: "Send",
    sending: "Sending...",
    retry: "Try again",
  },

  /* ─── Screen 5. After he gives his details ───────────────────────────── */
  success: {
    heading: "Thank you. Check your inbox.",
    subWithCompany: (company: string) =>
      `Your ${company} Valuation Snapshot will arrive within a few minutes.`,
    subPlain: "Your Valuation Snapshot will arrive within a few minutes.",
    // The sending domain is new, so some first emails will be filtered. Saying
    // so costs nothing and saves the lead.
    notThere: "Not there? Check spam, or write to ",
    mail: "office@gesherpartners.com",
    notThereEnd: ".",
  },

  /* ─── Screen 6. When it cannot read the site ─────────────────────────── */
  error: {
    // Two different dead ends, two different headings. When the server hands
    // back a sentence (the daily cap, the per-minute limit, a busy engine) it
    // is the truth and it goes on screen as it arrived.
    headingBlocked: "Not right now.",
    headingUnreadable: "We could not read that site.",
    subUnreadable:
      "Sometimes a site is too quiet, or in Hebrew only. That is no problem.",
    talkBtn: "Talk to us instead",
    retryBtn: "Try a different URL",
  },

  /* ─── The talk popup, reachable from every screen ────────────────────── */
  talk: {
    closeAriaLabel: "Close",
    sentTitle: "Thank you.",
    sentBody:
      "We read every note ourselves. You will hear from Ofir or Ben within two business days.",
    closeBtn: "Close",
    title: "Talk to us.",
    subWithRun: "We will bring your range to the call.",
    subNoRun:
      "Tell us where you are. We will tell you honestly if we can help.",
    nameLabel: "Your name",
    reachLabel: "Phone or email",
    messageLabel: "What is on your mind (optional)",
    errName: "Please tell us your name.",
    errReachMissing:
      "Please leave a phone number or an email so we can answer.",
    errEmailBad: "That email looks incomplete. Check it and try again.",
    sendFailed:
      "Your note did not go through. Please try again, or write to us at office@gesherpartners.com.",
    submit: "Send",
    sending: "Sending...",
    retry: "Try again",
  },
};

export type VCopy = typeof COPY_V;

/**
 * English placeholders. Hebrew lands in session C from
 * site/30-hebrew-valuation-copy-ben-picks.md.
 *
 * Every key below is the English string on purpose, so /he/valuation renders
 * and can be checked for layout before a single Hebrew word exists. Session C
 * replaces these by ID from file 30 and deletes this note.
 */
const COPY_V_HE: VCopy = {
  nav: {
    homeAriaLabel: "gesher home",
    talkToUs: "Talk to us",
    langAriaLabel: "Language",
    langEn: "EN",
    langHe: "עב",
  },

  front: {
    headline: "Tell us about your business.",
    lede: "Your website is all we need for a first estimate.",
    urlLabel: "Your website",
    urlPlaceholder: "yourcompany.co.il",
    urlError: "We need your website to start.",
    whenLabel: "When would you want to sell",
    whenPlaceholder: "Select...",
    revenueLabel: "Approximate annual revenue (NIS)",
    revenueHint: "e.g. 12M",
    profitLabel: "Approximate annual pre-tax profit (NIS)",
    profitHint: "e.g. 1.5M",
    echo: (amount: string) => `We read that as ${amount}`,
    confidential: "100% confidential. We never share your numbers.",
    submit: "Get my valuation",
  },

  timeToSell: {
    "under-6m": "Within 6 months",
    "6-12m": "6 to 12 months",
    "1-2y": "1 to 2 years",
    "over-2y": "Over 2 years",
    exploring: "Just exploring",
  },

  money: { prefix: "NIS" },

  disclaimer:
    "This is an estimate, not a valuation. It is built from public information and whatever you tell us here, in a few minutes. A real number needs your financials and a proper look. Nothing here is an offer, or advice to buy or sell.",

  working: {
    heading: "Building your valuation",
    sub: "This takes a minute, sometimes two.",
    stagesAriaLabel: "Build progress",
    longStep: "This step takes longer than the rest.",
    ringAriaLabel: (percent: number) => `${percent} percent done`,
    companyReading: "Reading your website.",
    companyFallbackName: "Your business",
  },

  stages: {
    read: "Reading your website",
    learn: "Learning your size and your story",
    market: "Reading your market",
    value: "Working out the value",
    range: "Setting your range",
  },

  taglines: [
    "We work only for you, the seller.",
    "We run a real competitive process, buyers in Israel and abroad.",
    "We tell you the truth, even when the truth is wait a year.",
  ],

  result: {
    title: (company: string) => `Your ${company} Valuation Snapshot`,
    privateLine:
      "Strictly private. Built from public sources. Not an offer or a valuation opinion.",
    cardMarket: "Market",
    cardValue: "Value",
    cardRange: "Your range",
    buyerLine: (types: string) =>
      `There are real buyers for a business like yours: ${types}`,
    trust:
      "We work only for you, the seller. Most of our fee comes only when you sell.",
    talkBtn: "Talk to us",
    briefBtn: "Get the one-page brief",
    byHandLead: "We price your space by hand.",
    byHandBody:
      "Your business is not a cookie cutter case, so we will not throw out a number we cannot stand behind.",
    byHandBtn: "Talk to us",
  },

  brief: {
    title: "Get your one-page brief",
    sub: "It lands in your inbox in a few seconds.",
    closeAriaLabel: "Close",
    nameLabel: "Your name",
    emailLabel: "Email",
    phoneLabel: "Phone",
    quiet: "100% confidential. We never share your numbers.",
    errName: "Please tell us your name.",
    errEmailMissing: "Please add your email. That is where the brief goes.",
    errEmailBad: "That email looks incomplete. Check it and try again.",
    errPhone: "Please add a phone number.",
    sendFailed:
      "We could not send it. Please try again, or write to us at office@gesherpartners.com and we will send it by hand.",
    submit: "Send",
    sending: "Sending...",
    retry: "Try again",
  },

  success: {
    heading: "Thank you. Check your inbox.",
    subWithCompany: (company: string) =>
      `Your ${company} Valuation Snapshot will arrive within a few minutes.`,
    subPlain: "Your Valuation Snapshot will arrive within a few minutes.",
    notThere: "Not there? Check spam, or write to ",
    mail: "office@gesherpartners.com",
    notThereEnd: ".",
  },

  error: {
    headingBlocked: "Not right now.",
    headingUnreadable: "We could not read that site.",
    subUnreadable:
      "Sometimes a site is too quiet, or in Hebrew only. That is no problem.",
    talkBtn: "Talk to us instead",
    retryBtn: "Try a different URL",
  },

  talk: {
    closeAriaLabel: "Close",
    sentTitle: "Thank you.",
    sentBody:
      "We read every note ourselves. You will hear from Ofir or Ben within two business days.",
    closeBtn: "Close",
    title: "Talk to us.",
    subWithRun: "We will bring your range to the call.",
    subNoRun:
      "Tell us where you are. We will tell you honestly if we can help.",
    nameLabel: "Your name",
    reachLabel: "Phone or email",
    messageLabel: "What is on your mind (optional)",
    errName: "Please tell us your name.",
    errReachMissing:
      "Please leave a phone number or an email so we can answer.",
    errEmailBad: "That email looks incomplete. Check it and try again.",
    sendFailed:
      "Your note did not go through. Please try again, or write to us at office@gesherpartners.com.",
    submit: "Send",
    sending: "Sending...",
    retry: "Try again",
  },
};

export const VALUATION_COPY: Record<VLang, VCopy> = {
  en: COPY_V,
  he: COPY_V_HE,
};

/** The English copy on its own, for the strings that must not translate. */
export { COPY_V };

/** Where each language's valuation page lives. */
export const VALUATION_PATH: Record<VLang, string> = {
  en: "/valuation",
  he: "/he/valuation",
};

/**
 * The other language's address for this page, carrying ?site= across so a man
 * who arrived from the hero does not have to type his website again.
 */
export function otherLangHref(lang: VLang, search: string): string {
  const other: VLang = lang === "he" ? "en" : "he";
  let site = "";
  try {
    site = new URLSearchParams(search).get("site") ?? "";
  } catch {
    site = "";
  }
  return site
    ? `${VALUATION_PATH[other]}?site=${encodeURIComponent(site)}`
    : VALUATION_PATH[other];
}
