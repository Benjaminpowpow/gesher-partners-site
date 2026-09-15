/**
 * Home — the Gesher homepage (v4).
 *
 * Ported from the locked v4 mockup (vault: PROJECTS/israel-ai-investment-bank/
 * site/14-homepage-mock-v4-locked.md and its template HTML), with the final
 * English wording from 17-homepage-final-copy.md. Where the template and the
 * copy file disagreed on words, the copy file won.
 *
 * Section order: nav, hero, proof strip, logo strip, the challenge, why this
 * works, the process (Spotlight), the team, sectors, questions, navy band,
 * contact, footer.
 *
 * The hero is untouched from the live site: same video, same cream wash, same
 * copy, same two buttons.
 *
 * All styling lives in home.css, scoped under .gesher so the generic class
 * names never bleed into other routes.
 *
 * HEBREW (parked). This page is English only. The old EN/HE string tables and
 * the language switch were removed with the v4 port, because the Hebrew copy
 * described a page that no longer exists. The locked Hebrew source is in the
 * vault at site/10-hebrew-homepage-copy-locked.md, and the old tables are in
 * git history before the v4 port. The Hebrew pass starts from the new English
 * copy: English source, Gemini, Ofir reviews, verbatim back.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { FAQ_ITEMS } from "@shared/faq";
import "./home.css";

/* ─── Copy ────────────────────────────────────────────────────────────────── */

