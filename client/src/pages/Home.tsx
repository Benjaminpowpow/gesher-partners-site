/**
 * Home — the Gesher homepage.
 *
 * Ported from the Claude design (tools/exit-brief/page-design): Nav, Hero (video),
 * Problem, StatRow, Process, TrackRecord, Founders, Selectivity, Contact, Footer,
 * and a quick-valuation modal. Converted to React + TypeScript. The dev-only Tweaks
 * panel is dropped; the design's defaults are baked in (letter / warm / italic).
 *
 * All styling lives in home.css, scoped under .gesher so nothing bleeds to other
 * routes. Copy is inlined from the design's i18n bundle (English; Hebrew parked).
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import "./home.css";

const S = {
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
    eyebrow: "For Israeli family businesses · NIS 5 to 50M",
    headlineLead: "Get the most out of your",
    headlineEmph: "life's work",
    headlineTrail: ".",
    lede: "An Israeli sell-side advisor, built by people who have sold their own companies.",
    ctaTalk: "Talk to us",
    ctaValuation: "Quick valuation",
  },
  problem: {
    eyebrow: "The problem",
    heading: "He built something real. He has one shot to get this right.",
    paras: [
      "Twenty-five years of work. A real business. His kids do not want it. The brokers who keep calling want to sell it tomorrow, to the first buyer who answers. He deserves better than that.",
      "We are the advisor he should have. We study the business. We find the right buyers. We run a real auction. And we tell the truth, even when the truth is do not sell yet.",
    ],
  },
  stats: {
    items: [
      { value: "40+", unit: "years", accent: false, lbl: "Advising Israeli owners" },
      { value: "3", unit: "companies", accent: false, lbl: "We built and sold our own" },
      { value: "0", unit: "big banks", accent: true, lbl: "For a deal your size. So we built one." },
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
    heading: "Where the team has built and advised.",
    lede: "Operators and advisors before founders.",
    logos: [
      { src: "/brand/logos/kpmg.svg", alt: "KPMG", height: 38 },
      { src: "/brand/logos/jfrog.svg", alt: "JFrog", height: 48 },
      { src: "/brand/logos/metro-group.png", alt: "Metropolinet Group", height: 52 },
      { src: "/brand/logos/spacenter.svg", alt: "Space", height: 42 },
      { src: "/brand/logos/ptravel.webp", alt: "P Travels Club", height: 48 },
    ],
  },
  founders: {
    eyebrow: "The team",
    heading: "Built by people who have been on your side of the table.",
    photoPlaceholder: "Founder photo",
    ofir: {
      name: "Ofir Ben Haim",
      role: "Managing Partner",
      bio: "40+ years advising Israeli business owners as a CPA. Built and sold OB&H in 2022. Thousands of clients across industrial, distribution, and services verticals. He has seen every deal structure that works in the Israeli market and several that do not.",
    },
    ben: {
      name: "Benjamin Aronson",
      role: "Managing Partner",
      bio: "Benjamin brings deep operational experience from the Israeli technology and services sector. Built and sold FinancePond in 2024. He has sat on the founder side of transactions and built Gesher to run the process he wished he had.",
    },
    story: [
      "We have both sat on your side of the table. We know what it feels like to give up something you built over years.",
      "Below 100M NIS, you do not get J.P. Morgan. You get a broker. We run the same process the big banks run for billion-dollar deals. A better buyer map. A real auction. You on every call. Sized for a 5 to 50M business.",
    ],
    coda: "",
  },
  selectivity: {
    eyebrow: "What sets us apart",
    quote: "Most advisors push you to sell. We tell you when to wait.",
    sub: "That is why owners trust us when it is time.",
  },
  contact: {
    eyebrow: "Get in touch",
    heading: "Talk to us.",
    lede: "Tell us where you are and we will tell you honestly whether we can help.",
    note: "We earn most of our fee only when you sell. A small monthly fee keeps us both committed until then. If we cannot help you, we will tell you in the first conversation.",
    labels: {
      name: "Name",
      email: "Email",
      company: "Company",
      revenue: "Annual revenue",
      stage: "Where you are in the process",
      message: "Anything you want us to know",
    },
    placeholders: {
      name: "Your name",
      email: "you@example.co.il",
      company: "Your business",
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
    mission: "Sell-side advisor for Israeli family businesses. NIS 5–50M revenue. Built for the owners who built decades-long businesses.",
    ariaLabel: "Footer",
    disclaimer: "Gesher Partners is not a licensed investment advisor. Nothing on this site constitutes investment advice or a solicitation to buy or sell any security.",
  },
} as const;

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

function Nav({ onOpenValuation, onTalk }: { onOpenValuation: () => void; onTalk: () => void }) {
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
        <img className="brand-mark" src="/brand/gesher-mark.svg" alt="" style={{ height: 28, display: "block" }} />
        <img className="wordmark" src="/brand/gesher-wordmark.svg" alt="gesher" />
      </a>

      {/* Desktop links, hidden on mobile via CSS */}
      <div className="nav-links">
        <a href="#process">{S.nav.howItWorks}</a>
        <a href="#founders">{S.nav.founders}</a>
        <Button size="sm" onClick={onOpenValuation}>
          {S.nav.quickValuation}
        </Button>
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
              <img className="brand-mark" src="/brand/gesher-mark.svg" alt="" style={{ height: 28, display: "block" }} />
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
            <li>
              <button type="button" className="nav-menu-link-btn" onClick={() => { close(); onOpenValuation(); }}>
                {S.nav.quickValuation}
              </button>
            </li>
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
          <p className="lede">{S.hero.lede}</p>
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
  return (
    <section className="section problem">
      <div className="container">
        <p className="eyebrow">{S.problem.eyebrow}</p>
        <h2 className="display">{S.problem.heading}</h2>
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

function Process() {
  return (
    <section className="section" id="process" style={{ background: "var(--warm-white)" }}>
      <div className="container">
        <p className="eyebrow">{S.process.eyebrow}</p>
        <h2 className="display">{S.process.heading}</h2>
        <p className="lede">{S.process.lede}</p>
        <div className="process-grid">
          {S.process.steps.map((s) => (
            <div className="process-block" key={s.step}>
              <p className="step">{s.step}</p>
              <h3 className="serif">{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrackRecord() {
  return (
    <section className="section-tight">
      <div className="container">
        <p className="eyebrow">{S.trackRecord.eyebrow}</p>
        <h2 className="display">{S.trackRecord.heading}</h2>
        <p className="lede">{S.trackRecord.lede}</p>
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
  return (
    <section className="section" id="founders">
      <div className="container" style={{ fontFamily: "Inter" }}>
        <p className="eyebrow">{S.founders.eyebrow}</p>
        <h2 className="display">{S.founders.heading}</h2>
        <div className="founders">
          <div className="founder-card">
            <div className="founder-photo">{S.founders.photoPlaceholder}</div>
            <h3 className="founder-name">{S.founders.ofir.name}</h3>
            <p className="founder-role">{S.founders.ofir.role}</p>
            <p className="founder-bio">{S.founders.ofir.bio}</p>
          </div>
          <div className="founder-card">
            <div className="founder-photo">{S.founders.photoPlaceholder}</div>
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
  return (
    <section className="section-navy">
      <div className="container">
        <div className="selectivity">
          <p className="eyebrow selectivity-eyebrow">{S.selectivity.eyebrow}</p>
          <p className="quote">{S.selectivity.quote}</p>
          <p className="sub">{S.selectivity.sub}</p>
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
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
            <div className="field full">
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
              Valuation Snapshot
            </a>
            <a href="#contact">Contact</a>
            <a href="/privacy" onClick={(e) => { e.preventDefault(); navigate("/privacy"); }}>
              Privacy
            </a>
            <a href="/terms" onClick={(e) => { e.preventDefault(); navigate("/terms"); }}>
              Terms
            </a>
          </div>
        </div>
        <div className="footer-bottom">{S.footer.disclaimer}</div>
      </div>
    </footer>
  );
}

function ValuationModal({ open, onClose, onOpenBrief }: { open: boolean; onClose: () => void; onOpenBrief: () => void }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Quick valuation">
        <p className="eyebrow">Quick valuation</p>
        <h3 className="serif modal-heading">Paste a website. Get an honest brief.</h3>
        <p className="modal-body">
          We read your site, look at recent Israeli deal data, and name the buyers most likely to pay a real price. You get a short brief back, no obligation.
        </p>
        <div className="modal-actions">
          <Button size="md" onClick={onOpenBrief} arrow>
            Open the brief
          </Button>
          <Button size="md" variant="outline" onClick={onClose}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const [modalOpen, setModalOpen] = useState(false);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 24, behavior: "smooth" });
  }

  return (
    <div className="gesher">
      <div className="container">
        <Nav onOpenValuation={() => setModalOpen(true)} onTalk={() => scrollTo("contact")} />
      </div>
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
  );
}
