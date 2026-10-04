/**
 * Home: the Gesher homepage.
 *
 * October redesign (vault: PROJECTS/israel-ai-investment-bank/site/
 * 39-homepage-redesign-build-kickoff.md, approved by Ben on 2026-10-03; the
 * look is 38-homepage-redesign-mock.html). File 39 holds every English line
 * with its key and wins over the mock. The v4 port before it came from
 * 14-homepage-mock-v4-locked.md and 17-homepage-final-copy.md.
 *
 * Section order: nav, hero, proof strip, logo strip, why Gesher, our process,
 * the team, sectors, questions, contact, footer. The challenge, why this
 * works and the old navy band went in the redesign; the chart lives on in why
 * Gesher, and the band's job moved into its closing band.
 *
 * The hero keeps the live video and cream wash. Only the words and the
 * estimate card changed.
 *
 * All styling lives in home.css, scoped under .gesher so the generic class
 * names never bleed into other routes.
 *
 * HEBREW. One Home component, two copy tables, same keys: COPY (English) and
 * COPY_HE. / renders it in English, /he/ in Hebrew, right to left (Oct 4,
 * site/40). The v4 page that /he/ ran until then is deleted.
 *
 * The Hebrew comes from the vault: file 23 (23-hebrew-copy-ben-picks.md) for
 * the lines the redesign kept, file 40 (40-homepage-hebrew-worksheet.md,
 * section L1 wins) for the rest. Never edit Hebrew here first: change the
 * vault file, then bring the line back.
 */
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { FAQ_ITEMS, FAQ_ITEMS_HE } from "@shared/faq";
import { Lockup as BrandLockup } from "@/components/Lockup";
import { trackContactSubmit, trackTalkClick } from "@/lib/analytics";
import "./home.css";

/* ─── Copy ────────────────────────────────────────────────────────────────── */

type Lang = "en" | "he";

type FooterLink =
  | { kind: "anchor"; id: string; label: string }
  | { kind: "route"; href: string; label: string };

// Keys follow site/39. Where a slot already had a key before the redesign it
// kept that key and only the words changed (hero.lede is 39's hero.sub,
// process is 39's how). The full 39-to-code map is in the pull request.
const COPY = {
  nav: {
    homeAriaLabel: "gesher home",
    primaryAriaLabel: "Primary",
    tagline: "Your sell-side advisor",
    menuAriaLabel: "Menu",
    closeAriaLabel: "Close menu",
    talkToUs: "Talk to us",
    links: [
      { id: "why", label: "Why Gesher" },
      { id: "founders", label: "Founders" },
      { id: "sectors", label: "Sectors" },
      { id: "faq", label: "Questions" },
    ],
    // Phone menu only. Opens the valuation estimate.
    menuEstimate: "Get your free estimate",
  },
  hero: {
    eyebrow: "For private and family businesses · 5-50M NIS",
    // Ben, Oct 1. The old line, "Get the most out of your life's work.", is
    // kept in site/39 as the backup for a future A/B test, not here.
    headlineLead: "You built something great. We help you",
    headlineEmph: "sell it right.",
    headlineTrail: "",
    lede: "More buyers. More options. Your terms.",
    // The estimate card. The words match the valuation tool's own front door
    // (site/35, front.headline and front.urlPlaceholder).
    estLabel: "Free business value estimate",
    // Screen readers only, never drawn: the name of the website box.
    valuationLabel: "Your business website",
    valuationPlaceholder: "yourcompany.co.il",
    estButton: "Get estimate",
    estNote: "A few short questions. 100% confidential.",
  },
  proof: [
    { value: "40+", unit: "years", label: "Advising business owners" },
    { value: "20+", unit: "companies", label: "Built and sold" },
    { value: "12", unit: "sectors", label: "Where we have worked" },
  ],
  logos: {
    label: "Track record · Where we have built and advised",
    items: [
      { src: "/brand/logos/kpmg.svg", alt: "KPMG", tall: false },
      { src: "/brand/logos/jfrog.svg", alt: "JFrog", tall: false },
      { src: "/brand/logos/spacenter.svg", alt: "Spacenter", tall: false },
      { src: "/brand/logos/metro-group.png", alt: "Metro Group", tall: true },
      { src: "/brand/logos/ptravel.webp", alt: "P Travel", tall: false },
      { src: "/brand/logos/milgam.png", alt: "Milgam", tall: false },
      { src: "/brand/logos/financepond.png", alt: "FinancePond", tall: false },
    ],
  },
  // Why Gesher. Four points on Hormozi's value equation, then the band.
  why: {
    heading: "Why Gesher",
    p1: {
      // Ben, Oct 4 (site/40 L1): the title repeats the hero line, and the body
      // is the chart's own description.
      title: "More buyers. More options. Your terms.",
      body: "As more buyers compete, the price offered goes up. The gap between one offer and the top offer is yours.",
    },
    p2: {
      title: "Senior professionals with you every step of the way.",
      body: "40 years advising owners. We lead every negotiation.",
      nameOfir: "Ofir",
      nameBen: "Benjamin",
    },
    p3: {
      title: "Financials built for buyers.",
      body: "We rebuild your numbers the way a buyer reads them.",
      today: "Today",
      buyerReady: "Buyer-ready",
    },
    p4: {
      title: "You keep running your business.",
      body: "Our team leads the process.",
      you: "You",
      yourBusiness: "Running your business",
      gesher: "Gesher",
      yourSale: "Running your sale",
    },
    bandLabel: "By design",
    bandTitle: "We take on only a few sellers a year.",
    bandBody: "If now is not your time, we will tell you.",
    bandCta: "Get your free estimate",
  },
  // The chart in point 1. No numbers on it, on purpose.
  chart: {
    priceLabel: "Price offered",
    oneOffer: "One offer",
    gap: "The gap is yours",
    buyerOne: "1 buyer",
    buyerMany: "{n} buyers",
    // Screen readers only. The mock's own description of the chart.
    alt: "As more buyers compete, the price offered goes up. The gap between one offer and the top offer is yours.",
  },
  // Our process (site/39 "How it works", key how.*). The section id stays
  // "how" so old links to /#how still land here.
  process: {
    // Ben, Oct 3: "Our process". 39 had "How it works"; the live page said
    // "The process".
    eyebrow: "Our process",
    heading: "Three steps to a sale.",
    step: "Step {n}",
    youGet: "You get",
    steps: [
      {
        id: 1,
        title: "Know your number",
        body: "We value your business and find what raises the price.",
        outcome: "A real range and a plan.",
      },
      {
        id: 2,
        title: "Buyers compete",
        body: "Screened buyers bid on one deadline.",
        outcome: "Offers side by side.",
      },
      {
        id: 3,
        title: "Close",
        body: "We negotiate and close for you.",
        outcome: "The deal done.",
      },
    ],
    note: "No buyer is contacted without your approval.",
  },
  team: {
    eyebrow: "The team",
    heading: "Built by people who have been on your side of the table.",
    people: [
      {
        photo: "/founders/gesher_ofir_final.jpg",
        name: "Ofir Ben Haim, CPA",
        role: "Managing partner",
        // Ben's line, Sep 17. The old bio claimed experience without naming a
        // deal. This names two, and the CPA firm, which is what a 60-year-old
        // owner actually weighs before he picks up the phone.
        bio: "40 years advising Israeli business owners. Led the sale of more than 20 companies, including Metropoli-net to Milgam and Alpha CSP to Malam. Founded and sold his own CPA firm, OB&H.",
      },
      {
        photo: "/founders/gesher_ben_final.jpg",
        name: "Benjamin Aronson",
        role: "Managing partner",
        bio: "Founded and sold his own company. Grew a business line from zero to $4.9M in yearly revenue in 12 months. Started in M&A at KPMG Israel.",
      },
    ],
    coda: "We know what it feels like to sell something you built over years.",
  },
  sectors: {
    eyebrow: "Sectors",
    heading: "Private and family businesses in 12 sectors.",
    lede: "Low-tech and high-tech. The buyer changes by sector. The process does not.",
    items: [
      { icon: "factory", name: "Manufacturing", sub: "Metal, plastics, packaging" },
      { icon: "box", name: "Import & distribution", sub: "Importers, wholesalers, dealers" },
      { icon: "shop", name: "Trade & services", sub: "Retail, B2B trade, maintenance" },
      { icon: "fork", name: "Food & restaurants", sub: "Producers, traders, chains" },
      { icon: "house", name: "Construction & real estate", sub: "Contractors, building materials, developers" },
      { icon: "bridge", name: "Infrastructure", sub: "Civil works, utilities, subcontractors" },
      { icon: "truck", name: "Transport & vehicles", sub: "Fleets, haulage, garages" },
      { icon: "screen", name: "Technology & software", sub: "ERP, vertical software, IT services" },
      { icon: "heart", name: "Healthcare", sub: "Clinics, medical supply, optics" },
      { icon: "case", name: "Professional practices", sub: "Accounting, dental, engineering" },
      { icon: "umbrella", name: "Insurance agencies", sub: "Agencies and portfolios" },
      { icon: "plane", name: "Tourism & hospitality", sub: "Travel, hotels, leisure" },
    ],
  },
  faq: {
    eyebrow: "Questions owners ask",
    heading: "Straight answers.",
  },
  contact: {
    eyebrow: "Get in touch",
    heading: "Start with a conversation.",
    lede: "Tell us where you are. We will tell you honestly whether we can help.",
    win: "When you win, we win.",
    orEmail: "Or email",
    emailAddress: "office@gesherpartners.com",
    labels: {
      name: "Name",
      reach: "Phone or email",
      // Required, because a lead without a website is a lead nobody can look
      // at before the call. Ben's call, Sep 17.
      website: "Your website",
      revenue: "Annual revenue",
      message: "Anything you want us to know",
    },
    placeholders: {
      name: "Your name",
      reach: "How to reach you",
      website: "yourcompany.co.il",
      revenue: "e.g. 12M",
      message: "Optional",
    },
    send: "Send",
    sending: "Sending",
    // Sits above the form when he has just run a valuation. He sees what is
    // being attached before he sends it, so nothing travels behind his back.
    // Shown only when the server says the note did not go out. An owner who
    // trusts a thank-you card that lied has no reason to write twice.
    sendFailed:
      "Your note did not go through. Please try again, or write to us at office@gesherpartners.com.",
    thanksHeading: "Thank you.",
    thanksBody:
      "We read every note ourselves. You will hear from Ofir or Ben within two business days.",
  },
  footer: {
    ariaLabel: "Footer",
    disclaimer:
      "Gesher Partners is not a licensed investment advisor. Nothing on this site constitutes investment advice or a solicitation to buy or sell any security.",
    links: [
      { kind: "anchor", id: "how", label: "How it works" },
      { kind: "anchor", id: "sectors", label: "Sectors" },
      { kind: "anchor", id: "founders", label: "Founders" },
      { kind: "anchor", id: "faq", label: "Questions" },
      { kind: "route", href: "/valuation", label: "Quick valuation" },
      { kind: "route", href: "/privacy", label: "Privacy" },
      { kind: "route", href: "/terms", label: "Terms" },
    ] as FooterLink[],
  },
};

