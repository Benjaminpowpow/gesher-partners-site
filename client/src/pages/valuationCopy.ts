/**
 * Every word the valuation estimate says, in one place: the page, the popup,
 * the server's refusals and the page head.
 *
 * Source: site/35-valuation-lead-magnet.md in the vault (Ben, Oct 1 2026).
 * Each key below is the key in that file's tables, word for word. Change the
 * vault file first, then the line here. A line with no key in 35 is marked
 * "From the locked mockup" (site/36-valuation-estimate-mock.html) or "Kept",
 * meaning the live line, not touched.
 *
 * Hebrew is a copy swap, not a rebuild: COPY_V_HE below has the same keys and
 * is handed down the same way the home page does (Home.tsx). Its source is
 * site/39-valuation-hebrew-worksheet.md (Oct 4 2026).
 *
 * This file is imported by the server too (the refusals, the head and the
 * Sheet labels), so it must stay plain data: no React, no browser.
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
 * The EN / עב toggle. On, because the Hebrew tool is live at /he/valuation.
 * Set it to false to hide the toggle.
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

  /* ─── No email to the owner (Ben, Oct 2) ─────────────────────────────── */
  // The owner gets no email at all, so there are no email lines (35, "The
  // email (REMOVED 2026-10-02)"). The two lead emails to office@ are internal
  // English and live in server/routes/valuationEstimate.ts.

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
 * The Hebrew twin (Ben, Oct 3 and 4 2026, reviewed by Joanne). Every line is
 * copied word for word from site/39-valuation-hebrew-worksheet.md: rows 1 to
 * 108 from the column "Claude draft, 2026-10-02", rows 109 to 123 from
 * section O. The row number sits next to each line. Hebrew never changes here
 * first: fix 39, then bring the line across. qa/check-hebrew-copy.mjs checks
 * this table against 39.
 */
