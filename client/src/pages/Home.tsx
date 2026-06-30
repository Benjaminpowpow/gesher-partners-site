/**
 * Home — the Gesher homepage.
 *
 * Ported from the Claude design (tools/exit-brief/page-design): Nav, Hero (video),
 * Problem, StatRow, Process, TrackRecord, Founders, Selectivity, Contact, Footer,
 * and a quick-valuation modal. Converted to React + TypeScript. The dev-only Tweaks
 * panel is dropped; the design's defaults are baked in (letter / warm / italic).
 *
 * All styling lives in home.css, scoped under .gesher so nothing bleeds to other
 * routes. Bilingual: English (EN) at /en/, Hebrew (HE, right-to-left) at the root.
 * The active language is chosen by the route and provided via StringsContext.
 */
import { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { FileText, Search, Gavel, ShieldCheck, Briefcase, Users, User, Scale, Handshake, FileSignature, ArrowUpRight } from "lucide-react";
import "./home.css";

const EN = {
  nav: {
    homeAriaLabel: "gesher home",
    primaryAriaLabel: "Primary",
    howItWorks: "How it works",
    founders: "Founders",
    quickValuation: "Quick valuation",
    talkToUs: "Talk to us",
    menuAriaLabel: "Menu",
    closeAriaLabel: "Close menu",
  },
  hero: {
    eyebrow: "For private and family businesses · 5-50M NIS",
    headlineLead: "Get the most out of your",
    headlineEmph: "life's work",
    headlineTrail: ".",
    lede: "Sell-side advisors who've sold their own companies\n& helped others do the same",
    ctaTalk: "Talk to us",
    ctaValuation: "Quick valuation",
  },
  problem: {
    eyebrow: "The challenge",
    heading: "You built something.\nYou have one shot to get this right.",
    paras: [
      "There is no next generation, and it is time to sell.",
      "We are the advisor you should have next to you.",
    ],
  },
  stats: {
    items: [
      { value: "40+", unit: "years", accent: false, lbl: "Advising business owners" },
      { value: "20+", unit: "companies", accent: false, lbl: "Built and sold" },
      { value: "0", unit: "investment banks", accent: true, lbl: "For a deal this size" },
    ],
  },
  process: {
    eyebrow: "The process",
    heading: "How a Gesher mandate works.",
    lede: "Talk to us about your business.",
    steps: [
      { step: "I", title: "We package your business.", body: "Real numbers, real story, ready for serious buyers. The way a strategic acquirer reads it." },
      { step: "II", title: "We find your buyers.", body: "PE funds. Strategics. Family offices. Global. We map them in weeks, not months." },
      { step: "III", title: "We run the auction.", body: "Multiple buyers, same week, same room. Not one offer. Many. That is what gets you the price." },
      { step: "IV", title: "We close your deal.", body: "Senior banker on the line for every call. From the first NDA to the last signature. No handoffs." },
    ],
  },
  trackRecord: {
    eyebrow: "Track record",
    heading: "Where we have built and advised.",
    lede: "Operators and advisors before founders",
    logos: [
      { src: "/brand/logos/kpmg.svg", alt: "KPMG", height: 38 },
      { src: "/brand/logos/jfrog.svg", alt: "JFrog", height: 48 },
      { src: "/brand/logos/metro-group.png", alt: "Metropolinet Group", height: 52 },
      { src: "/brand/logos/space.png", alt: "Space", height: 50 },
      { src: "/brand/logos/ptravel.webp", alt: "P Travels Club", height: 48 },
      { src: "/brand/logos/milgam.png", alt: "Milgam", height: 30 },
    ],
  },
  founders: {
    eyebrow: "The team",
    heading: "Built by people who have been on your side of the table.",
    photoPlaceholder: "Founder photo",
    ofir: {
      name: "Ofir Ben Haim, CPA",
      role: "Managing Partner",
      bio: "40+ years advising Israeli business owners. He has seen every deal structure that works in the Israeli market, and several that do not.",
    },
    ben: {
      name: "Benjamin Aronson",
      role: "Managing Partner",
      bio: "Benjamin brings deep operational experience from the technology and services sector. Built and sold his company. Sat on the founder side of transactions.",
    },
    story: [
      "We sat on your side of the table. We know what it feels like to sell something you built over years.",
    ],
    coda: "",
  },
  selectivity: {
    eyebrow: "What sets us apart",
    quote: "Most advisors push you to sell.\nWe tell you when to wait.",
    sub: "That is why owners trust us when it is time.",
  },
  contact: {
    eyebrow: "Get in touch",
    heading: "Contact us.",
    lede: "Tell us where you are and we will tell you honestly whether we can help.",
    note: "When you win, we win.",
    labels: {
      name: "Name",
      email: "Email",
      company: "Company",
      website: "Website",
      revenue: "Annual revenue",
      stage: "Where you are in the process",
      message: "Anything you want us to know",
    },
    placeholders: {
      name: "Your name",
      email: "you@example.co.il",
      company: "Your business",
      website: "yourbusiness.co.il",
      revenue: "Select range",
      stage: "Select one",
      message: "A few sentences are enough.",
    },
    revenueOptions: ["Under 5M NIS", "5–10M NIS", "10–20M NIS", "20–50M NIS", "50M+ NIS", "Prefer not to say"],
    stageOptions: ["Exploring options", "Ready to start a process", "Have received an approach"],
    send: "Send",
    orEmail: "Or email",
    emailAddress: "hello@gesherpartners.com",
    thanksHeading: "Thank you.",
    thanksBody: "We read every note ourselves. You will hear from Ofir or Ben within two business days.",
  },
  footer: {
    mission: "Sell-side advisor",
    ariaLabel: "Footer",
    disclaimer: "Gesher Partners is not a licensed investment advisor. Nothing on this site constitutes investment advice or a solicitation to buy or sell any security.",
    links: {
      valuation: "Valuation Snapshot",
      contact: "Contact",
      privacy: "Privacy",
      terms: "Terms",
    },
  },
  modal: {
    eyebrow: "Quick valuation",
    heading: "Paste a website. Get an honest brief.",
    body: "We read your site, look at recent Israeli deal data, and name the buyers most likely to pay a real price. You get a short brief back, no obligation.",
    open: "Open the brief",
    notNow: "Not now",
    ariaLabel: "Quick valuation",
  },
  // Which language this table is. Drives the active state in the switcher.
  langCode: "en",
};

type Strings = typeof EN;

// Hebrew copy. Same shape as EN, picked by Ben from two drafts and cleaned
// against the writing rules. Ofir does the final native review before live.
// Locked source: MANIS/10-hebrew-homepage-copy-locked.md.
const HE: Strings = {
  nav: {
    homeAriaLabel: "דף הבית של גשר",
    primaryAriaLabel: "ניווט ראשי",
    howItWorks: "איך זה עובד",
    founders: "המייסדים",
    quickValuation: "ניתוח שווי ראשוני",
    talkToUs: "דבר איתנו",
    menuAriaLabel: "תפריט",
    closeAriaLabel: "סגירת התפריט",
  },
  hero: {
    eyebrow: "לעסקים משפחתיים בישראל · מחזור של 5 עד 50 מיליון ש״ח",
    headlineLead: "להוציא את המקסימום",
    headlineEmph: "ממפעל החיים שלך",
    headlineTrail: ".",
    lede: "ליווי ישראלי לצד המוכר, שהוקם על ידי אנשים שמכרו חברות בעצמם.",
    ctaTalk: "דבר איתנו",
    ctaValuation: "ניתוח שווי ראשוני",
  },
  problem: {
    eyebrow: "הבעיה",
    heading: "הוא בנה עסק אמיתי. ויש לו רק הזדמנות אחת לעשות את זה נכון.",
    paras: [
      "עשרים וחמש שנות עבודה. עסק חי ובועט. הילדים שלו לא מעוניינים להמשיך אותו. המתווכים שלא מפסיקים להתקשר רק רוצים לסגור עסקה מחר בבוקר, עם הקונה הראשון שירים את הטלפון. מגיע לו הרבה יותר מזה.",
      "אנחנו השותף שהוא צריך לצידו. אנחנו לומדים את העסק לעומק. מאתרים את הקונים המדויקים, ומנהלים תהליך תחרותי אמיתי. ואנחנו אומרים את האמת. גם כשהאמת היא שעדיף עדיין לא למכור.",
    ],
  },
  stats: {
    items: [
      { value: "40+", unit: "שנות ייעוץ", accent: false, lbl: "לבעלי עסקים בישראל" },
      { value: "3", unit: "חברות", accent: false, lbl: "שבנינו ומכרנו בעצמנו" },
      { value: "0", unit: "בנקי השקעות", accent: true, lbl: "שמתעניינים בעסקאות בגודל שלך. אז בנינו אחד כזה." },
    ],
  },
  process: {
    eyebrow: "התהליך",
    heading: "איך עובד ליווי של גשר.",
    lede: "דבר איתנו על העסק שלך.",
    steps: [
      { step: "I", title: "אריזה פיננסית ועסקית.", body: "מספרים אמיתיים, סיפור עסקי חזק, מוכן לקונים רציניים ובדיוק בסטנדרט שרוכש אסטרטגי בוחן ומנתח חברות." },
      { step: "II", title: "איתור הרוכשים.", body: "קרנות פרייבט אקוויטי, רוכשים אסטרטגיים ו-Family Offices בארץ ובעולם. אנחנו ממפים אותם תוך שבועות, לא חודשים." },
      { step: "III", title: "ניהול תהליך תחרותי.", body: "מספר קונים פוטנציאליים, באותו השבוע, סביב אותו השולחן. לא הצעה בודדת, אלא תחרות בריאה. זה הכוח שמשיג לך את המחיר הגבוה ביותר." },
      { step: "IV", title: "סגירת העסקה.", body: "בנקאי השקעות בכיר מעורב אישית בכל שיחה. מהסכם הסודיות (NDA) הראשון ועד לחתימה האחרונה. בלי להעביר אותך לידיים של זוטרים." },
    ],
  },
  trackRecord: {
    eyebrow: "ניסיון מוכח",
    heading: "החברות שבהן הצוות שלנו צמח, בנה וייעץ.",
    lede: "קודם כל אנשי שטח ויועצים פיננסיים, ורק אז מייסדים.",
    logos: EN.trackRecord.logos,
  },
  founders: {
    eyebrow: "הצוות",
    heading: "הוקם על ידי אנשים שישבו בדיוק בצד שלך של השולחן.",
    photoPlaceholder: "תמונת מייסד",
    ofir: {
      name: "אופיר בן חיים",
      role: "שותף מנהל",
      bio: "מעל 40 שנות ניסיון כרואה חשבון בליווי וייעוץ לבעלי עסקים בישראל. הקים ומכר את פירמת OB&H בשנת 2022. ליווה אלפי לקוחות מגזרי התעשייה, הלוגיסטיקה, ההפצה והשירותים. אופיר מכיר מקרוב כל מבנה עסקה אפשרי בשוק הישראלי. אלו שעובדים, ואלו שנועדו להיכשל.",
    },
    ben: {
      name: "בנימין ארונסון",
      role: "שותף מנהל",
      bio: "בנימין מביא עמו ניסיון ניהולי ותפעולי עמוק במגזרי הטכנולוגיה והשירותים בישראל. הקים ומכר את חברת FinancePond בשנת 2024. לאחר שחווה בעצמו את תהליך המכירה מזווית היזם, הוא הקים את גשר כדי להציע לבעלי חברות את התהליך המקצועי והמדויק שהוא עצמו היה מייחל לו.",
    },
    story: [
      "שנינו ישבנו בצד שלך של השולחן. אנחנו מבינים לעומק מה המשמעות של פרידה מחברה שבנית במו ידייך במשך שנים.",
      "בעסקאות של פחות מ-100 מיליון ש״ח, אתה לא מקבל את ג'יי.פי מורגן. אתה מקבל מתווך. אנחנו מריצים בדיוק את אותו תהליך שבנקי ההשקעות הגדולים שומרים לעסקאות של מיליארדים: מיפוי קונים קפדני, תהליך תחרותי אמיתי, ושקיפות מלאה שבה אתה שותף לכל שיחה. רק שהפעם, זה מותאם במיוחד לחברות במחזור של 5 עד 50 מיליון ש״ח.",
    ],
    coda: "",
  },
  selectivity: {
    eyebrow: "מה שמייחד אותנו",
    quote: "מרבית היועצים ילחצו עליך למכור בכל מחיר. אנחנו נדע להגיד לך גם מתי כדאי להמתין.",
    sub: "זו הסיבה שבעלי חברות סומכים עלינו ברגע האמת.",
  },
  contact: {
    eyebrow: "צור קשר",
    heading: "דבר איתנו.",
    lede: "ספר לנו איפה העסק עומד, ונשקף לך בכנות מלאה אם וכיצד נוכל לסייע.",
    note: "עיקר שכר הטרחה שלנו משולם רק כשאתה מוכר. ריטיינר חודשי סמלי שומר על שנינו מחויבים עד אז. אם נראה שאנחנו לא השותף המתאים עבורך, נגיד לך את זה כבר בשיחה הראשונה.",
    labels: {
      name: "שם מלא",
      email: "דוא״ל",
      company: "שם החברה",
      website: "אתר אינטרנט",
      revenue: "מחזור מכירות שנתי",
      stage: "שלב בתהליך",
      message: "משהו נוסף שתרצה שנדע?",
    },
    placeholders: {
      name: "השם שלך",
      email: "you@example.co.il",
      company: "העסק שלך",
      website: "yourbusiness.co.il",
      revenue: "בחר טווח",
      stage: "בחר אפשרות",
      message: "כמה משפטים יספיקו.",
    },
    revenueOptions: ["פחות מ-5 מיליון ש״ח", "בין 5 ל-10 מיליון ש״ח", "בין 10 ל-20 מיליון ש״ח", "בין 20 ל-50 מיליון ש״ח", "מעל 50 מיליון ש״ח", "מעדיף לא לציין"],
    stageOptions: ["בוחן אפשרויות ראשוניות", "מוכן ליציאה לתהליך", "קיבלתי פנייה אקטיבית מרוכש"],
    send: "שליחה",
    orEmail: "או במייל:",
    emailAddress: "hello@gesherpartners.com",
    thanksHeading: "תודה.",
    thanksBody: "אנחנו קוראים באופן אישי כל פנייה. אופיר או בנימין יחזרו אליך תוך שני ימי עסקים.",
  },
  footer: {
    mission: "ליווי עסקאות לצד המוכר עבור עסקים משפחתיים בישראל (מחזור של 5 עד 50 מיליון ש״ח). נבנה במיוחד עבור בעלים שהקדישו עשורים לבניית העסק שלהם.",
    ariaLabel: "כותרת תחתונה",
    disclaimer: "גשר פרטנרס אינה פירמת ייעוץ השקעות מורשית על פי חוק. שום מידע באתר זה אינו מהווה ייעוץ השקעות, המלצה או שידול לביצוע פעולה בניירות ערך.",
    links: {
      valuation: "ניתוח שווי ראשוני",
      contact: "צור קשר",
      privacy: "מדיניות פרטיות",
      terms: "תנאי שימוש",
    },
  },
  modal: {
    eyebrow: "ניתוח שווי ראשוני",
    heading: "הזן כתובת אתר. קבל ניתוח שווי ראשוני וכנה.",
    body: "אנחנו ננתח את פעילות החברה דרך האתר, נצליב את הנתונים עם עסקאות ה-M&A האחרונות במשק הישראלי, ונמפה עבורך את הרוכשים בעלי ההסתברות הגבוהה ביותר לשלם שווי הוגן ומלא. תקבל דוח קצר ותמציתי ישירות אליך, ללא כל התחייבות.",
    open: "לקבלת הניתוח",
    notNow: "לא עכשיו",
    ariaLabel: "ניתוח שווי ראשוני",
  },
  langCode: "he",
};

const StringsContext = createContext<Strings>(EN);
const useS = () => useContext(StringsContext);

// ENGLISH-ONLY (2026-06-04): the Hebrew site is parked, so the language switch
// is hidden everywhere it is used (nav desktop, nav mobile, footer). Flip this
// to true to bring the עב / EN toggle back. The Hebrew copy (HE) and RTL code
// below are kept intact. See also App.tsx "/" route and vite.ts ENGLISH_ONLY.
const SHOW_LANG_SWITCH: boolean = false;

// Render a string as stacked lines, breaking on "\n". Used where the design
// calls for a deliberate two-line break (hero subline, problem heading, quote).
function Lines({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <span key={i} style={{ display: "block" }}>{line}</span>
      ))}
    </>
  );
}

