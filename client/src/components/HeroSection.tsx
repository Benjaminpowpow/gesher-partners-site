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
      <div className="g-container g-fade-in">
        <p className="g-eyebrow" style={{ marginBottom: 24 }}>
          For Israeli family-owned businesses. NIS 5–50M revenue.
        </p>

        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 700,
            fontSize: "clamp(40px, 6vw, 68px)",
            color: "var(--color-primary)",
            lineHeight: 1.1,
            maxWidth: 760,
            marginBottom: 8,
          }}
        >
          Get the most out of your life's work.
        </h1>

        {/* Burgundy underline */}
        <div
          style={{
            width: 60,
            height: 2,
            backgroundColor: "var(--color-accent)",
            marginBottom: 28,
          }}
        />

        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: "clamp(18px, 2vw, 22px)",
            color: "var(--color-primary)",
            marginBottom: 16,
            letterSpacing: "0.01em",
          }}
        >
          Small Businesses, Maximum Outcome.
        </p>

        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 400,
            fontSize: "clamp(16px, 1.5vw, 19px)",
            color: "var(--color-body)",
            maxWidth: 580,
            lineHeight: 1.65,
            marginBottom: 44,
          }}
        >
          An Israeli sell-side advisor for family businesses built by people who have been on your side of the table.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          <button onClick={scrollToContact} className="g-btn-primary">
            Talk to us.
          </button>
          <Link href="/exit-brief" className="g-btn-secondary">
            Get a quick read on your business.
          </Link>
        </div>
      </div>
    </section>
  );
}