const COPY = {
  nav: {
    homeAriaLabel: "gesher home",
    primaryAriaLabel: "Primary",
    tagline: "Your sell-side advisor",
    menuAriaLabel: "Menu",
    closeAriaLabel: "Close menu",
    talkToUs: "Talk to us",
    links: [
      { id: "how", label: "How it works" },
      { id: "founders", label: "Founders" },
      { id: "sectors", label: "Sectors" },
      { id: "faq", label: "Questions" },
    ],
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
  challenge: {
    eyebrow: "The challenge",
    headingLines: ["You built something.", "You have one shot to get this right."],
    line: "Most owners do this once. The buyer across the table has done it many times.",
  },
  why: {
    eyebrow: "Why this works",
    headingLines: ["One buyer sets the price.", "Many buyers set the market."],
    paras: [
      "A broker lists your business and waits. Whoever shows up sets the terms.",
      "We do the opposite. We find every serious buyer, screen them, and bring them to one deadline. They compete. Competition sets the price, not one buyer.",
      "Big banks will not take a deal this size. Brokers will not run this process. That gap is why we exist.",
    ],
    chartCaption: "A process that finds your true market value",
    chartAlt:
      "One buyer sets one price. Competitive bidding pushes the price up. The gap is yours.",
  },
  process: {
    eyebrow: "The process",
    heading: "How we sell your business.",
    lede: "Three steps. What happens, and what you get.",
    youGet: "You get",
    steps: [
      {
        id: 1,
        roadLabel: "GET YOU A NUMBER",
        outcome: "A real range and a plan. Sell now, sell later, or not at all.",
        lead: "We give you a professional valuation.",
        body: "Quietly. We rebuild your financials with the buyer in mind and map every buyer who would want you. No buyer is contacted without your approval.",
      },
      {
        id: 2,
        roadLabel: "RUN THE AUCTION",
        outcome:
          "Written offers side by side. We negotiate the best one, on price and on your life after.",
        lead: "We run the auction.",
        body: "Serious buyers, screened by us, compete on one deadline. We sit with you in every meeting.",
      },
      {
        id: 3,
        roadLabel: "CLOSE",
        outcome: "The deal done. Your time is yours again.",
        lead: "We close.",
        body: "Your lawyer, your accountant, and us at one table. Every document explained in plain words before you sign.",
      },
    ],
  },
  team: {
    eyebrow: "The team",
    heading: "Built by people who have been on your side of the table.",
    people: [
      {
        photo: "/founders/gesher_ofir_final.jpg",
        name: "Ofir Ben Haim, CPA",
        role: "Managing partner",
        bio: "40+ years advising Israeli business owners. He has seen every deal structure that works here, and several that do not.",
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
  band: {
    eyebrow: "What sets us apart",
    headingLines: ["Most advisors push you to sell.", "We tell you when to wait."],
    line: "That is why owners trust us when it is time.",
    cta: "When you're ready",
  },
  contact: {
    eyebrow: "Get in touch",
    heading: "Start with a conversation.",
    lede: "Tell us where you are. We will tell you honestly whether we can help.",
    win: "When you win, we win.",
    orEmail: "Or email",
    emailAddress: "hello@gesherpartners.com",
    labels: {
      name: "Name",
      reach: "Phone or email",
      revenue: "Annual revenue",
      message: "Anything you want us to know",
    },
    placeholders: {
      name: "Your name",
      reach: "How to reach you",
      revenue: "Select range",
      message: "Optional",
    },
    revenueOptions: [
      "Under 5M NIS",
      "5–10M NIS",
      "10–20M NIS",
      "20–50M NIS",
      "50M+ NIS",
      "Prefer not to say",
    ],
    send: "Send",
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
    ] as const,
  },
};

/* ─── Media ───────────────────────────────────────────────────────────────── */

// HERO MEDIA (2026-09-07): the file lives in this repo at client/public/hero/,
// not in someone else's storage bucket. Set HERO_VIDEO to "" to render no
// <video> at all.
const HERO_VIDEO: string = "/hero/hero.mp4";
const HERO_POSTER: string | undefined = "/hero/hero-poster.jpg";

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

// The lockup: mark, wordmark, and the line under it. One piece, used in the
// nav, the mobile menu and the footer.
function Lockup({ markHeight = 34 }: { markHeight?: number }) {
  return (
    <span className="lockup">
      <span className="lockup-row">
        <img className="brand-mark" src="/brand/gesher-mark.svg" alt="" style={{ height: markHeight, display: "block" }} />
        <img className="wordmark" src="/brand/gesher-wordmark.svg" alt="gesher" style={{ height: markHeight * 0.85 }} />
      </span>
      <span className="lockup-tag">{COPY.nav.tagline}</span>
    </span>
  );
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

function Nav({ onTalk }: { onTalk: () => void }) {
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

  const close = () => setOpen(false);
  function go(id: string) {
    close();
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) window.scrollTo({ top: el.offsetTop - 24, behavior: "smooth" });
    });
  }

  return (
    <nav className="nav" aria-label={COPY.nav.primaryAriaLabel}>
      <a href="#top" aria-label={COPY.nav.homeAriaLabel} className="nav-lockup">
        <Lockup />
      </a>

      {/* Desktop links, hidden on mobile via CSS */}
      <div className="nav-links">
        {COPY.nav.links.map((l) => (
          <a key={l.id} href={`#${l.id}`}>
            {l.label}
          </a>
        ))}
        <Button size="sm" onClick={onTalk}>
          {COPY.nav.talkToUs}
        </Button>
      </div>

      {/* Mobile hamburger, hidden on desktop via CSS */}
      <button
        type="button"
        className="nav-toggle"
        aria-label={COPY.nav.menuAriaLabel}
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
        <div id="nav-menu" className="nav-menu" role="dialog" aria-modal="true" aria-label={COPY.nav.menuAriaLabel}>
          <div className="nav-menu-bar">
            <a href="#top" aria-label={COPY.nav.homeAriaLabel} onClick={close} className="nav-lockup">
              <Lockup />
            </a>
            <button type="button" className="nav-toggle" aria-label={COPY.nav.closeAriaLabel} onClick={close}>
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M2 2l16 16M18 2L2 18" stroke="currentColor" strokeWidth="1.25" fill="none" strokeLinecap="square" />
              </svg>
            </button>
          </div>

          <ul className="nav-menu-list">
            {COPY.nav.links.map((l) => (
              <li key={l.id}>
                <a
                  href={`#${l.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    go(l.id);
                  }}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="nav-menu-cta">
            <Button
              onClick={() => {
                close();
                onTalk();
              }}
              arrow
              style={{ width: "100%" }}
            >
              {COPY.nav.talkToUs}
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ─── Hero (unchanged from the live site) ─────────────────────────────────── */

function Hero({ onOpenValuation, onTalk }: { onOpenValuation: () => void; onTalk: () => void }) {
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
        />
      )}
      <div className="hero-wash" aria-hidden="true"></div>

      <div className="container hero-container">
        <div className="hero-copy">
          <p className="eyebrow">{COPY.hero.eyebrow}</p>
          <h1 className="display hero-headline">
            {COPY.hero.headlineLead}{" "}
            <span className="hl-emph emph-italic">{COPY.hero.headlineEmph}</span>
            {COPY.hero.headlineTrail}
          </h1>
          <p className="lede">
            <Lines lines={COPY.hero.lede.split("\n")} />
          </p>
          <div className="hero-actions">
            <Button size="lg" onClick={onTalk} arrow>
              {COPY.hero.ctaTalk}
            </Button>
            <Button size="lg" variant="outline" onClick={onOpenValuation}>
              {COPY.hero.ctaValuation}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ─── Proof strip ─────────────────────────────────────────────────────────── */

function ProofStrip() {
  return (
    <section className="proof">
      <div className="container">
        <div className="proof-row">
          {COPY.proof.map((s, i) => (
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
  const set = (hidden: boolean) => (
    <div className="marquee-set" aria-hidden={hidden ? true : undefined}>
      {/* No loading="lazy" here on purpose. The browser only loads a lazy image
          when it comes into view, and these sit on a track that slides left,
          so a logo that starts off screen is never asked for and the slot stays
          blank. Seven small logos load eagerly without a fuss. */}
      {COPY.logos.items.map((l, i) => (
        <img key={i} src={l.src} alt={hidden ? "" : l.alt} className={l.tall ? "tall" : undefined} />
      ))}
    </div>
  );
  return (
    <section className="logostrip">
      <div className="container">
        <p className="eyebrow logostrip-label">{COPY.logos.label}</p>
      </div>
      <div className="marquee" aria-label={COPY.logos.items.map((l) => l.alt).join(", ")}>
        <div className="marquee-track">
          {set(false)}
          {set(true)}
        </div>
      </div>
    </section>
  );
}

/* ─── The challenge ───────────────────────────────────────────────────────── */

function Challenge() {
  return (
    <section className="section challenge">
      <div className="container">
        <p className="eyebrow">{COPY.challenge.eyebrow}</p>
        <h2 className="display">
          <Lines lines={COPY.challenge.headingLines} />
        </h2>
        <p className="lede challenge-line">{COPY.challenge.line}</p>
      </div>
    </section>
  );
}

/* ─── Why this works ──────────────────────────────────────────────────────── */

function WhyThisWorks() {
  return (
    <section className="section why" id="why">
      <div className="container why-grid">
        <div>
          <p className="eyebrow">{COPY.why.eyebrow}</p>
          <h2 className="display">
            <Lines lines={COPY.why.headingLines} />
          </h2>
          {COPY.why.paras.map((p, i) => (
            <p className="lede why-para" key={i}>
              {p}
            </p>
          ))}
        </div>
        <div>
          {/* One buyer pays the one-offer level. Competitive bidding stacks a
              burgundy gap on top of that same level, and the gap is the
              seller's upside. Heights are illustrative, not a real deal. */}
          <svg className="gapchart" viewBox="0 0 520 300" role="img" aria-label={COPY.why.chartAlt}>
            <line x1="20" y1="256" x2="500" y2="256" stroke="#DCD4C4" strokeWidth="1" />
            <line x1="20" y1="150" x2="440" y2="150" stroke="#6F6757" strokeWidth="1" strokeDasharray="4 5" />
            <text x="24" y="142" fontFamily="Newsreader,Georgia,serif" fontStyle="italic" fontSize="13" fill="#6F6757">
              the one-offer level
            </text>
            <rect x="40" y="150" width="56" height="106" fill="#16243B" />
            <g>
              <rect x="176" y="150" width="44" height="106" fill="#16243B" />
              <rect x="176" y="128" width="44" height="22" fill="#6E2B2B" />
              <rect x="236" y="150" width="44" height="106" fill="#16243B" />
              <rect x="236" y="108" width="44" height="42" fill="#6E2B2B" />
              <rect x="296" y="150" width="44" height="106" fill="#16243B" />
              <rect x="296" y="86" width="44" height="64" fill="#6E2B2B" />
              <rect x="356" y="150" width="44" height="106" fill="#16243B" />
              <rect x="356" y="62" width="44" height="88" fill="#6E2B2B" />
              <rect x="416" y="150" width="44" height="106" fill="#16243B" />
              <rect x="416" y="36" width="44" height="114" fill="#6E2B2B" />
            </g>
            <line x1="478" y1="36" x2="478" y2="150" stroke="#6E2B2B" strokeWidth="1" />
            <line x1="472" y1="36" x2="484" y2="36" stroke="#6E2B2B" strokeWidth="1" />
            <line x1="472" y1="150" x2="484" y2="150" stroke="#6E2B2B" strokeWidth="1" />
            <text
              x="500"
              y="93"
              fontFamily="Inter,system-ui,sans-serif"
              fontSize="10"
              fontWeight="600"
              letterSpacing="1.4"
              fill="#6E2B2B"
              transform="rotate(90 500 93)"
              textAnchor="middle"
            >
              THE GAP IS YOURS
            </text>
            <g
              fill="#16243B"
              fontFamily="Inter,system-ui,sans-serif"
              fontSize="10"
              fontWeight="500"
              letterSpacing="1.4"
              textAnchor="middle"
            >
              <text x="68" y="282">ONE BUYER</text>
              <text x="318" y="282">COMPETITIVE BIDDING</text>
            </g>
          </svg>
          <p className="chart-cap">{COPY.why.chartCaption}</p>
        </div>
      </div>
    </section>
  );
}

/* ─── The process (Spotlight) ─────────────────────────────────────────────── */

const STEP_COUNT = COPY.process.steps.length;
// How far along the road the navy fill sits for each step. The path is drawn
// with pathLength 100, so these are "100 minus percent filled".
const ROAD_OFFSET: Record<number, number> = { 1: 85, 2: 52, 3: 15 };
const TICK_MS = 3000;

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

function rotate(order: number[]) {
  return [...order.slice(1), order[0]];
}

type RoadProps = {
  variant: "desktop" | "phone";
  current: number;
  onPick: (n: number) => void;
};

function Road({ variant, current, onPick }: RoadProps) {
  const desktop = variant === "desktop";
  const path = desktop
    ? "M20 108 C 260 108, 420 96, 560 78 S 900 34, 1040 26"
    : "M14 92 C 110 92, 160 84, 200 66 S 320 26, 361 22";
  const width = desktop ? 18 : 14;
  const stones = desktop
    ? [
        { s: 1, cx: 177, cy: 106, ly: 62 },
        { s: 2, cx: 530, cy: 82, ly: 38 },
        { s: 3, cx: 883, cy: 41, ly: 92 },
      ]
    : [
        { s: 1, cx: 62, cy: 91, ly: 66 },
        { s: 2, cx: 196, cy: 68, ly: 42 },
        { s: 3, cx: 336, cy: 26, ly: 62 },
      ];
  const r = desktop ? 16 : 14;
  const labelSize = desktop ? 10.5 : 8.5;

  return (
    <svg
      className={`road-ctl ${desktop ? "road-ctl-d" : "road-ctl-m"}`}
      viewBox={desktop ? "0 0 1060 150" : "0 0 375 120"}
      aria-hidden="true"
    >
      <path d={path} stroke="#DCD4C4" strokeWidth={width} fill="none" strokeLinecap="round" />
      <path
        className="road-fill"
        d={path}
        stroke="#16243B"
        strokeWidth={width}
        fill="none"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={100}
        strokeDashoffset={ROAD_OFFSET[current]}
      />
      <path
        d={path}
        stroke="#F5F0E6"
        strokeWidth={desktop ? 1.5 : 1.2}
        fill="none"
        strokeDasharray={desktop ? "6 8" : "4 6"}
      />
      <g className="road-btns" fontFamily="Newsreader,Georgia,serif" fontSize={desktop ? 17 : 15} fontWeight="500" textAnchor="middle">
        {stones.map((st, i) => (
          <g
            key={st.s}
            className={current === st.s ? "on" : undefined}
            onClick={() => onPick(st.s)}
            style={{ cursor: "pointer" }}
          >
            <circle cx={st.cx} cy={st.cy} r={r} />
            <text x={st.cx} y={st.cy + (desktop ? 6 : 5)}>
              {st.s}
            </text>
            <text
              className="lbl"
              x={st.cx}
              y={st.ly}
              fontFamily="Inter,system-ui,sans-serif"
              fontSize={labelSize}
              fontWeight="600"
              letterSpacing={desktop ? 1.2 : 1}
            >
              {COPY.process.steps[i].roadLabel}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function CheckIcon() {
  return (
    <span className="ico" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M4 12l5 5L20 6" />
      </svg>
    </span>
  );
}

/**
 * The Spotlight process.
 *
 * Desktop: three columns side by side, all three always readable. The lit one
 * is full ink with a wine underline, the other two sit dimmed.
 *
 * Phone: the same three steps stacked like a wheel, the lit one on top. Every
 * tick the list rolls up by one, so the step that just finished drops to the
 * bottom. Every step stays in the page code either way, so search engines and
 * AI crawlers read the whole story.
 *
 * The light moves on its own every three seconds, but only while the section
 * is on screen, and it pauses while the mouse is over it. The first click
 * anywhere in the section stops it for good and leaves it where the reader put
 * it. If the visitor asked their device to reduce motion, it never moves.
 */
function ProcessSpotlight() {
  const rootRef = useRef<HTMLDivElement>(null);
  const spotsRef = useRef<HTMLDivElement>(null);

  const [current, setCurrent] = useState(1);
  const [stopped, setStopped] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [hovering, setHovering] = useState(false);

  // Phone wheel state. `order` is the render order of the three steps, `slide`
  // is how far to push the list up during a roll, and `lockHeight` freezes the
  // wheel while the extra trailing copy is in the DOM so the page cannot jump.
  const [order, setOrder] = useState<number[]>([1, 2, 3]);
  const [slide, setSlide] = useState(0);
  const [lockHeight, setLockHeight] = useState(0);

  const isPhone = useMediaQuery("(max-width: 860px)");
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const pick = useCallback((n: number) => {
    setStopped(true);
    setCurrent(((n - 1) % STEP_COUNT + STEP_COUNT) % STEP_COUNT + 1);
  }, []);

  // Only run while the section is on screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setOnScreen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => setOnScreen(e.isIntersecting)),
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The three-second tick.
  useEffect(() => {
    if (reduceMotion || stopped || hovering || !onScreen) return;
    const t = window.setInterval(() => setCurrent((c) => (c % STEP_COUNT) + 1), TICK_MS);
    return () => window.clearInterval(t);
  }, [reduceMotion, stopped, hovering, onScreen]);

  // Roll the phone wheel so the lit step sits on top. On desktop the three
  // steps are grid columns, so they must stay in 1-2-3 order.
  useLayoutEffect(() => {
    if (!isPhone) {
      setOrder((o) => (o[0] === 1 && o[1] === 2 ? o : [1, 2, 3]));
      setSlide(0);
      setLockHeight(0);
      return;
    }
    if (order[0] === current || slide > 0) return;
    const list = spotsRef.current;
    const first = list?.firstElementChild as HTMLElement | null;
    if (!list || !first) return;
    if (reduceMotion) {
      setOrder((o) => rotate(o));
      return;
    }
    const gap = parseFloat(getComputedStyle(list).rowGap || "0") || 0;
    setLockHeight(list.getBoundingClientRect().height);
    setSlide(first.getBoundingClientRect().height + gap);
  }, [current, isPhone, order, slide, reduceMotion]);

  function finishRoll() {
    setOrder((o) => rotate(o));
    setSlide(0);
    setLockHeight(0);
  }

  const rendered = isPhone && slide > 0 ? [...order, order[0]] : order;
  const stepById = (id: number) => COPY.process.steps.find((s) => s.id === id)!;

  return (
    <section className="section process" id="how">
      <div className="container">
        <div className="process-intro">
          <div>
            <p className="eyebrow">{COPY.process.eyebrow}</p>
            <h2 className="display">{COPY.process.heading}</h2>
          </div>
          <p className="lede">{COPY.process.lede}</p>
        </div>

        <div
          className="stepper"
          ref={rootRef}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          <Road variant="desktop" current={current} onPick={pick} />
          <Road variant="phone" current={current} onPick={pick} />

          <div className="sp-pills" role="group" aria-label="Steps">
            {COPY.process.steps.map((s) => (
              <button
                key={s.id}
                type="button"
                className={current === s.id ? "on" : undefined}
                aria-pressed={current === s.id}
                onClick={() => pick(s.id)}
              >
                {s.id}
              </button>
            ))}
          </div>

          <div className="wheel" style={lockHeight ? { height: lockHeight } : undefined}>
            <div
              className="spots"
              ref={spotsRef}
              style={
                slide > 0
                  ? { transform: `translateY(-${slide}px)`, transition: "transform .55s cubic-bezier(.4,0,.2,1)" }
                  : { transform: "none", transition: "none" }
              }
              onTransitionEnd={(e) => {
                if (e.propertyName === "transform" && slide > 0) finishRoll();
              }}
            >
              {rendered.map((id, i) => {
                const s = stepById(id);
                const ghost = i === STEP_COUNT; // the trailing copy during a roll
                return (
                  <div
                    key={ghost ? "ghost" : id}
                    className={`spot${!ghost && current === id ? " on" : ""}`}
                    role={ghost ? undefined : "button"}
                    tabIndex={ghost ? undefined : 0}
                    aria-hidden={ghost ? true : undefined}
                    onClick={ghost ? undefined : () => pick(id)}
                    onKeyDown={
                      ghost
                        ? undefined
                        : (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              pick(id);
                            }
                          }
                    }
                  >
                    <small>
                      <CheckIcon />
                      {COPY.process.youGet}
                    </small>
                    <h3>{s.outcome}</h3>
                    <p>
                      <span>{s.lead}</span> {s.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── The team ────────────────────────────────────────────────────────────── */

function Team() {
  return (
    <section className="section v4-founders" id="founders">
      <div className="container">
        <p className="eyebrow">{COPY.team.eyebrow}</p>
        <h2 className="display">{COPY.team.heading}</h2>
        <div className="people">
          {COPY.team.people.map((p) => (
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
        <p className="coda">{COPY.team.coda}</p>
      </div>
    </section>
  );
}

/* ─── Sectors ─────────────────────────────────────────────────────────────── */

function Sectors() {
  return (
    <section className="section sectors" id="sectors">
      <div className="container">
        <div className="sectors-top">
          <div>
            <p className="eyebrow">{COPY.sectors.eyebrow}</p>
            <h2 className="display">{COPY.sectors.heading}</h2>
          </div>
          <p className="lede">{COPY.sectors.lede}</p>
        </div>
        <div className="sgrid">
          {COPY.sectors.items.map((s) => (
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
  return (
    <section className="section faq" id="faq">
      <div className="container">
        <div className="faq-top">
          <div>
            <p className="eyebrow">{COPY.faq.eyebrow}</p>
            <h2 className="display">{COPY.faq.heading}</h2>
          </div>
          <div className="qs">
            {FAQ_ITEMS.map((item) => (
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

/* ─── Navy band ───────────────────────────────────────────────────────────── */

function Band({ onTalk }: { onTalk: () => void }) {
  return (
    <section className="band">
      <div className="container band-grid">
        <div>
          <p className="eyebrow band-eyebrow">{COPY.band.eyebrow}</p>
          <h2 className="display">
            <Lines lines={COPY.band.headingLines} />
          </h2>
          <p className="band-line">{COPY.band.line}</p>
        </div>
        <Button variant="on-navy-outline" onClick={onTalk}>
          {COPY.band.cta}
        </Button>
      </div>
    </section>
  );
}

/* ─── Contact ─────────────────────────────────────────────────────────────── */

function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [reach, setReach] = useState("");
  const [revenue, setRevenue] = useState("");
  const [message, setMessage] = useState("");
  const { labels, placeholders, revenueOptions } = COPY.contact;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    // One field now takes either a phone number or an email. Send it as the
    // email when it looks like one, otherwise as the phone. The server accepts
    // either, and only sets reply-to when there is a real address.
    const looksLikeEmail = reach.includes("@");
    const composed = [message.trim(), revenue && `Revenue: ${revenue}`].filter(Boolean).join("\n");
    // Fire and forget. The thank-you shows regardless; the lead is best-effort.
    fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: looksLikeEmail ? reach.trim() : undefined,
        phone: looksLikeEmail ? undefined : reach.trim(),
        message: composed || "(no message)",
      }),
    }).catch(() => {});
  }

  return (
    <section className="section contact" id="contact">
      <div className="container contact-grid">
        <div>
          <p className="eyebrow">{COPY.contact.eyebrow}</p>
          <h2 className="display">{COPY.contact.heading}</h2>
          <p className="lede">{COPY.contact.lede}</p>
          <p className="contact-win">{COPY.contact.win}</p>
          <p className="contact-mail">
            {COPY.contact.orEmail}{" "}
            <a href={`mailto:${COPY.contact.emailAddress}`}>{COPY.contact.emailAddress}</a>
          </p>
        </div>

        {submitted ? (
          <div className="contact-thanks">
            <h3 className="serif" style={{ marginBottom: 8 }}>
              {COPY.contact.thanksHeading}
            </h3>
            <p style={{ margin: 0 }}>{COPY.contact.thanksBody}</p>
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
            <div className="field full">
              <label htmlFor="revenue">{labels.revenue}</label>
              <select id="revenue" value={revenue} onChange={(e) => setRevenue(e.target.value)}>
                <option value="" disabled>
                  {placeholders.revenue}
                </option>
                {revenueOptions.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
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
            <div className="form-actions">
              <Button type="submit" size="lg" arrow>
                {COPY.contact.send}
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────────────────────────────── */

function Footer() {
  const [, navigate] = useLocation();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Lockup markHeight={30} />
          </div>
          <div className="footer-links" aria-label={COPY.footer.ariaLabel}>
            {COPY.footer.links.map((l) =>
              l.kind === "anchor" ? (
                <a key={l.label} href={`#${l.id}`}>
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
          </div>
        </div>
        <div className="footer-bottom">{COPY.footer.disclaimer}</div>
      </div>
    </footer>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function Home({ lang = "en" }: { lang?: "en" | "he" }) {
  const [, navigate] = useLocation();

  // Keep the document root in sync for client-side navigation. English only
  // for now; the prop stays so the Hebrew route can come back without a
  // change in App.tsx.
  useEffect(() => {
    const el = document.documentElement;
    el.lang = "en";
    el.setAttribute("dir", "ltr");
  }, [lang]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 24, behavior: "smooth" });
  }

  const talk = () => scrollTo("contact");

  return (
    <div className="gesher" lang="en" dir="ltr">
      <header className="site-header">
        <div className="container">
          <Nav onTalk={talk} />
        </div>
      </header>
      <Hero onOpenValuation={() => navigate("/valuation")} onTalk={talk} />
      <ProofStrip />
      <LogoStrip />
      <Challenge />
      <WhyThisWorks />
      <ProcessSpotlight />
      <Team />
      <Sectors />
      <Faq />
      <Band onTalk={talk} />
      <Contact />
      <Footer />
    </div>
  );
}