type Copy = typeof COPY;

/**
 * The Hebrew table for the redesign. Same keys as COPY, element for element.
 *
 * Lines that did not change in the redesign keep their Hebrew from file 23,
 * verbatim. Every new or changed line is Ben's final pick in file 40 (Oct 4),
 * pasted verbatim.
 *
 * Decided to stay in English on the Hebrew page: the tagline under the logo
 * and the company and partner logos.
 */
const COPY_HE: Copy = {
  nav: {
    homeAriaLabel: "דף הבית של גשר",
    primaryAriaLabel: "ניווט ראשי",
    tagline: "Your sell-side advisor",
    menuAriaLabel: "תפריט",
    closeAriaLabel: "סגור תפריט",
    talkToUs: "לשיחת ייעוץ",
    links: [
      { id: "why", label: "למה גשר" },
      { id: "founders", label: "הצוות" },
      { id: "sectors", label: "ענפים" },
      { id: "faq", label: "שאלות ותשובות" },
    ],
    menuEstimate: "לניתוח שווי ראשוני ללא עלות",
  },
  hero: {
    eyebrow: "עסקים פרטיים ומשפחתיים · מחזור 5 עד 50 מיליון ש״ח",
    // The colour sits on headlineEmph.
    headlineLead: "בנית עסק מצליח. אנחנו נעזור לך",
    headlineEmph: "למכור אותו נכון.",
    headlineTrail: "",
    lede: "יותר קונים. יותר אפשרויות. בתנאים שלך.",
    // The valuation tool's own front door, word for word.
    estLabel: "ניתוח שווי ראשוני לעסק, ללא עלות",
    valuationLabel: "אתר העסק שלך",
    // A domain reads the same in both languages.
    valuationPlaceholder: "yourcompany.co.il",
    estButton: "התחל",
    estNote: "כמה שאלות קצרות. דיסקרטיות מלאה.",
  },
  // "40+" on purpose (Ofir, Sep 30): in a right-to-left line it shows as +40,
  // the plus on the left of the number. The old string "+40" put it on the
  // right.
  proof: [
    { value: "40+", unit: "שנה", label: "ליווי בעלי עסקים" },
    { value: "20+", unit: "חברות", label: "נמכרו. חלקן שלנו." },
    { value: "12", unit: "ענפים", label: "שבהם ליווינו" },
  ],
  logos: {
    label: "ניסיון מוכח · חברות שהקמנו וליווינו",
    items: COPY.logos.items,
  },
  why: {
    heading: "למה גשר",
    p1: {
      title: "יותר קונים. יותר אפשרויות. בתנאים שלך.",
      body: "ככל שיותר קונים מתחרים, המחיר המוצע עולה. הפער בין הצעה אחת להצעה הגבוהה ביותר הוא שלך.",
    },
    p2: {
      title: "אנשי מקצוע בכירים לצידך, לאורך כל הדרך.",
      body: "40 שנה של ליווי בעלי עסקים. אנחנו מובילים כל משא ומתן.",
      nameOfir: "אופיר",
      nameBen: "בנימין",
    },
    p3: {
      // Ben, Oct 4: the Hebrew says more than the English here, on purpose.
      title: "דוחות כספיים מותאמים לקונים, לא למס הכנסה.",
      body: "אנחנו מתאימים את המספרים שלך לאופן שבו קונה קורא אותם.",
      today: "היום",
      buyerReady: "מוכן לקונה",
    },
    p4: {
      title: "אתה ממשיך לנהל את העסק.",
      body: "הצוות שלנו מוביל את תהליך המכירה.",
      you: "אתה",
      yourBusiness: "ממשיך לנהל את העסק",
      // The firm is אנחנו in Hebrew, not the name.
      gesher: "אנחנו",
      yourSale: "מנהלים את תהליך המכירה",
    },
    bandLabel: "מתוך בחירה",
    bandTitle: "אנחנו מלווים מספר מצומצם של מוכרים בכל שנה.",
    bandBody: "אם זה לא הזמן הנכון למכור, נגיד לך.",
    bandCta: "לניתוח שווי ראשוני ללא עלות",
  },
  // buyerMany keeps "{n}" for the number of buyers.
  chart: {
    priceLabel: "המחיר המוצע",
    oneOffer: "הצעה אחת",
    gap: "הפער שלך",
    buyerOne: "קונה אחד",
    buyerMany: "{n} קונים",
    alt: "ככל שיותר קונים מתחרים, המחיר המוצע עולה. הפער בין הצעה אחת להצעה הגבוהה ביותר הוא שלך.",
  },
  process: {
    eyebrow: "התהליך שלנו",
    heading: "שלושה שלבים עד למכירה.",
    // Keeps "{n}" for the step number.
    step: "שלב {n}",
    youGet: "אתה מקבל",
    steps: [
      {
        id: 1,
        title: "שווי העסק",
        body: "אנחנו מעריכים את שווי העסק ומוצאים מה מעלה את המחיר.",
        outcome: "טווח שווי אמיתי ותוכנית מכירה.",
      },
      {
        id: 2,
        // Same words as before, so the old road label carries over.
        title: "תחרות בין קונים",
        body: "קונים שעברו את הסינון שלנו מגישים הצעות עד תאריך אחד.",
        outcome: "השוואת הצעות, זו לצד זו.",
      },
      {
        id: 3,
        title: "סגירה",
        body: "אנחנו מנהלים את המשא ומתן וסוגרים בשבילך.",
        outcome: "העסקה סגורה.",
      },
    ],
    note: "אנחנו לא פונים לאף קונה בלי האישור שלך.",
  },
  team: {
    eyebrow: "הצוות",
    heading: "צוות שכבר היה בנעליים שלך.",
    people: [
      {
        photo: "/founders/gesher_ofir_final.jpg",
        name: "רו״ח אופיר בן חיים",
        role: "שותף מנהל",
        // Hebrew from Ben, Sep 17, pasted verbatim.
        bio: "מעל 40 שנה מלווה בעלי עסקים בישראל. ניהל את מכירתן של יותר מ-20 חברות, בהן מטרופולינט למילגם ואלפא CSP למלם. הקים ומכר את משרד רואי החשבון שלו, OB&H.",
      },
      {
        photo: "/founders/gesher_ben_final.jpg",
        name: "בנימין ארונסון",
        role: "שותף מנהל",
        bio: "הקים ומכר חברה משלו. הצמיח תחום פעילות מאפס ל-4.9 מיליון דולר הכנסות בשנה תוך 12 חודשים. התחיל את דרכו במיזוגים ורכישות ב-KPMG ישראל.",
      },
    ],
    coda: "אנחנו יודעים איך זה מרגיש למכור משהו שבנית במשך שנים.",
  },
  sectors: {
    eyebrow: "ענפים",
    heading: "עסקים פרטיים ומשפחתיים ב-12 ענפים.",
    lede: "תעשייה מסורתית והייטק. הקונה משתנה מענף לענף. התהליך לא.",
    items: [
      { icon: "factory", name: "תעשייה", sub: "מתכת, פלסטיק, אריזות" },
      { icon: "box", name: "יבוא והפצה", sub: "יבואנים, סיטונאים, משווקים" },
      { icon: "shop", name: "מסחר ושירותים", sub: "קמעונאות, מסחר B2B, שירותי תחזוקה" },
      { icon: "fork", name: "מזון ומסעדנות", sub: "יצרנים, מפיצים, רשתות" },
      { icon: "house", name: "בנייה ונדל״ן", sub: "קבלנים, חומרי בניין, יזמים" },
      { icon: "bridge", name: "תשתיות", sub: "הנדסה אזרחית, חשמל ומים, קבלני משנה" },
      { icon: "truck", name: "תחבורה ורכב", sub: "ציי רכב, הובלות, מוסכים" },
      { icon: "screen", name: "טכנולוגיה ותוכנה", sub: "ERP, תוכנה ענפית, שירותי IT" },
      { icon: "heart", name: "בריאות", sub: "מרפאות, ציוד רפואי, אופטיקה" },
      { icon: "case", name: "מקצועות חופשיים", sub: "ראיית חשבון, רפואת שיניים, הנדסה" },
      { icon: "umbrella", name: "סוכנויות ביטוח", sub: "סוכנויות ותיקי ביטוח" },
      { icon: "plane", name: "תיירות ואירוח", sub: "סוכנויות נסיעות, מלונאות, פנאי" },
    ],
  },
  faq: {
    // Ben, Oct 4: the search words owners type (site/40 L1).
    eyebrow: "שאלות על מכירת עסק",
    heading: "תשובות ישירות.",
  },
  contact: {
    eyebrow: "צור קשר",
    heading: "נתחיל בשיחה.",
    lede: "ספר לנו איפה אתה עומד. נגיד לך בכנות אם נוכל לעזור.",
    win: "כשאתה מרוויח, אנחנו מרוויחים.",
    orEmail: "או במייל",
    emailAddress: "office@gesherpartners.com",
    labels: {
      name: "שם",
      reach: "טלפון או מייל",
      // Hebrew from Ben, Sep 17, pasted verbatim.
      website: "האתר שלך",
      revenue: "מחזור שנתי",
      message: "משהו שתרצה שנדע",
    },
    placeholders: {
      name: "השם שלך",
      reach: "איך אפשר לחזור אליך",
      // A domain reads the same in both languages, so no new Hebrew is needed.
      website: "yourcompany.co.il",
      // Was "בחר טווח" (select a range) when this was a dropdown. It is a box
      // he types into now. Words, no ₪ (site/40, Oct 4).
      revenue: "לדוגמה: 12 מיליון",
      message: "לא חובה",
    },
    send: "שלח",
    // Hebrew, Sep 17. Ben waived the English-only rule for this one word, so it
    // is the one line here he did not hand over himself. Flag it for Ofir.
    sending: "שולח",
    // Hebrew, approved by Ben on 2026-09-16, pasted verbatim. Ofir still sees it
    // in his review of the whole page.
    sendFailed:
      "ההודעה לא נשלחה. אפשר לנסות שוב, או לכתוב לנו ישירות: office@gesherpartners.com",
    // Hebrew, given by Ben on 2026-09-17, pasted verbatim. Until this landed the
    // thank-you card on /he/ answered a Hebrew form in English.
    thanksHeading: "תודה.",
    thanksBody:
      "אנחנו קוראים כל פנייה בעצמנו. אופיר או בנימין יחזרו אליך תוך שני ימי עסקים.",
  },
  footer: {
    ariaLabel: "תחתית העמוד",
    disclaimer:
      "Gesher Partners אינה יועץ השקעות מורשה. אין באתר הזה ייעוץ השקעות, ולא הצעה לקנות או למכור נייר ערך כלשהו.",
    // The valuation tool has a Hebrew twin since Sep 24. Privacy and terms
    // exist in English only, so those links go to the English pages.
    links: [
      { kind: "anchor", id: "how", label: "התהליך" },
      { kind: "anchor", id: "sectors", label: "ענפים" },
      { kind: "anchor", id: "founders", label: "הצוות" },
      { kind: "anchor", id: "faq", label: "שאלות ותשובות" },
      { kind: "route", href: "/he/valuation", label: "ניתוח שווי ראשוני" },
      { kind: "route", href: "/privacy", label: "פרטיות" },
      { kind: "route", href: "/terms", label: "תנאי שימוש" },
    ] as FooterLink[],
  },
};

