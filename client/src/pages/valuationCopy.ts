/**
 * Every word the valuation estimate says, in one place: the page, the popup,
 * the email, the server's refusals and the page head.
 *
 * Source: site/35-valuation-lead-magnet.md in the vault (Ben, Oct 1 2026).
 * Each key below is the key in that file's tables, word for word. Change the
 * vault file first, then the line here. A line with no key in 35 is marked
 * "From the locked mockup" (site/36-valuation-estimate-mock.html) or "Kept",
 * meaning the live line, not touched.
 *
 * The Hebrew pass is a copy swap, not a rebuild. It adds COPY_V_HE: VCopy next
 * to COPY_V and hands it down the same way the home page does (Home.tsx). Until
 * then /he/valuation runs the old tool, untouched, from ValuationLegacy.tsx and
 * valuationCopyLegacy.ts, which the Hebrew pass deletes.
 *
 * This file is imported by the server too (the email, the refusals, the head
 * and the Sheet labels), so it must stay plain data: no React, no browser.
 */
import type {
  ProfitCode,
  RevenueCode,
  StaffCode,
  TimelineCode,
} from "@shared/valuationEstimate";

export type VLang = "en" | "he";

/** The five stages of a run, in order. Ids are signals, labels are words. */
export const WORKING_STAGE_IDS = ["read", "learn", "market", "value", "range"] as const;
export type WorkingStageId = (typeof WORKING_STAGE_IDS)[number];

/**
 * The EN / עב toggle. On, because the Hebrew tool is live at /he/valuation (the
 * old flow until the Hebrew pass). Set it to false to hide the toggle.
 */
export const HEBREW_VALUATION_LIVE: boolean = true;

/** Where each language's valuation page lives. */
export const VALUATION_PATH: Record<VLang, string> = {
  en: "/valuation",
  he: "/he/valuation",
};