const COPY_V_HE: VCopy = {
  nav: {
    homeAriaLabel: "דף הבית של גשר", // 2
    talkToUs: "לשיחת ייעוץ", // 1
    langAriaLabel: "שפה", // 3
    langEn: "EN",
    langHe: "עב",
  },

  front: {
    headline: "ניתוח שווי ראשוני לעסק, ללא עלות", // 4
    progress: (percent: number) => `${percent}% הושלמו`, // 5
    progressAriaLabel: "שאלות שנענו", // 121
    urlLabel: "מה כתובת האתר של החברה?", // 6
    urlPlaceholder: "yourcompany.co.il", // 7
    urlError: "שדה חובה", // 109
    whenLabel: "מתי תרצה למכור?", // 8
    seriousLabel: "עד כמה אתה רציני לגבי המכירה?", // 15
    seriousEnds: { low: "רק מתעניין", high: "מוכן להתחיל" }, // 16
    seriousEmpty: "–",
    seriousNotChosen: "עדיין לא נבחר", // 122
    seriousValueText: (n: number) => `${n} מתוך 10`, // 123
    revenueLabel: "מה היה המחזור בשנה שעברה?", // 17
    profitLabel: "מה היה הרווח לפני מס בשנה שעברה?", // 19
    staffLabel: "כמה עובדים יש בחברה?", // 21
    noteLabel: "יש מידע נוסף שתרצה לשתף?", // 23
    missing: "שדה חובה", // 24
    selectPlaceholder: "בחר", // 9
    contactNote: "הטווח יוצג לך אחרי שתשאיר טלפון או מייל.", // 26
    confidential: "דיסקרטיות מלאה. הנתונים שלך לא יועברו לאף גורם.", // 27
    submit: "המשך", // 25
  },

  // 10 to 14
  timeToSell: {
    now: "מוכן כבר עכשיו",
    "within-1y": "בתוך שנה",
    "1-2y": "שנה עד שנתיים",
    "2-5y": "שנתיים עד 5 שנים",
    exploring: "בשלב בחינה",
  },

  // 18
  revenue: {
    "under-5": "פחות מ-5 מיליון ש״ח",
    "5-10": "5 עד 10 מיליון ש״ח",
    "10-25": "10 עד 25 מיליון ש״ח",
    "25-50": "25 עד 50 מיליון ש״ח",
    "over-50": "מעל 50 מיליון ש״ח",
  },

  // 20
  profit: {
    "under-1": "פחות ממיליון ש״ח",
    "1-2.5": "1 עד 2.5 מיליון ש״ח",
    "2.5-5": "2.5 עד 5 מיליון ש״ח",
    "5-10": "5 עד 10 מיליון ש״ח",
    "over-10": "מעל 10 מיליון ש״ח",
  },

  // 22
  staff: {
    "2-10": "2 עד 10",
    "11-50": "11 עד 50",
    "51-100": "51 עד 100",
    "over-100": "מעל 100",
  },

  // 28
  disclaimer:
    "זהו אומדן, לא הערכת שווי. הוא מבוסס על התשובות שלך, על מידע ציבורי ועל המחירים שקונים משלמים על עסקים דומים. מספר מדויק מחייב את הדוחות הכספיים שלך. אין כאן הצעה, ולא המלצה לקנות או למכור.",

  working: {
    heading: "מכינים את ניתוח השווי", // 29
    sub: "זה לוקח דקה, לפעמים שתיים.", // 30
    stagesAriaLabel: "בנייה של הניתוח", // 116
    longStep: "השלב הזה ארוך יותר מהאחרים.", // 36
    ringAriaLabel: (percent: number) => `${percent} אחוז הושלמו`, // 38
    companyFallbackName: "העסק שלך", // 37
  },

  // 31 to 35
  stages: {
    read: "קוראים את האתר שלך",
    learn: "מנתחים את פעילות העסק",
    market: "מנתחים את השוק",
    value: "מעריכים את שווי העסק",
    range: "מחשבים את טווח השווי",
  },

  // 39 to 41
  taglines: [
    "אנחנו עובדים רק בשבילך, המוכר.",
    "אנחנו מנהלים תהליך תחרותי אמיתי, עם קונים בארץ ובחו״ל.",
    "אנחנו אומרים את האמת, גם כשהאמת היא לחכות שנה.",
  ],

  gate: {
    label: "ניתוח השווי מוכן", // 42
    heading: "צפה בטווח השווי המשוער שלך.", // 43
    sub: "השאר טלפון או מייל, והטווח ייפתח מיד.", // 44
    nameLabel: "השם שלך", // 45
    phoneLabel: "טלפון", // 46
    emailLabel: "מייל", // 47
    errAll: "נא להזין שם, וטלפון או מייל.", // 48
    errName: "נא להזין שם.", // 49
    errReach: "נא להזין טלפון או מייל. אחד מהם מספיק.", // 50
    errPhoneBad: "מספר הטלפון לא שלם. בדוק ונסה שוב.", // 52
    errEmailBad: "כתובת המייל לא שלמה. בדוק ונסה שוב.", // 51
    confidential: "דיסקרטיות מלאה. הפרטים שלך לא יועברו לאף גורם.", // 53
    submit: "הצג את הטווח", // 54
  },

  result: {
    title: (company: string) => `ניתוח שווי ראשוני של ${company}`, // 55
    specialTitle: (company: string) => `ניתוח שווי ראשוני של ${company}`, // 67
    privateLine: "חסוי. מבוסס על התשובות שלך ועל מידע ציבורי. אינו הערכת שווי ואינו הצעה.", // 56
    cardMarket: "שוק", // 57
    cardValue: "שווי", // 58
    cardRange: "טווח השווי המשוער", // 59
    cardSpecial: "ניתוח השווי", // 68
    // 120: no word in Hebrew. The label alone; the icon marks the risk.
    watchLabel: (label: string) => label,
    // 60, the locked shape: "12 עד 28 מיליון ש״ח".
    rangeFigure: (low: string, high: string) => `${low} עד ${high} מיליון ש״ח`,
    rangeLine: "מבוסס על הטווחים שבחרת. הדוחות הכספיים שלך יאפשרו מספר מדויק יותר.", // 61
    ctaLead: "רוצה מספר מדויק יותר? לשיחת ייעוץ.", // 62
    ctaBody: "בשיחה קצרה נעבור על הנתונים האמיתיים ונראה לך מה משפיע על המחיר.", // 63
    scarcity: "אנחנו מלווים מספר מצומצם של מוכרים בכל שנה.", // 65
    callBtn: "לשיחת ייעוץ", // 64
    callDone: "תודה. אופיר או בנימין יחזרו אליך בקרוב.", // 66
    byHandLead: "העסק שלך ראוי לבחינה מעמיקה יותר.", // 71
    byHandBody: "יש עסקים שלא מתאימים לנוסחה מהירה, והעסק שלך הוא אחד מהם. שיחה קצרה תיתן לך מספר אמיתי.", // 72
    bigLead: "בהיקף כזה, הניתוח נעשה באופן אישי.", // 69
    bigBody: "שיחה קצרה עם אופיר או בנימין תיתן לך מספר אמיתי.", // 70
    specialCta: "לשיחת ייעוץ", // 73
    companyAriaLabel: "העסק שלך", // 119
    coRevenue: "מחזור", // 117
    coProfit: "רווח לפני מס", // 118
  },

  error: {
    headingBlocked: "לא עכשיו.", // 115
    headingUnreadable: "לא הצלחנו לקרוא את האתר הזה.", // 74
    subUnreadable: "לפעמים אין באתר מספיק מידע לניתוח. אין בכך בעיה.", // 75
    talkBtn: "לשיחת ייעוץ", // 76
    retryBtn: "נסה כתובת אחרת", // 77
  },

  talk: {
    closeAriaLabel: "סגור", // 113
    sentTitle: "תודה.", // 85
    sentBody: "אנחנו קוראים כל פנייה בעצמנו. אופיר או בנימין יחזרו אליך בקרוב.", // 86
    closeBtn: "סגור", // 84
    title: "לשיחת ייעוץ.", // 78
    subWithRun: "נעבור על הטווח שלך בשיחה.", // 79
    subNoRun: "ספר לנו איפה אתה עומד. נגיד לך בכנות אם נוכל לעזור.", // 80
    nameLabel: "השם שלך", // 81
    reachLabel: "טלפון או מייל", // 82
    messageLabel: "מה חשוב לך שנדע (לא חובה)", // 83
    errName: "נא להזין שם.", // 110
    errReachMissing: "נא להזין טלפון או מייל. אחד מהם מספיק.", // 111
    errEmailBad: "כתובת המייל לא שלמה. בדוק ונסה שוב.", // 112
    sendFailed: "ההודעה לא נשלחה. אפשר לנסות שוב, או לכתוב לנו ישירות: office@gesherpartners.com", // 114
    submit: "שלח", // 84
    sending: "שולח...", // 84
    retry: "נסה שוב", // 84
  },

  server: {
    cooldown: "כבר הרצת ניתוח לפני דקה. נא להמתין רגע ולנסות שוב.", // 103
    overCap: "הגענו למכסת הניתוחים ללא עלות להיום. נסה שוב מחר, או כתוב לנו: office@gesherpartners.com", // 104
    notConfigured: "הניתוח אינו זמין כרגע. כתוב לנו: office@gesherpartners.com", // 105
    busy: "המערכת עמוסה כרגע. נסה שוב בעוד דקה.", // 106
  },

  head: {
    title: "הערכת שווי עסק: מחשבון ראשוני ללא עלות | Gesher Partners", // 107
    description: "חישוב שווי חברה פרטית לפי מכפיל רווח מקובל בענף. לבעלי עסקים שמתכננים למכור. תוך דקה, ללא עלות ובדיסקרטיות.", // 108
  },
};

/** The tables by language. */
export const VALUATION_COPY: Record<VLang, VCopy> = {
  en: COPY_V,
  he: COPY_V_HE,
};

export { COPY_V, COPY_V_HE };

/** Millions, one decimal only when there is one: 6, 10.5, 2.5. */
export function millionsLabel(valueInMillions: number): string {
  const rounded = Math.round(valueInMillions * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** The range figure from two values in millions, in the language's own shape. */
export function rangeFigureText(lowM: number, highM: number, copy: VCopy = COPY_V): string {
  return copy.result.rangeFigure(millionsLabel(lowM), millionsLabel(highM));
}