const HOME_COPY: Record<Lang, Copy> = { en: COPY, he: COPY_HE };

/* ─── Language plumbing ───────────────────────────────────────────────────── */

const CopyContext = createContext<{ copy: Copy; lang: Lang }>({ copy: COPY, lang: "en" });
const useCopy = () => useContext(CopyContext);

// The language switch. "EN / עב", both always visible, the active one bold
// navy. Real anchors, not client-side routes, so the server sends the right
// per-language head with the new page. No automatic redirect by browser
// language anywhere on the site: this switch is the only way across.
function LangSwitch({ className = "" }: { className?: string }) {
  const { lang } = useCopy();
  const isHe = lang === "he";
  return (
    <div className={`lang-switch ${className}`.trim()} role="group" aria-label="Language">
      <a href="/" lang="en" className={isHe ? undefined : "lang-on"} aria-current={isHe ? undefined : "true"}>
        EN
      </a>
      <span className="lang-sep" aria-hidden="true">
        /
      </span>
      <a href="/he/" lang="he" className={isHe ? "lang-on" : undefined} aria-current={isHe ? "true" : undefined}>
        עב
      </a>
    </div>
  );
}

/* ─── Media ───────────────────────────────────────────────────────────────── */

// HERO MEDIA (2026-09-07): the file lives in this repo at client/public/hero/,
// not in someone else's storage bucket. Set HERO_VIDEO to "" to render no
// <video> at all.
const HERO_VIDEO: string = "/hero/hero.mp4";
const HERO_POSTER: string | undefined = "/hero/hero-poster.jpg";

// WHY GESHER, POINT 2: the founders in two arched frames. site/39 offered two
// looks; Ben picked the studio photos cropped into the arches as they are
// (option A, Oct 3) over cutouts on the card's cream. These are 400px copies
// made for the arches; the originals the team section uses are untouched.
const FOUNDER_ARCH_PHOTOS = {
  ofir: "/founders/gesher_ofir_arch.jpg",
  ben: "/founders/gesher_ben_arch.jpg",
};

/* ─── Small pieces ────────────────────────────────────────────────────────── */

function Lines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line, i) => (
        <span key={i} style={{ display: "block" }}>
          {line}
        </span>
      ))}
    </>
  );
}

