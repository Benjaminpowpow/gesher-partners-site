const steps = [
  {
    number: "01",
    title: "We read your business.",
    body: "A 90-minute conversation and a look at three years of financials. We tell you what a buyer will see, what will compress your multiple, and what will expand it.",
  },
  {
    number: "02",
    title: "We build your buyer list.",
    body: "Named Israeli strategics, regional PE, and relevant cross-border acquirers. Every name is researched. No generic lists.",
  },
  {
    number: "03",
    title: "We run the auction.",
    body: "Simultaneous outreach, managed information flow, competitive tension. The process creates the price, not the asking number.",
  },
  {
    number: "04",
    title: "We close.",
    body: "Term sheet, due diligence, SPA. We stay in the room until the wire clears.",
  },
];

export default function HowItWorksSection() {
  const scrollToContact = () => {
    const el = document.getElementById("contact");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="how-it-works" className="g-section" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="g-container">
        <p className="g-eyebrow" style={{ marginBottom: 16 }}>The process</p>
        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            fontSize: "clamp(28px, 3.5vw, 44px)",
            color: "var(--color-primary)",
            marginBottom: 64,
            maxWidth: 560,
          }}
        >
          How a Gesher mandate works.
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 24,
            marginBottom: 64,
          }}
          className="hiw-grid"
        >
          {steps.map((step) => (
            <div
              key={step.number}
              className="g-card"
              style={{ padding: "32px 28px" }}
            >
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 700,
                  fontSize: 13,
                  color: "var(--color-accent)",
                  letterSpacing: "0.1em",
                  marginBottom: 16,
                }}
              >
                {step.number}
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 600,
                  fontSize: 20,
                  color: "var(--color-primary)",
                  marginBottom: 12,
                  lineHeight: 1.25,
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 16,
                  color: "var(--color-body)",
                  lineHeight: 1.65,
                }}
              >
                {step.body}
              </p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <button onClick={scrollToContact} className="g-btn-primary">
            Talk to us about your business.
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .hiw-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 540px) {
          .hiw-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
