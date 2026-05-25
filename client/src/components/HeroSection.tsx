import { Link } from "wouter";

export default function HeroSection() {
  const scrollToContact = () => {
    const el = document.getElementById("contact");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      style={{
        backgroundColor: "var(--color-bg)",
        paddingTop: 160,
        paddingBottom: 120,
      }}
    >
      <div className="g-container" style={{ maxWidth: 800 }}>
        <p className="small-caps" style={{ marginBottom: 24, color: "var(--color-secondary)" }}>
          For Israeli family-owned businesses. NIS 5-50M revenue.
        </p>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(60px, 8vw, 72px)",
            color: "var(--color-primary)",
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
            marginBottom: 24,
          }}
        >
          Get the most out of your life's work.
        </h1>

        {/* Burgundy rule: 1px, 60px wide */}
        <div className="hero-rule" style={{ marginLeft: 0 }} />

        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontStyle: "italic",
            fontSize: "clamp(18px, 2vw, 22px)",
            color: "var(--color-secondary)",
            marginBottom: 24,
          }}
        >
          Small Businesses, Maximum Outcome.
        </p>

        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: "18px",
            color: "var(--color-body)",
            lineHeight: 1.65,
            marginBottom: 48,
          }}
        >
          An Israeli sell-side advisor for family businesses built by people who have been on your side of the table.
        </p>

        {/* FEATURE-3: Replace CTA copy with "Quick valuation" */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", justifyContent: "flex-start" }}>
          <button onClick={scrollToContact} className="btn-solid">
            Talk to us.
          </button>
          <Link href="/valuation" className="btn-ghost">
            Quick valuation
          </Link>
        </div>
      </div>
    </section>
  );
}