// Language switch. Both languages always visible, the active one bold. Real
// anchor links (full navigation) so the server sets the right per-language head.
function LangSwitch({ className = "" }: { className?: string }) {
  const S = useS();
  if (!SHOW_LANG_SWITCH) return null;
  const isHe = S.langCode === "he";
  return (
    <div className={`lang-switch ${className}`.trim()} role="group" aria-label="Language / שפה">
      <a href="/" lang="he" className={isHe ? "lang-on" : ""} aria-current={isHe ? "true" : undefined}>עב</a>
      <span className="lang-sep" aria-hidden="true">/</span>
      <a href="/en/" lang="en" className={!isHe ? "lang-on" : ""} aria-current={!isHe ? "true" : undefined}>EN</a>
    </div>
  );
}

type ButtonProps = {
  variant?: "primary" | "outline" | "on-navy" | "on-navy-outline";
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
    variant === "on-navy-outline" ? "btn-on-navy-outline" : "",
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

function Nav({ onTalk }: { onTalk: () => void }) {
  const S = useS();
  const [open, setOpen] = useState(false);

  // Lock body scroll while the mobile menu is open. Esc closes it.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
  }
  function go(id: string) {
    close();
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) window.scrollTo({ top: el.offsetTop - 24, behavior: "smooth" });
    });
  }

  return (
    <nav className="nav" aria-label={S.nav.primaryAriaLabel}>
      <a href="#top" aria-label={S.nav.homeAriaLabel} style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
        <img className="brand-mark" src="/brand/gesher-mark.svg" alt="" style={{ height: 36, display: "block" }} />
        <img className="wordmark" src="/brand/gesher-wordmark.svg" alt="gesher" />
      </a>

      {/* Desktop links, hidden on mobile via CSS */}
      <div className="nav-links">
        <a href="#process">{S.nav.howItWorks}</a>
        <a href="#founders">{S.nav.founders}</a>
        <LangSwitch />
      </div>

      {/* Mobile hamburger, hidden on desktop via CSS */}
      <button
        type="button"
        className="nav-toggle"
        aria-label={S.nav.menuAriaLabel}
        aria-expanded={open}
        aria-controls="nav-menu"
        onClick={() => setOpen(true)}
      >
        <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
          <path d="M0 1h22M0 7h22M0 13h22" stroke="currentColor" strokeWidth="1.25" fill="none" strokeLinecap="square" />
        </svg>
      </button>

      {/* Mobile menu sheet */}
      {open && (
        <div id="nav-menu" className="nav-menu" role="dialog" aria-modal="true" aria-label={S.nav.menuAriaLabel}>
          <div className="nav-menu-bar">
            <a href="#top" aria-label={S.nav.homeAriaLabel} onClick={close} style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
              <img className="brand-mark" src="/brand/gesher-mark.svg" alt="" style={{ height: 36, display: "block" }} />
              <img className="wordmark" src="/brand/gesher-wordmark.svg" alt="gesher" />
            </a>
            <button type="button" className="nav-toggle" aria-label={S.nav.closeAriaLabel} onClick={close}>
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M2 2l16 16M18 2L2 18" stroke="currentColor" strokeWidth="1.25" fill="none" strokeLinecap="square" />
              </svg>
            </button>
          </div>

          <ul className="nav-menu-list">
            <li>
              <a href="#process" onClick={(e) => { e.preventDefault(); go("process"); }}>
                {S.nav.howItWorks}
              </a>
            </li>
            <li>
              <a href="#founders" onClick={(e) => { e.preventDefault(); go("founders"); }}>
                {S.nav.founders}
              </a>
            </li>
            {SHOW_LANG_SWITCH && (
              <li>
                <LangSwitch className="lang-switch-mobile" />
              </li>
            )}
          </ul>

          <div className="nav-menu-cta">
            <Button onClick={() => { close(); onTalk(); }} arrow style={{ width: "100%" }}>
              {S.nav.talkToUs}
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}

function Hero({ onOpenValuation, onTalk }: { onOpenValuation: () => void; onTalk: () => void }) {
  const S = useS();
  return (
    <header className="hero" id="top">
      <video
        className="hero-video"
        src="/manus-storage/hero_06053d8a.mp4"
        poster="/manus-storage/hero-poster_e70d346e.png"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
      <div className="hero-wash" aria-hidden="true"></div>

      <div className="container hero-container">
        <div className="hero-copy">
          <p className="eyebrow">{S.hero.eyebrow}</p>
          <h1 className="display hero-headline">
            {S.hero.headlineLead}{" "}
            <span className="hl-emph emph-italic">{S.hero.headlineEmph}</span>
            {S.hero.headlineTrail}
          </h1>
          <p className="lede"><Lines text={S.hero.lede} /></p>
          <div className="hero-actions">
            <Button size="lg" onClick={onTalk} arrow>
              {S.hero.ctaTalk}
            </Button>
            <Button size="lg" variant="outline" onClick={onOpenValuation}>
              {S.hero.ctaValuation}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

function Problem() {
  const S = useS();
  return (
    <section className="section problem">
      <div className="container">
        <p className="eyebrow">{S.problem.eyebrow}</p>
        <h2 className="display"><Lines text={S.problem.heading} /></h2>
        {S.problem.paras.map((p, i) => (
          <p key={i} style={{ fontSize: 18, color: "var(--near-black)" }}>
            {p}
          </p>
        ))}
      </div>
    </section>
  );
}

function StatRow() {
  const S = useS();
  return (
    <section className="section-tight">
      <div className="container">
        <div className="stats">
          {S.stats.items.map((s, i) => (
            <div className="stat" key={i}>
              <p className={`num${s.accent ? " accent" : ""}`}>
                <span className="v">{s.value}</span>
                <span className="u">{s.unit}</span>
              </p>
              <p className="lbl">{s.lbl}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Process section. ENGLISH-ONLY redesign (2026-06-04), built from the "How we
// sell Kitaron" one-pager: a one-buyer-vs-auction chart, a rising staircase of
// four steps, and a visual "you do / we do" split. Inline while English-only;
// the parked Hebrew strings stay as a reference for the later pass with Ofir.
const PROCESS_STEPS = [
  { step: "01", title: "Prepare", body: "Clean numbers and a sharp story", Icon: FileText },
  { step: "02", title: "Find every buyer", body: "Every serious buyer", Icon: Search },
  { step: "03", title: "Run the auction", body: "Many buyers, your true market value", Icon: Gavel },
  { step: "04", title: "Close and protect you", body: "All the way to the best offer", Icon: ShieldCheck },
];
const PROCESS_YOU = [
  { label: "Run your business", Icon: Briefcase },
  { label: "Join the key meetings, we prep you for each", Icon: Users },
];
const PROCESS_WE = [
  { label: "Create materials", Icon: FileText },
  { label: "Buyer search", Icon: Search },
  { label: "Auction", Icon: Gavel },
  { label: "Legal & tax", Icon: Scale },
  { label: "Negotiation", Icon: Handshake },
  { label: "Paperwork & close", Icon: FileSignature },
];
// One buyer pays the one-offer level. Competitive bidding stacks a burgundy
// "gap" on top of that same level, and the gap is the seller's upside. Heights
// are illustrative pixels. ONE_OFFER is the shared navy base (the one-offer
// level); keep it in sync with --offer in home.css. GAP_BARS are the burgundy
// tops, rising bar to bar.
const ONE_OFFER = 92;
const GAP_BARS = [20, 44, 68, 92, 114];

function Process() {
  return (
    <section className="section" id="process" style={{ background: "var(--warm-white)" }}>
      <div className="container">
        <p className="eyebrow">The process</p>
        <h2 className="display">How we help you.</h2>
        <p className="tag-italic">A process that finds your true market value</p>

        <div className="bidchart">
          <div className="bidchart-plot">
            <div className="bidchart-base" />
            <div className="bidchart-offer" />

            <div className="bidchart-groups">
              {/* One buyer: a single navy bar at the one-offer level. */}
              <div className="bidchart-core">
                <span className="bidchart-glabel">One buyer</span>
                <div className="bidchart-cols">
                  <div className="bidchart-col">
                    <div className="bidchart-bar">
                      <span className="bidchart-seg bidchart-seg--navy" style={{ height: ONE_OFFER }} />
                    </div>
                    <span className="bidchart-foot"><User size={18} strokeWidth={1.5} /></span>
                  </div>
                </div>
              </div>

              {/* Competitive bidding: navy base + rising burgundy gap, bracket to the right. */}
              <div className="bidchart-many">
                <div className="bidchart-core">
                  <span className="bidchart-glabel">Competitive bidding</span>
                  <span className="bidchart-offer-cap">the one-offer level</span>
                  <div className="bidchart-cols">
                    {GAP_BARS.map((g, i) => (
                      <div className="bidchart-col" key={i}>
                        <div className="bidchart-bar">
                          <span className="bidchart-seg bidchart-seg--gap" style={{ height: g }} />
                          <span className="bidchart-seg bidchart-seg--navy" style={{ height: ONE_OFFER }} />
                        </div>
                        <span className="bidchart-foot"><User size={18} strokeWidth={1.5} /></span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bidchart-bracket" style={{ height: GAP_BARS[GAP_BARS.length - 1], marginBottom: ONE_OFFER + 32 }}>
                  <span className="bidchart-bracket-label">The gap is yours</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="process-stairs-head">
          <span className="process-bestprice"><ArrowUpRight size={16} strokeWidth={2} /> Your best price</span>
        </div>
        <ol className="process-stairs">
          {PROCESS_STEPS.map((s) => (
            <li className="process-step" key={s.step}>
              <span className="process-step-icon"><s.Icon size={24} strokeWidth={1.5} /></span>
              <p className="step">{s.step}</p>
              <h3 className="serif">{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>

        <div className="process-handoff">
          <p className="eyebrow">What you do, what we do</p>
          <div className="process-split">
            <div className="process-col">
              <p className="process-split-label">You</p>
              <ul className="process-you-list">
                {PROCESS_YOU.map((it, i) => (
                  <li key={i}><it.Icon size={20} strokeWidth={1.5} /><span>{it.label}</span></li>
                ))}
              </ul>
            </div>
            <div className="process-col process-col--we">
              <p className="process-split-label">We</p>
              <ul className="process-we-list">
                {PROCESS_WE.map((it, i) => (
                  <li key={i}><it.Icon size={24} strokeWidth={1.5} /><span>{it.label}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrackRecord() {
  const S = useS();
  return (
    <section className="section-tight">
      <div className="container">
        <p className="eyebrow">{S.trackRecord.eyebrow}</p>
        <h2 className="display">{S.trackRecord.heading}</h2>
        <div className="logos">
          {S.trackRecord.logos.map((l, i) => (
            <img key={i} className="track-logo" src={l.src} alt={l.alt} style={{ height: l.height }} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Founders() {
  const S = useS();
  return (
    <section className="section" id="founders">
      <div className="container" style={{ fontFamily: "Inter" }}>
        <p className="eyebrow">{S.founders.eyebrow}</p>
        <h2 className="display">{S.founders.heading}</h2>
        <div className="founders">
          <div className="founder-card">
            <div className="founder-photo founder-photo--ofir" role="img" aria-label={S.founders.ofir.name}></div>
            <h3 className="founder-name">{S.founders.ofir.name}</h3>
            <p className="founder-role">{S.founders.ofir.role}</p>
            <p className="founder-bio">{S.founders.ofir.bio}</p>
          </div>
          <div className="founder-card">
            <div className="founder-photo founder-photo--ben" role="img" aria-label={S.founders.ben.name}></div>
            <h3 className="founder-name">{S.founders.ben.name}</h3>
            <p className="founder-role">{S.founders.ben.role}</p>
            <p className="founder-bio">{S.founders.ben.bio}</p>
          </div>
        </div>
        <div className="founder-story">
          {S.founders.story.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
          <p className="founder-coda">{S.founders.coda}</p>
        </div>
      </div>
    </section>
  );
}

function Selectivity() {
  const S = useS();
  return (
    <section className="section-navy">
      <div className="container">
        <div className="selectivity">
          <p className="eyebrow selectivity-eyebrow">{S.selectivity.eyebrow}</p>
          <p className="quote"><Lines text={S.selectivity.quote} /></p>
          <p className="sub">{S.selectivity.sub}</p>
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const S = useS();
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [revenue, setRevenue] = useState("");
  const [stage, setStage] = useState("");
  const [message, setMessage] = useState("");
  const { labels, placeholders, revenueOptions, stageOptions } = S.contact;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const composed = [
      message.trim(),
      company.trim() && `Company: ${company.trim()}`,
      website.trim() && `Website: ${website.trim()}`,
      revenue && `Revenue: ${revenue}`,
      stage && `Stage: ${stage}`,
    ]
      .filter(Boolean)
      .join("\n");
    // Fire and forget. The thank-you shows regardless; the lead is best-effort.
    fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        message: composed || "(no message)",
        role: stage || undefined,
      }),
    }).catch(() => {});
  }

  return (
    <section className="section" id="contact" style={{ background: "var(--warm-white)" }}>
      <div className="container narrow">
        <p className="eyebrow">{S.contact.eyebrow}</p>
        <h2 className="display">{S.contact.heading}</h2>
        <p className="lede">{S.contact.lede}</p>
        <p className="contact-note">{S.contact.note}</p>

        {submitted ? (
          <div className="contact-thanks">
            <h3 className="serif" style={{ marginBottom: 8 }}>
              {S.contact.thanksHeading}
            </h3>
            <p style={{ margin: 0 }}>{S.contact.thanksBody}</p>
          </div>
        ) : (
          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">{labels.name}</label>
              <input id="name" type="text" placeholder={placeholders.name} required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="email">{labels.email}</label>
              <input id="email" type="email" placeholder={placeholders.email} required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="company">{labels.company}</label>
              <input id="company" type="text" placeholder={placeholders.company} value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="website">{labels.website}</label>
              <input id="website" type="url" placeholder={placeholders.website} value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="revenue">{labels.revenue}</label>
              <select id="revenue" value={revenue} onChange={(e) => setRevenue(e.target.value)}>
                <option value="" disabled>
                  {placeholders.revenue}
                </option>
                {revenueOptions.map((o, i) => (
                  <option key={i}>{o}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="stage">{labels.stage}</label>
              <select id="stage" value={stage} onChange={(e) => setStage(e.target.value)}>
                <option value="" disabled>
                  {placeholders.stage}
                </option>
                {stageOptions.map((o, i) => (
                  <option key={i}>{o}</option>
                ))}
              </select>
            </div>
            <div className="field full">
              <label htmlFor="message">{labels.message}</label>
              <textarea id="message" placeholder={placeholders.message} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <div className="form-actions">
              <Button type="submit" size="lg" arrow>
                {S.contact.send}
              </Button>
              <span className="note">
                {S.contact.orEmail}{" "}
                <a href={`mailto:${S.contact.emailAddress}`}>{S.contact.emailAddress}</a>
              </span>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

function Footer() {
  const S = useS();
  const [, navigate] = useLocation();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-lockup">
              <img src="/brand/gesher-mark.svg" alt="" style={{ height: 32, display: "block" }} />
              <img className="footer-mark" src="/brand/gesher-wordmark.svg" alt="gesher" />
            </div>
            <p className="footer-mission">{S.footer.mission}</p>
          </div>
          <div className="footer-links" aria-label={S.footer.ariaLabel}>
            <a href="#process">{S.nav.howItWorks}</a>
            <a href="#founders">{S.nav.founders}</a>
            <a href="/valuation" onClick={(e) => { e.preventDefault(); navigate("/valuation"); }}>
              {S.footer.links.valuation}
            </a>
            <a href="#contact">{S.footer.links.contact}</a>
            <a href="/privacy" onClick={(e) => { e.preventDefault(); navigate("/privacy"); }}>
              {S.footer.links.privacy}
            </a>
            <a href="/terms" onClick={(e) => { e.preventDefault(); navigate("/terms"); }}>
              {S.footer.links.terms}
            </a>
            <LangSwitch />
          </div>
        </div>
        <div className="footer-bottom">{S.footer.disclaimer}</div>
      </div>
    </footer>
  );
}

function ValuationModal({ open, onClose, onOpenBrief }: { open: boolean; onClose: () => void; onOpenBrief: () => void }) {
  const S = useS();
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={S.modal.ariaLabel}>
        <p className="eyebrow">{S.modal.eyebrow}</p>
        <h3 className="serif modal-heading">{S.modal.heading}</h3>
        <p className="modal-body">
          {S.modal.body}
        </p>
        <div className="modal-actions">
          <Button size="md" onClick={onOpenBrief} arrow>
            {S.modal.open}
          </Button>
          <Button size="md" variant="outline" onClick={onClose}>
            {S.modal.notNow}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Home({ lang = "en" }: { lang?: "en" | "he" }) {
  const [, navigate] = useLocation();
  const [modalOpen, setModalOpen] = useState(false);
  const strings = lang === "he" ? HE : EN;
  const dir = lang === "he" ? "rtl" : "ltr";

  // Keep the document root in sync for client-side navigation. The server sets
  // these on first load; this covers SPA transitions. On unmount we reset to the
  // app default (English / LTR), since every non-home route is English.
  useEffect(() => {
    const el = document.documentElement;
    el.lang = lang;
    el.setAttribute("dir", dir);
    return () => {
      el.lang = "en";
      el.setAttribute("dir", "ltr");
    };
  }, [lang, dir]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 24, behavior: "smooth" });
  }

  return (
    <StringsContext.Provider value={strings}>
      <div className={lang === "he" ? "gesher gesher-rtl" : "gesher"} lang={lang} dir={dir}>
        <header className="site-header">
          <div className="container">
            <Nav onTalk={() => scrollTo("contact")} />
          </div>
        </header>
        <Hero onOpenValuation={() => setModalOpen(true)} onTalk={() => scrollTo("contact")} />
        <Problem />
        <StatRow />
        <Process />
        <TrackRecord />
        <Founders />
        <Selectivity />
        <Contact />
        <Footer />
        <ValuationModal open={modalOpen} onClose={() => setModalOpen(false)} onOpenBrief={() => navigate("/valuation")} />
      </div>
    </StringsContext.Provider>
  );
}