type ButtonProps = {
  variant?: "primary" | "outline" | "cream" | "on-navy";
  size?: "sm" | "md" | "lg";
  arrow?: boolean;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

function Button({ variant = "primary", size = "md", children, arrow = false, ...rest }: ButtonProps) {
  const cls = [
    "btn",
    variant === "primary" ? "btn-primary" : "",
    variant === "outline" ? "btn-outline" : "",
    variant === "on-navy" ? "btn-on-navy" : "",
    variant === "cream" ? "btn-outline btn-cream" : "",
    size === "sm" ? "btn-sm" : "",
    size === "lg" ? "btn-lg" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} {...rest}>
      {children}
      {arrow && (
        <svg className="arrow" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M1 7h12M8 2l5 5-5 5" />
        </svg>
      )}
    </button>
  );
}

// The lockup: mark, wordmark, and the line under it. One piece, used in the
// nav, the mobile menu and the footer. The shape moved to components/Lockup.tsx
// so the valuation page shows the same thing. This wrapper only feeds it the
// tagline from whichever copy table the page is running.
function Lockup({ markHeight = 34 }: { markHeight?: number }) {
  const { copy: C } = useCopy();
  return <BrandLockup markHeight={markHeight} tagline={C.nav.tagline} />;
}

// Thin-line sector icons. Navy, 1.4 stroke, no fill. Same set as the mockup.
const SECTOR_ICONS: Record<string, React.ReactNode> = {
  factory: (
    <>
      <path d="M3 21V10l6 4V10l6 4V10l6 4v7H3z" />
      <path d="M6 17h2M11 17h2M16 17h2" />
    </>
  ),
  box: (
    <>
      <path d="M3 8l9-4 9 4v9l-9 4-9-4z" />
      <path d="M3 8l9 4 9-4M12 12v9" />
    </>
  ),
  shop: (
    <>
      <path d="M4 10l1-5h14l1 5" />
      <path d="M4 10a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" />
      <path d="M5 12v8h14v-8M10 20v-5h4v5" />
    </>
  ),
  fork: <path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2-3 5v3h3v10M17 3v8" />,
  house: (
    <>
      <path d="M3 21h18M5 21V8l7-5 7 5v13" />
      <path d="M9 21v-6h6v6M9 11h2M13 11h2" />
    </>
  ),
  bridge: (
    <>
      <path d="M2 17h20M4 17V9M20 17V9M4 9c4-4 12-4 16 0" />
      <path d="M8 17v-6M12 17v-7M16 17v-6" />
    </>
  ),
  truck: (
    <>
      <path d="M2 7h12v9H2zM14 10h4l3 3v3h-7" />
      <circle cx="6" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </>
  ),
  screen: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1" />
      <path d="M8 20h8M12 16v4M8 10l2 2-2 2M12 14h4" />
    </>
  ),
  heart: (
    <>
      <path d="M12 21s-7-5-7-11a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 6-7 11-7 11z" />
      <path d="M12 8v6M9 11h6" />
    </>
  ),
  case: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="1" />
      <path d="M9 7V4h6v3M3 12h18M12 11v3" />
    </>
  ),
  umbrella: (
    <>
      <path d="M12 21v-9M4 12a8 8 0 0 1 16 0z" />
      <path d="M12 21a2 2 0 0 0 4 0" />
    </>
  ),
  plane: (
    <>
      <path d="M3 20h18" />
      <path d="M4 16l6-2 3-9 2 1-2 8 5-1 1 2-14 4z" />
    </>
  ),
};

/* ─── Nav ─────────────────────────────────────────────────────────────────── */

// Jump to a section on this page. The section's scroll-margin-top (home.css)
// keeps its heading clear of the sticky menu, and the html element's
// scroll-behavior decides smooth or instant (instant under reduce motion).
function jumpTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ block: "start" });
}

// The valuation estimate, in the page's own language.
function estimateHref(lang: Lang) {
  return lang === "he" ? "/he/valuation" : "/valuation";
}