const COPY_V = {
  /* ─── The bar at the top ─────────────────────────────────── Kept ──────── */
  nav: {
    homeAriaLabel: "gesher home",
    talkToUs: "Talk to us",
    langAriaLabel: "Language",
    langEn: "EN",
    langHe: "עב",
  },

  /* ─── Screen 1. The front door ───────────────────────────────────────── */
  front: {
    headline: "Free business value estimate",
    // The small label at the end of the progress line (Ben, Oct 2): one step
    // per required answer, 0% to 100%.
    progress: (percent: number) => `${percent}% complete`,
    // The progress line's name for a screen reader. From the locked mockup.
    progressAriaLabel: "Questions answered",
    urlLabel: "What is your company website?",
    urlPlaceholder: "yourcompany.co.il",
    urlError: "Required",
    whenLabel: "When would you like to sell?",
    seriousLabel: "How serious are you about selling?",
    // Under the two ends of the slider: the "1" end, then the "10" end.
    seriousEnds: { low: "Just curious", high: "Ready to start" },
    // The slider before he touches it. From the locked mockup.
    seriousEmpty: "–",
    seriousNotChosen: "Not chosen yet",
    seriousValueText: (n: number) => `${n} out of 10`,
    revenueLabel: "What was your revenue last year?",
    profitLabel: "What was your profit before tax last year?",
    staffLabel: "How many employees do you have?",
    noteLabel: "Is there anything else you would like to share?",
    missing: "Required",
    selectPlaceholder: "Select",
    contactNote: "You will see your range after leaving a phone number or an email.",
    confidential: "100% confidential. We never share your numbers.",
    submit: "Continue",
  },

  timeToSell: {
    now: "Ready now",
    "within-1y": "Within a year",
    "1-2y": "1 to 2 years",
    "2-5y": "2 to 5 years",
    exploring: "Just exploring",
  } as Record<TimelineCode, string>,

  revenue: {
    "under-5": "Under ₪5M",
    "5-10": "₪5M to 10M",
    "10-25": "₪10M to 25M",
    "25-50": "₪25M to 50M",
    "over-50": "Over ₪50M",
  } as Record<RevenueCode, string>,

  profit: {
    "under-1": "Under ₪1M",
    "1-2.5": "₪1M to 2.5M",
    "2.5-5": "₪2.5M to 5M",
    "5-10": "₪5M to 10M",
    "over-10": "Over ₪10M",
  } as Record<ProfitCode, string>,

  staff: {
    "2-10": "2 to 10",
    "11-50": "11 to 50",
    "51-100": "51 to 100",
    "over-100": "Over 100",
  } as Record<StaffCode, string>,

  disclaimer:
    "This is an estimate, not a formal valuation. It is based on your answers, public sources and what buyers pay for similar businesses. A firm number needs your financial statements. Nothing here is an offer, or advice to buy or sell.",

  /* ─── Screen 2. While it works ───────────────────────────────────────── */
  working: {
    heading: "Building your estimate",
    sub: "This takes a minute, sometimes two.",
    // Kept.
    stagesAriaLabel: "Build progress",
    longStep: "This step takes longer than the rest.",
    ringAriaLabel: (percent: number) => `${percent} percent done`,
    companyFallbackName: "Your business",
  },

  stages: {
    read: "Reading your website",
    learn: "Learning about your business",
    market: "Reading your market",
    value: "Working out the value",
    range: "Setting your range",
  } as Record<WorkingStageId, string>,

  /** The rotating italic line under the checklist. Kept. */
  taglines: [
    "We work only for you, the seller.",
    "We run a real competitive process, buyers in Israel and abroad.",
    "We tell you the truth, even when the truth is wait a year.",
  ],

  /* ─── Screen 3a. The popup over the blurred range ────────────────────── */
  gate: {
    label: "YOUR ESTIMATE IS READY",
    heading: "See your estimated value range.",
    sub: "Leave a phone number or an email, and your range opens right away.",
    nameLabel: "Your name",
    phoneLabel: "Phone",
    emailLabel: "Email",
    errAll: "Please add your name, and a phone number or an email.",
    errName: "Please add your name.",
    errReach: "Fill in a phone number or an email. One is enough.",
    // Israeli numbers only (Ben, Oct 2).
    errPhoneBad: "That phone number looks incomplete. Check it and try again.",
    errEmailBad: "That email looks incomplete. Check it and try again.",
    confidential: "100% confidential. We never share your details.",
    submit: "Show my range",
  },

  /* ─── Screen 3b. The result ──────────────────────────────────────────── */
  result: {
    title: (company: string) => `${company}: your estimated value range`,
    specialTitle: (company: string) => `${company}: your value estimate`,
    privateLine:
      "Private. Built from your answers and public sources. Not a formal valuation or an offer.",
    // Kept. The two card headings above the range.
    cardMarket: "Market",
    cardValue: "Value",
    // From the locked mockup: the range card's heading, and the same card's
    // heading on the two no-number cases.
    cardRange: "Your estimated value range",
    cardSpecial: "Your estimate",
    // From the locked mockup ("Watch: few buyers."). The engine tags its one
    // risk "watch:"; the page names it in the label.
    watchLabel: (label: string) => `Watch: ${label}`,
    // The figure. Low and high arrive as millions ("6", "10.5"). The shape is
    // copy, so Hebrew can write its own shape (low, "עד", high, "מיליון ש״ח").
    rangeFigure: (low: string, high: string) => `₪${low}M to ₪${high}M`,
    rangeLine:
      "Based on the bands you chose. Your financial statements are what make it more precise.",
    ctaLead: "Want a more accurate number? Speak with us.",
    ctaBody: "On a short call, we review your real numbers and show what moves the price.",
    scarcity: "We only take on a small number of sellers each year.",
    callBtn: "Talk to us",
    callDone: "Thank you. Ofir or Benjamin will reach out shortly.",
    byHandLead: "Your business deserves a closer look.",
    byHandBody:
      "Some businesses are too specific for a quick formula, and yours is one of them. A short call gives you a real number.",
    bigLead: "At this size, we price by hand.",
    bigBody: "A short call with Ofir or Benjamin gives you a real number.",
    specialCta: "Speak with us.",
    // From the locked mockup: the company card.
    companyAriaLabel: "Your company",
    coRevenue: "Revenue",
    coProfit: "Profit before tax",
  },

  /* ─── When it cannot run ─────────────────────────────────── Kept ──────── */
  error: {
    headingBlocked: "Not right now.",
    headingUnreadable: "We could not read that site.",
    subUnreadable: "Sometimes there is not enough on the site for us to read. That is fine.",
    talkBtn: "Talk to us instead",
    retryBtn: "Try a different URL",
  },

  /* ─── The talk popup behind "Talk to us" in the top bar ──── Kept ─────── */
  talk: {
    closeAriaLabel: "Close",
    sentTitle: "Thank you.",
    // 35: "within two business days" becomes "shortly". Ben, Oct 1.
    sentBody: "We read every note ourselves. Ofir or Benjamin will reach out shortly.",
    closeBtn: "Close",
    title: "Talk to us.",
    subWithRun: "We'll go over your range on the call.",
    subNoRun: "Tell us where you are. We will tell you honestly if we can help.",
    nameLabel: "Your name",
    reachLabel: "Phone or email",
    messageLabel: "What is on your mind (optional)",
    errName: "Please tell us your name.",
    errReachMissing: "Please leave a phone number or an email so we can answer.",
    errEmailBad: "That email looks incomplete. Check it and try again.",
    sendFailed:
      "Your note did not go through. Please try again, or write to us at office@gesherpartners.com.",
    submit: "Send",
    sending: "Sending...",
    retry: "Try again",
  },

  /* ─── The email, only when he left an email ──────────────────────────── */
  email: {
    subject: (company: string) => `${company}: your estimated value range`,
    title: (company: string) => `${company}: your estimated value range`,
    // The two no-number cases have no range, so the subject and title use the
    // page's own title for them (result.specialTitle).
    specialSubject: (company: string) => `${company}: your value estimate`,
    specialTitle: (company: string) => `${company}: your value estimate`,
    greeting: (first: string) =>
      first
        ? `Hello ${first}, here is the estimate you just ran.`
        : "Here is the estimate you just ran.",
    rangeLabel: "Your estimated value range",
    disclaimer:
      "This estimate is based on the bands you chose and on what buyers pay for similar businesses. Your financial statements are what make it more precise.",
    byHandLine: "Your business deserves a closer look.",
    byHandBody:
      "Some businesses are too specific for a quick formula, and yours is one of them.",
    // Over ₪10M profit. The page's own two lines (result.bigLead, bigBody).
    bigLine: "At this size, we price by hand.",
    bigBody: "A short call with Ofir or Benjamin gives you a real number.",
    closeLead: "Want a more accurate number?",
    closeBody:
      "For a more accurate number, we need your financial statements. Reply to this email and we will send you an NDA first. If you would rather talk first, just say so.",
    closeRead: "We read every reply ourselves.",
    fine: "An estimate, not a formal valuation. Not an offer, or advice to buy or sell.",
    // The short note when he presses "Talk to us" and left an email (Ben,
    // Oct 2). Nothing goes if he left only a phone.
    talkSubject: "We got your request",
    talkBody: "We got your request. Ofir or Benjamin will reach out shortly.",
    // Kept from the old letter.
    privateLabel: "Strictly private",
    signName: "Ofir and Benjamin",
    signFirm: "Gesher Partners",
  },

  /* ─── What the server says when it refuses ───────────────────────────── */
  // These come before the popup, so we do not have his details yet. That is
  // why they point to the office address.
  server: {
    cooldown: "You already ran an estimate a minute ago. Please wait a moment and try again.",
    overCap:
      "We have reached today's limit for free estimates. Please try again tomorrow, or write to us at office@gesherpartners.com.",
    notConfigured:
      "The estimate is not available right now. Please write to us at office@gesherpartners.com.",
    busy: "Our system is busy. Please try again in a minute.",
  },

  /* ─── The head, for search ───────────────────────────────────────────── */
  head: {
    title: "Free business valuation estimate | Gesher Partners",
    description:
      "For owners planning to sell. Answer a few short questions and get an estimated value range for your business. Private and free.",
  },
};

export type VCopy = typeof COPY_V;

/**
 * The tables by language. Hebrew joins with the Hebrew pass; until then a
 * Hebrew request falls back to English, which only the server ever asks for.
 */
export const VALUATION_COPY: Record<VLang, VCopy> = {
  en: COPY_V,
  he: COPY_V,
};

export { COPY_V };

/** Millions, one decimal only when there is one: 6, 10.5, 2.5. */
export function millionsLabel(valueInMillions: number): string {
  const rounded = Math.round(valueInMillions * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** The range figure from two values in millions, in the language's own shape. */
export function rangeFigureText(lowM: number, highM: number, copy: VCopy = COPY_V): string {
  return copy.result.rangeFigure(millionsLabel(lowM), millionsLabel(highM));
}