// linkBase is "" on the home page, so the links are plain "#why" jumps. On any
// other page that wears this nav (the legal pages, through SiteShell below) it
// is "/", so the same links become "/#why" and load the home page at that
// section.
//
// Desktop is the v4 menu as it was, with "Why Gesher" in the first slot. Under
// 900px the links fold into the hamburger. Its sheet is the v4 sheet: the four
// links, then "Get your free estimate" (navy, the one solid button), "Talk to
// us" (cream with a navy outline, Ben's call on Oct 3) and EN / עב.
function Nav({ onTalk, linkBase = "" }: { onTalk: () => void; linkBase?: string }) {
  const { copy: C, lang } = useCopy();
  const [, navigate] = useLocation();
  const homeHref = linkBase || "#top";
  const toolHref = estimateHref(lang);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // While the sheet is open: the page behind it does not scroll, focus starts
  // on the close button and Tab stays inside the sheet, Esc closes it, and
  // widening the window past the phone layout closes it too.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const prev = [html.style.overflow, body.style.overflow];
    // Both, because iOS Safari scrolls the html element, not the body.
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    sheetRef.current?.querySelector<HTMLElement>(".nav-sheet-close")?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !sheetRef.current) return;
      const items = Array.from(sheetRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
      if (!items.length) return;
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
    const wide = window.matchMedia("(min-width: 901px)");
    const onWide = () => wide.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      html.style.overflow = prev[0];
      body.style.overflow = prev[1];
      window.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  function closeToToggle() {
    setOpen(false);
    toggleRef.current?.focus();
  }

  // Close the sheet, then act once the page behind it can scroll again.
  function closeThen(act: () => void) {
    setOpen(false);
    requestAnimationFrame(() => requestAnimationFrame(act));
  }

  // A link in the sheet follows itself the way a browser does, as a real
  // fragment jump: the section lands under the menu (scroll-margin-top) and
  // the next Tab carries on from there. Tapping the section it is already on
  // has no fragment to change, so that one just scrolls.
  function go(id: string) {
    closeThen(() => {
      if (window.location.hash === `#${id}`) jumpTo(id);
      else window.location.hash = id;
    });
  }

  return (
    <nav className="nav" aria-label={C.nav.primaryAriaLabel}>
      <a href={homeHref} aria-label={C.nav.homeAriaLabel} className="nav-lockup">
        <Lockup />
      </a>

      {/* Desktop links, hidden under 900px via CSS */}
      <div className="nav-links">
        {C.nav.links.map((l) => (
          <a key={l.id} href={`${linkBase}#${l.id}`}>
            {l.label}
          </a>
        ))}
        <Button size="sm" onClick={onTalk}>
          {C.nav.talkToUs}
        </Button>
        <LangSwitch />
      </div>

      {/* The hamburger, shown under 900px via CSS. The close cross sits in
          the same spot on the sheet, so the icon reads as turning into an X. */}
      <button
        ref={toggleRef}
        type="button"
        className="nav-toggle"
        aria-label={C.nav.menuAriaLabel}
        aria-expanded={open}
        aria-controls="nav-menu"
        onClick={() => setOpen(true)}
      >
        <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
          <path d="M0 1h22M0 7h22M0 13h22" stroke="currentColor" strokeWidth="1.25" fill="none" strokeLinecap="square" />
        </svg>
      </button>

      {open && (
        <div
          id="nav-menu"
          ref={sheetRef}
          className="nav-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={C.nav.menuAriaLabel}
        >
          <div className="nav-sheet-bar">
            <a href={homeHref} aria-label={C.nav.homeAriaLabel} onClick={() => setOpen(false)} className="nav-lockup">
              <Lockup />
            </a>
            <button
              type="button"
              className="nav-toggle nav-sheet-close"
              aria-label={C.nav.closeAriaLabel}
              onClick={closeToToggle}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M2 2l16 16M18 2L2 18" stroke="currentColor" strokeWidth="1.25" fill="none" strokeLinecap="square" />
              </svg>
            </button>
          </div>

          <ul className="nav-sheet-list">
            {C.nav.links.map((l) => (
              <li key={l.id}>
                <a
                  href={`${linkBase}#${l.id}`}
                  onClick={(e) => {
                    // Off the home page the link has to leave, so let it.
                    if (linkBase) return setOpen(false);
                    e.preventDefault();
                    go(l.id);
                  }}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="nav-sheet-actions">
            <a
              className="btn btn-primary"
              href={toolHref}
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
                navigate(toolHref);
              }}
            >
              {C.nav.menuEstimate}
              <svg className="arrow" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M1 7h12M8 2l5 5-5 5" />
              </svg>
            </a>
            <Button variant="cream" onClick={() => closeThen(onTalk)}>
              {C.nav.talkToUs}
            </Button>
            <LangSwitch className="lang-switch-sheet" />
          </div>
        </div>
      )}
    </nav>
  );
}

/* ─── Hero ────────────────────────────────────────────────────────────────── */

function LockIcon() {
  return (
    <svg className="est-lock" width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
      <rect x="1" y="6" width="10" height="7.5" rx="1.5" fill="currentColor" />
      <path d="M3.2 6V4.2a2.8 2.8 0 0 1 5.6 0V6" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function Hero({ onOpenValuation }: { onOpenValuation: (site?: string) => void }) {
  const { copy: C } = useCopy();
  const [site, setSite] = useState("");

  // Whatever he typed rides to the valuation estimate and lands in its first
  // question, already filled in. An empty box still opens it: he came to find
  // out what his business is worth either way, and the tool asks him again.
  function handleValuationSubmit(e: React.FormEvent) {
    e.preventDefault();
    onOpenValuation(site.trim() || undefined);
  }

  return (
    <header className="hero" id="top">
      {HERO_VIDEO && (
        <video
          className="hero-video"
          src={HERO_VIDEO}
          poster={HERO_POSTER}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          // Firefox puts a video in the Tab order. This one is wallpaper.
          tabIndex={-1}
        />
      )}
      <div className="hero-wash" aria-hidden="true"></div>

      <div className="container hero-container">
        <div className="hero-copy">
          <p className="eyebrow">{C.hero.eyebrow}</p>
          <h1 className="display hero-headline">
            {C.hero.headlineLead && <>{C.hero.headlineLead} </>}
            <span className="hl-emph emph-italic">{C.hero.headlineEmph}</span>
            {C.hero.headlineTrail}
          </h1>
          <p className="lede">
            <Lines lines={C.hero.lede.split("\n")} />
          </p>
          {/* The estimate card (site/39, mock option 3). A light framed card:
              the title, the website box and its button in one row, then the
              trust line. It replaced the v4 box with the arrow, whose whole
              promise sat in a placeholder that vanished the moment he typed.

              id="estimate" is where "Get your free estimate" in the why
              Gesher band lands. Right to left comes free: the row is flex and
              the padding is logical. */}
          <form className="est-card" id="estimate" onSubmit={handleValuationSubmit} aria-labelledby="est-title">
            <p className="est-title" id="est-title">
              {C.hero.estLabel}
            </p>
            <div className="est-row">
              <label htmlFor="hero-site" className="visually-hidden">
                {C.hero.valuationLabel}
              </label>
              <input
                id="hero-site"
                type="text"
                className="est-input"
                placeholder={C.hero.valuationPlaceholder}
                value={site}
                onChange={(e) => setSite(e.target.value)}
                autoComplete="url"
                inputMode="url"
                spellCheck={false}
                autoCapitalize="off"
                enterKeyHint="go"
              />
              <button type="submit" className="est-btn">
                {C.hero.estButton}
              </button>
            </div>
            <p className="est-note">
              <LockIcon />
              <span>{C.hero.estNote}</span>
            </p>
          </form>
        </div>
      </div>
    </header>
  );
}

/* ─── Proof strip ─────────────────────────────────────────────────────────── */

function ProofStrip() {
  const { copy: C } = useCopy();
  return (
    <section className="proof">
      <div className="container">
        <div className="proof-row">
          {C.proof.map((s, i) => (
            <div className="proof-cell" key={i}>
              <div className="proof-n">
                {s.value}
                <small>{s.unit}</small>
              </div>
              <div className="proof-l">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Logo strip ──────────────────────────────────────────────────────────── */

/**
 * A slow marquee. Two identical sets side by side, the track slides left by
 * half its width and loops, so the row never shows a seam. It pauses while the
 * mouse is over it (CSS), and under "reduce motion" the animation is off and
 * the logos wrap into a still, centred row (CSS).
 */
function LogoStrip() {
  const { copy: C } = useCopy();
  const set = (hidden: boolean) => (
    <div className="marquee-set" aria-hidden={hidden ? true : undefined}>
      {/* No loading="lazy" here on purpose. The browser only loads a lazy image
          when it comes into view, and these sit on a track that slides left,
          so a logo that starts off screen is never asked for and the slot stays
          blank. Seven small logos load eagerly without a fuss. */}
      {C.logos.items.map((l, i) => (
        <img key={i} src={l.src} alt={hidden ? "" : l.alt} className={l.tall ? "tall" : undefined} />
      ))}
    </div>
  );
  return (
    <section className="logostrip">
      <div className="container">
        <p className="eyebrow logostrip-label">{C.logos.label}</p>
      </div>
      <div className="marquee" aria-label={C.logos.items.map((l) => l.alt).join(", ")}>
        <div className="marquee-track">
          {set(false)}
          {set(true)}
        </div>
      </div>
    </section>
  );
}

/* ─── Why Gesher ──────────────────────────────────────────────────────────── */

const pointNumber = (n: number) => String(n).padStart(2, "0");

/**
 * The chart in point 1, reworked from the v4 "why this works" chart: five
 * bars rising from one buyer to five, that many small people under each bar,
 * a dashed "one offer" line off the top of the first bar, and a bracket from
 * that line to the top of the last bar. No numbers on it, on purpose.
 *
 * Two shapes of the same drawing. "wide" is the mock's. "compact" is for
 * phones, where the wide one would shrink its labels to 6px: narrower bars,
 * bigger type, and only the two end bars labelled (the people under every bar
 * still count them). home.css shows one or the other, so the page never
 * measures anything and nothing jumps.
 *
 * Right to left, the whole drawing mirrors (one buyer on the right) and the
 * text stays upright: every x goes through mx(), and the svg's direction flips
 * so "start" anchors mirror with it.
 */
const CHART_SHAPES = {
  wide: {
    W: 540, H: 296, x0: 40, w: 58, base: 222,
    xs: [40, 132, 224, 316, 408],
    heights: [64, 92, 118, 146, 178],
    font: { axis: 11, offer: 13, buyers: 12, gap: 11 },
    person: { w: 12, gap: 4, top: 8, row: 17 },
    labelDy: 58, bracketDx: 14, gapDx: 24, labelAll: true,
  },
  compact: {
    // The first bar stands a little apart, so "One offer" fits beside it.
    W: 320, H: 262, x0: 28, w: 36, base: 196,
    xs: [28, 98, 148, 198, 248],
    heights: [50, 72, 94, 116, 140],
    font: { axis: 11, offer: 12, buyers: 13, gap: 11 },
    person: { w: 10, gap: 3, top: 7, row: 14 },
    labelDy: 52, bracketDx: 10, gapDx: 18, labelAll: false,
  },
};

const INK = "#23201A";
const NAVY = "#16243B";
const TAUPE = "#6F6757";
const BURGUNDY = "#6E2B2B";
const MUTE_BAR = "#CFC6B5";
const HAIRLINE = "#DCD4C4";

function BuyersChart({ shape }: { shape: keyof typeof CHART_SHAPES }) {
  const { copy: C, lang } = useCopy();
  const g = CHART_SHAPES[shape];
  const rtl = lang === "he";
  const mx = (x: number) => (rtl ? g.W - x : x);
  // A box of width bw starting at x, mirrored as a box.
  const bx = (x: number, bw: number) => (rtl ? g.W - x - bw : x);
  const lastX = g.xs[4];
  const oneTop = g.base - g.heights[0];
  const topTop = g.base - g.heights[4];
  const axisX = g.x0 - 14;
  const bracketX = lastX + g.w + g.bracketDx;
  const tick = shape === "wide" ? 8 : 6;
  const gapX = bracketX + g.gapDx;
  const gapY = (oneTop + topTop) / 2;
  const sans = "Inter,system-ui,sans-serif";

  return (
    <svg
      className={`wg-chart wg-chart-${shape}`}
      viewBox={`0 0 ${g.W} ${g.H}`}
      role="img"
      aria-label={C.chart.alt}
      direction={rtl ? "rtl" : "ltr"}
    >
      <text className="wg-chart-caps" x={mx(g.x0)} y={16} fontFamily={sans} fontSize={g.font.axis} letterSpacing={rtl ? 0 : 1.4} fill={TAUPE}>
        {C.chart.priceLabel}
      </text>
      <path
        d={`M${mx(axisX)} ${g.base} V28 M${mx(axisX - 4)} 34 L${mx(axisX)} 26 L${mx(axisX + 4)} 34`}
        stroke={TAUPE}
        strokeWidth={1}
        fill="none"
      />
      <line x1={mx(axisX)} y1={g.base} x2={mx(lastX + g.w + 8)} y2={g.base} stroke={HAIRLINE} strokeWidth={1} />
      <line
        x1={mx(g.x0)}
        y1={oneTop}
        x2={mx(lastX + g.w + g.bracketDx)}
        y2={oneTop}
        stroke={TAUPE}
        strokeWidth={1}
        strokeDasharray="3 4"
      />
      <text
        x={mx(g.x0)}
        y={oneTop - 8}
        fontFamily="Newsreader,Georgia,serif"
        fontStyle={rtl ? "normal" : "italic"}
        fontSize={g.font.offer}
        fill={TAUPE}
      >
        {C.chart.oneOffer}
      </text>

      {g.heights.map((h, i) => {
        const x = g.xs[i];
        const n = i + 1;
        const first = i === 0;
        const people = [];
        for (let j = 0; j < n; j++) {
          const row = j < 3 ? 0 : 1;
          const col = row === 0 ? j : j - 3;
          const inRow = row === 0 ? Math.min(n, 3) : n - 3;
          const rowW = inRow * g.person.w + (inRow - 1) * g.person.gap;
          const px = bx(x, g.w) + (g.w - rowW) / 2 + col * (g.person.w + g.person.gap);
          const py = g.base + g.person.top + row * g.person.row;
          people.push(
            <g key={j} transform={`translate(${px} ${py}) scale(${g.person.w / 12})`} fill={first ? TAUPE : NAVY}>
              <circle cx={6} cy={3.4} r={3} />
              <path d="M0.6 14C0.6 9.2 3 7.6 6 7.6S11.4 9.2 11.4 14Z" />
            </g>
          );
        }
        const showLabel = g.labelAll || first || i === 4;
        return (
          <g key={i}>
            <rect
              x={bx(x, g.w)}
              y={g.base - h}
              width={g.w}
              height={h}
              fill={first ? MUTE_BAR : BURGUNDY}
              fillOpacity={first ? 1 : 0.55 + i * 0.11}
            />
            {people}
            {showLabel && (
              <text
                x={mx(x + g.w / 2)}
                y={g.base + g.labelDy}
                textAnchor="middle"
                fontFamily={sans}
                fontSize={g.font.buyers}
                fontWeight={first || i === 4 ? 600 : 400}
                fill={INK}
              >
                {first ? C.chart.buyerOne : C.chart.buyerMany.replace("{n}", String(n))}
              </text>
            )}
          </g>
        );
      })}

      <path
        d={`M${mx(bracketX)} ${oneTop} H${mx(bracketX + tick)} V${topTop} H${mx(bracketX)}`}
        stroke={BURGUNDY}
        strokeWidth={1.4}
        fill="none"
      />
      <text
        className="wg-chart-caps"
        x={mx(gapX)}
        y={gapY}
        transform={`rotate(-90 ${mx(gapX)} ${gapY})`}
        textAnchor="middle"
        fontFamily={sans}
        fontSize={g.font.gap}
        letterSpacing={rtl ? 0 : 1.6}
        fontWeight={600}
        fill={BURGUNDY}
      >
        {C.chart.gap}
      </text>
    </svg>
  );
}

// Point 2: the two founders in arched frames, first names under them. The
// arch's size is fixed in CSS, so nothing moves when the lazy photo arrives.
// The names are the caption, so the photos carry no alt text of their own.
function FounderArches() {
  const { copy: C } = useCopy();
  const people = [
    { name: C.why.p2.nameOfir, src: FOUNDER_ARCH_PHOTOS.ofir },
    { name: C.why.p2.nameBen, src: FOUNDER_ARCH_PHOTOS.ben },
  ];
  return (
    <div className="wg-vis wg-founders">
      {people.map((p) => (
        <figure key={p.src} className="wg-arch">
          <span className="wg-arch-frame">
            <img src={p.src} alt="" width={400} height={400} loading="lazy" decoding="async" />
          </span>
          <figcaption>{p.name}</figcaption>
        </figure>
      ))}
    </div>
  );
}

// Point 3: today's statement, and the same statement rebuilt for a buyer.
function FinancialsSheets() {
  const { copy: C } = useCopy();
  return (
    <div className="wg-vis wg-sheets">
      <figure className="wg-sheet">
        <svg viewBox="0 0 68 96" aria-hidden="true">
          <rect x="1" y="1" width="66" height="94" rx="2" fill="#FBF8F1" stroke={MUTE_BAR} />
          <rect x="11" y="15" width="34" height="5" fill={MUTE_BAR} />
          <rect x="11" y="29" width="46" height="4" fill={HAIRLINE} />
          <rect x="11" y="41" width="40" height="4" fill={HAIRLINE} />
          <rect x="11" y="53" width="46" height="4" fill={HAIRLINE} />
          <rect x="11" y="65" width="30" height="4" fill={HAIRLINE} />
        </svg>
        <figcaption className="wg-sheet-today">{C.why.p3.today}</figcaption>
      </figure>
      <svg className="wg-sheet-arrow" viewBox="0 0 18 12" aria-hidden="true">
        <path d="M1 6h15m-5-5 5 5-5 5" fill="none" stroke={NAVY} strokeWidth="1.5" />
      </svg>
      <figure className="wg-sheet">
        <svg viewBox="0 0 68 96" aria-hidden="true">
          <rect x="1" y="1" width="66" height="94" rx="2" fill="#FBF8F1" stroke={NAVY} strokeWidth="1.2" />
          <rect x="11" y="15" width="34" height="5" fill={NAVY} />
          <rect x="11" y="29" width="46" height="4" fill="#B98A84" />
          <rect x="11" y="41" width="40" height="4" fill={HAIRLINE} />
          <rect x="11" y="53" width="46" height="4" fill="#B98A84" />
          <rect x="11" y="65" width="30" height="4" fill={HAIRLINE} />
          <circle cx="55" cy="83" r="9" fill={BURGUNDY} />
          <path d="M50.5 83l3 3 6-6" fill="none" stroke="#F5F0E6" strokeWidth="1.8" />
        </svg>
        <figcaption>{C.why.p3.buyerReady}</figcaption>
      </figure>
    </div>
  );
}

// Point 4: who runs what. A light row for him and his business, a navy row
// for us and the sale. Plain text in the rows, so a long word wraps instead
// of being cut.
function WhoRunsWhat() {
  const { copy: C } = useCopy();
  return (
    <div className="wg-vis wg-rows">
      <div className="wg-row wg-row-you">
        <svg className="wg-row-ico" viewBox="0 0 48 48" aria-hidden="true">
          <g fill="none" stroke={NAVY} strokeWidth="1.6" strokeLinejoin="round">
            <path d="M3 45V25l11-7v7l11-7v7l11-7V8h7v37Z" />
            <rect x="9" y="33" width="5" height="5" />
            <rect x="20" y="33" width="5" height="5" />
            <rect x="29" y="33" width="5" height="5" />
          </g>
          <path d="M38 5c1.5-2 3.5 0 5-2" stroke={TAUPE} strokeWidth="1.3" fill="none" />
        </svg>
        <p>
          <span className="wg-row-k">{C.why.p4.you}</span>
          <span className="wg-row-v">{C.why.p4.yourBusiness}</span>
        </p>
      </div>
      <div className="wg-row wg-row-us">
        <svg className="wg-row-ico wg-row-flag" viewBox="0 0 48 48" aria-hidden="true">
          <path d="M4 42C16 42 14 26 26 26S34 14 38 14" fill="none" stroke="#D9B8B2" strokeWidth="1.6" strokeDasharray="3 3" />
          <circle cx="4" cy="42" r="3" fill="#D9B8B2" />
          <circle cx="26" cy="26" r="3" fill="#D9B8B2" />
          <path d="M38 14V1" stroke="#D9B8B2" strokeWidth="1.6" />
          <path d="M38 1l9 4-9 4Z" fill="#D9B8B2" />
        </svg>
        <p>
          <span className="wg-row-k">{C.why.p4.gesher}</span>
          <span className="wg-row-v">{C.why.p4.yourSale}</span>
        </p>
      </div>
    </div>
  );
}

function HourglassIcon() {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" aria-hidden="true">
      <path d="M1 1h10M1 15h10M2 1c0 5 8 5 8 7s-8 2-8 7M10 1c0 5-8 5-8 7s8 2 8 7" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

/**
 * Why Gesher. Replaces the challenge, why this works and the old navy band
 * (site/39). Point 1 is a wide card with the chart; points 2 to 4 sit in a
 * row of three (one column under 900px); the navy band closes the section.
 */
function WhyGesher() {
  const { copy: C } = useCopy();
  const W = C.why;

  // The band's button is a real link to the hero card (#estimate), so it
  // works even before the script runs. Once it has, the page makes the jump
  // itself, because a browser's own jump to an anchor clears focus, and with
  // a mouse or a keyboard the cursor should then wait in the website box. Not
  // on a touch screen, where focusing the box would throw the keyboard up
  // mid-scroll.
  function toEstimate(e: React.MouseEvent) {
    e.preventDefault();
    jumpTo("estimate");
    if (window.matchMedia("(pointer: fine)").matches) {
      document.getElementById("hero-site")?.focus({ preventScroll: true });
    }
  }

  const points = [
    { n: 2, title: W.p2.title, body: W.p2.body, vis: <FounderArches /> },
    { n: 3, title: W.p3.title, body: W.p3.body, vis: <FinancialsSheets /> },
    { n: 4, title: W.p4.title, body: W.p4.body, vis: <WhoRunsWhat /> },
  ];

  return (
    <section className="section wg" id="why">
      <div className="container">
        <h2 className="display">{W.heading}</h2>

        <div className="wg-card wg-feature">
          <div className="wg-txt">
            <span className="wg-num">{pointNumber(1)}</span>
            <h3>{W.p1.title}</h3>
            <p>{W.p1.body}</p>
          </div>
          <div className="wg-chart-box">
            <BuyersChart shape="wide" />
            <BuyersChart shape="compact" />
          </div>
        </div>

        <div className="wg-points">
          {points.map((p) => (
            <article className="wg-card wg-point" key={p.n}>
              {p.vis}
              <span className="wg-num">{pointNumber(p.n)}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </article>
          ))}
        </div>

        <div className="wg-band">
          <div>
            <p className="wg-band-label">
              <HourglassIcon />
              <span>{W.bandLabel}</span>
            </p>
            <h3>{W.bandTitle}</h3>
            <p className="wg-band-body">{W.bandBody}</p>
          </div>
          <a className="btn btn-on-navy" href="#estimate" onClick={toEstimate}>
            {W.bandCta}
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─── Our process ─────────────────────────────────────────────────────────── */

// Thin line icons in round badges, one per step: rising bars, three people
// with the one in the middle in burgundy, a signed page.
const STEP_ICONS: Record<number, React.ReactNode> = {
  1: (
    <>
      <path d="M5 27h22" stroke={NAVY} strokeWidth="1.5" />
      <rect x="8" y="18" width="4" height="9" fill="none" stroke={NAVY} strokeWidth="1.5" />
      <rect x="14.5" y="13" width="4" height="14" fill="none" stroke={NAVY} strokeWidth="1.5" />
      <rect x="21" y="7" width="4" height="20" fill={BURGUNDY} stroke={BURGUNDY} strokeWidth="1.5" />
    </>
  ),
  2: (
    <g fill="none" stroke={NAVY} strokeWidth="1.5">
      <circle cx="7" cy="12" r="3" />
      <path d="M2 24c0-4 2.2-6 5-6s5 2 5 6" />
      <circle cx="25" cy="12" r="3" />
      <path d="M20 24c0-4 2.2-6 5-6s5 2 5 6" />
      <circle cx="16" cy="9" r="3.4" stroke={BURGUNDY} />
      <path d="M10.5 23c0-4.6 2.5-7 5.5-7s5.5 2.4 5.5 7" stroke={BURGUNDY} />
    </g>
  ),
  3: (
    <g fill="none" stroke={NAVY} strokeWidth="1.5">
      <rect x="7" y="4" width="18" height="24" rx="1.5" />
      <path d="M11 10h10M11 14h10M11 18h6" />
      <path d="M11 24c1.5-2 2.5-2 3 0s1.5 2 3 0 2-1.5 4-0.5" stroke={BURGUNDY} />
    </g>
  ),
};

/**
 * Our process. Three steps on one line that joins their round icon badges,
 * each with one line and one "You get". On a phone the steps stack and the
 * line runs down the start edge. Nothing moves on its own: the v4 road and
 * its three-second wheel went with the redesign.
 */
function HowItWorks() {
  const { copy: C } = useCopy();
  const P = C.process;
  return (
    <section className="section how" id="how">
      <div className="container">
        <div className="how-head">
          <p className="eyebrow">{P.eyebrow}</p>
          <h2 className="display">{P.heading}</h2>
        </div>
        <ol className="how-steps">
          {P.steps.map((s) => (
            <li className="how-step" key={s.id}>
              <span className="how-ico" aria-hidden="true">
                <svg viewBox="0 0 32 32">{STEP_ICONS[s.id]}</svg>
              </span>
              <span className="how-n">{P.step.replace("{n}", String(s.id))}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              <div className="how-get">
                <small>{P.youGet}</small>
                <span>{s.outcome}</span>
              </div>
            </li>
          ))}
        </ol>
        <p className="how-note">{P.note}</p>
      </div>
    </section>
  );
}

/* ─── The team ────────────────────────────────────────────────────────────── */

function Team() {
  const { copy: C } = useCopy();
  return (
    <section className="section v4-founders" id="founders">
      <div className="container">
        <p className="eyebrow">{C.team.eyebrow}</p>
        <h2 className="display">{C.team.heading}</h2>
        <div className="people">
          {C.team.people.map((p) => (
            <div className="person" key={p.name}>
              <img src={p.photo} alt={p.name} loading="lazy" />
              <div>
                <h3>{p.name}</h3>
                <p className="role">{p.role}</p>
                <p>{p.bio}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="coda">{C.team.coda}</p>
      </div>
    </section>
  );
}

/* ─── Sectors ─────────────────────────────────────────────────────────────── */

function Sectors() {
  const { copy: C } = useCopy();
  return (
    <section className="section sectors" id="sectors">
      <div className="container">
        <div className="sectors-top">
          <div>
            <p className="eyebrow">{C.sectors.eyebrow}</p>
            <h2 className="display">{C.sectors.heading}</h2>
          </div>
          <p className="lede">{C.sectors.lede}</p>
        </div>
        <div className="sgrid">
          {C.sectors.items.map((s) => (
            <div key={s.name}>
              <span className="ico" aria-hidden="true">
                <svg viewBox="0 0 24 24">{SECTOR_ICONS[s.icon]}</svg>
              </span>
              <b>{s.name}</b>
              <span>{s.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Questions ───────────────────────────────────────────────────────────── */

function Faq() {
  const { copy: C, lang } = useCopy();
  return (
    <section className="section faq" id="faq">
      <div className="container">
        <div className="faq-top">
          <div>
            <p className="eyebrow">{C.faq.eyebrow}</p>
            <h2 className="display">{C.faq.heading}</h2>
          </div>
          <div className="qs">
            {(lang === "he" ? FAQ_ITEMS_HE : FAQ_ITEMS).map((item) => (
              <details key={item.q}>
                <summary>
                  <h3>{item.q}</h3>
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Contact ─────────────────────────────────────────────────────────────── */

function Contact() {
  const { copy: C, lang } = useCopy();
  // The form used to flip to the thank-you card the instant the button was
  // pressed and throw the server's answer away. A lead that never sent looked
  // exactly like a lead that did, and the owner had no reason to try again.
  // Now the card waits for the answer, and a failed send says so.
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [name, setName] = useState("");
  const [reach, setReach] = useState("");
  const [website, setWebsite] = useState("");
  const [revenue, setRevenue] = useState("");
  const [message, setMessage] = useState("");
  // This form used to read a note the valuation page left in sessionStorage and
  // show a box above itself saying "We will send this with your valuation:".
  // The box was honest, and only ever visible to the one person who had just
  // run a valuation in that same tab, but on the home page it read as a stray
  // panel nobody asked for. The valuation page has its own popup now and sends
  // the run straight from there, so the note had no job left. Cut Sep 17, along
  // with the whole handoff mechanism.
  const { labels, placeholders } = C.contact;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    // One field now takes either a phone number or an email. Send it as the
    // email when it looks like one, otherwise as the phone. The server accepts
    // either, and only sets reply-to when there is a real address.
    const looksLikeEmail = reach.includes("@");
    // Revenue used to be glued onto the message. It goes as its own field now
    // so it lands in its own column on the lead sheet.
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: looksLikeEmail ? reach.trim() : undefined,
          phone: looksLikeEmail ? undefined : reach.trim(),
          website: website.trim() || undefined,
          revenue: revenue || undefined,
          message: message.trim() || "(no message)",
          // Tells us whether the lead came off the English page or /he/.
          sourcePage: window.location.pathname,
        }),
      });
      // Only a 2xx means the mail actually left. Anything else, including the
      // missing-key error, is a failure the owner needs to see.
      setStatus(res.ok ? "sent" : "failed");
      // Counted only when the lead really went through.
      if (res.ok) trackContactSubmit({ form: "home", lang });
    } catch {
      // Offline, DNS, the server down. Same story for the owner.
      setStatus("failed");
    }
  }

  return (
    <section className="section contact" id="contact">
      <div className="container contact-grid">
        <div>
          <p className="eyebrow">{C.contact.eyebrow}</p>
          <h2 className="display">{C.contact.heading}</h2>
          <p className="lede">{C.contact.lede}</p>
          <p className="contact-win">{C.contact.win}</p>
          <p className="contact-mail">
            {C.contact.orEmail}{" "}
            <a href={`mailto:${C.contact.emailAddress}`}>{C.contact.emailAddress}</a>
          </p>
        </div>

        {status === "sent" ? (
          <div className="contact-thanks">
            <h3 className="serif" style={{ marginBottom: 8 }}>
              {C.contact.thanksHeading}
            </h3>
            <p style={{ margin: 0 }}>{C.contact.thanksBody}</p>
          </div>
        ) : (
          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">{labels.name}</label>
              <input
                id="name"
                type="text"
                placeholder={placeholders.name}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="reach">{labels.reach}</label>
              <input
                id="reach"
                type="text"
                placeholder={placeholders.reach}
                required
                value={reach}
                onChange={(e) => setReach(e.target.value)}
              />
            </div>
            {/* Required. A contact lead used to arrive with a name and a phone
                number and nothing to look at, so the first thing anyone had to
                do was write back and ask for the website. Now it comes in with
                the lead and the valuation tool can be pointed at it. */}
            <div className="field full">
              <label htmlFor="website">{labels.website}</label>
              <input
                id="website"
                type="text"
                placeholder={placeholders.website}
                required
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                autoComplete="url"
                inputMode="url"
                spellCheck={false}
                autoCapitalize="off"
              />
            </div>
            {/* This was a dropdown of revenue bands, with "Prefer not to say"
                at the bottom. He types the figure now, the same as on the
                valuation page, because a band tells us almost nothing and a
                number tells us whether this is a mandate. Still optional. */}
            <div className="field full">
              <label htmlFor="revenue">{labels.revenue}</label>
              <input
                id="revenue"
                type="text"
                placeholder={placeholders.revenue}
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="field full">
              <label htmlFor="message">{labels.message}</label>
              <textarea
                id="message"
                placeholder={placeholders.message}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            {status === "failed" && (
              <p className="form-error full" role="alert">
                {C.contact.sendFailed}
              </p>
            )}
            <div className="form-actions">
              <Button type="submit" size="lg" arrow disabled={status === "sending"}>
                {status === "sending" ? C.contact.sending : C.contact.send}
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────────────────────────────── */

function Footer({ linkBase = "" }: { linkBase?: string }) {
  const { copy: C } = useCopy();
  const [, navigate] = useLocation();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Lockup markHeight={30} />
          </div>
          <div className="footer-links" aria-label={C.footer.ariaLabel}>
            {C.footer.links.map((l) =>
              l.kind === "anchor" ? (
                <a key={l.label} href={`${linkBase}#${l.id}`}>
                  {l.label}
                </a>
              ) : (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(l.href);
                  }}
                >
                  {l.label}
                </a>
              )
            )}
            <LangSwitch />
          </div>
        </div>
        <div className="footer-bottom">{C.footer.disclaimer}</div>
      </div>
    </footer>
  );
}

/* ─── Shell for other pages ───────────────────────────────────────────────── */

/**
 * The home page's own nav and footer around another page's content. The
 * privacy and terms pages use it, so every page the footer links to wears the
 * same header and footer as the home page. Before this they wore the old
 * Manus-era Nav and Footer from components/, with no logo and "Address pending".
 *
 * English only: the legal pages have no Hebrew yet. The section links point
 * back at the home page ("/#how"), and "Talk to us" goes to the home page form.
 */
export function SiteShell({ children }: { children: React.ReactNode }) {
  // A footer link is a client-side hop, so the new page would open wherever
  // the old one was scrolled to, which is the footer. Start at the top, in one
  // jump: the site sets smooth scrolling, and a new page should not slide.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  return (
    <CopyContext.Provider value={{ copy: COPY, lang: "en" }}>
      <div className="gesher" lang="en" dir="ltr">
        <header className="site-header">
          <div className="container">
            <Nav
              linkBase="/"
              onTalk={() => {
                trackTalkClick({ placement: "legal-nav", lang: "en" });
                window.location.assign("/#contact");
              }}
            />
          </div>
        </header>
        {children}
        <Footer linkBase="/" />
      </div>
    </CopyContext.Provider>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function Home({ lang = "en" }: { lang?: Lang }) {
  const [, navigate] = useLocation();
  const copy = HOME_COPY[lang];
  const dir = lang === "he" ? "rtl" : "ltr";

  // The server sets <html lang dir> on first load (server/_core/vite.ts).
  // This keeps it right after a client-side hop, and puts it back to English
  // on the way out, since every other route is English.
  useEffect(() => {
    const el = document.documentElement;
    el.lang = lang;
    el.setAttribute("dir", dir);
    return () => {
      el.lang = "en";
      el.setAttribute("dir", "ltr");
    };
  }, [lang, dir]);

  // Arriving at "/#why" from another page (the legal pages' nav and footer
  // link back this way). The browser tries that jump before React has drawn
  // the section, so it lands at the top. Jump once the page is up, and again
  // when images have loaded and moved things down.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const jump = () => {
      document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
    };
    // The section is in the DOM by the time an effect runs, so jump now.
    jump();
    if (document.readyState !== "complete") window.addEventListener("load", jump, { once: true });
    return () => window.removeEventListener("load", jump);
  }, []);

  // Every "talk to us" on the home page scrolls to the form. placement tells
  // GA4 and Meta which button it was.
  const talk = (placement: string) => {
    trackTalkClick({ placement, lang });
    jumpTo("contact");
  };

  return (
    <CopyContext.Provider value={{ copy, lang }}>
      <div className={lang === "he" ? "gesher gesher-rtl" : "gesher"} lang={lang} dir={dir}>
        <header className="site-header">
          <div className="container">
            <Nav onTalk={() => talk("nav")} />
          </div>
        </header>
        <Hero
          onOpenValuation={(site) => {
            // The website rides in history state, not in the address. It used to
            // go as ?site=, and GA4 and the Meta Pixel both record the full
            // address, so the owner's company reached Google and Meta. The page
            // says "Strictly private". Valuation.tsx reads it back out.
            navigate(estimateHref(lang), site ? { state: { site } } : undefined);
          }}
        />
        <ProofStrip />
        <LogoStrip />
        <WhyGesher />
        <HowItWorks />
        <Team />
        <Sectors />
        <Faq />
        <Contact />
        <Footer />
      </div>
    </CopyContext.Provider>
  );
}
