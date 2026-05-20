const steps = [
  {
    number: "01",
    title: "We package your business.",
    body: "Real numbers, real story, ready for serious buyers. The way a strategic acquirer reads it.",
  },
  {
    number: "02",
    title: "We find your buyers.",
    body: "PE funds. Strategics. Family offices. Globle. We map them in weeks, not months.",
  },
  {
    number: "03",
    title: "We run the auction.",
    body: "Multiple buyers, same week, same room. Not one offer. Many. That is what gets you the price.",
  },
  {
    number: "04",
    title: "We close your deal.",
    body: "Senior banker on the line for every call. From the first NDA to the last signature. No handoffs.",
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
        <p className="small-caps" style={{ marginBottom: 16, color: "var(--color-secondary)" }}>
          The process
        </p>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(38px, 5vw, 44px)",
            color: "var(--color-primary)",
            marginBottom: 64,
            maxWidth: 560,
            textAlign: "left",
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
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid rgba(12, 27, 46, 0.08)",
                borderRadius: 6,
                padding: "32px 28px",
                boxShadow: "0 1px 3px rgba(12, 27, 46, 0.04)",
                transition: "box-shadow 200ms ease-out",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(12, 27, 46, 0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(12, 27, 46, 0.04)";
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 500,
                  fontSize: 13,
                  color: "var(--color-accent)",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
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

        <div style={{ textAlign: "left" }}>
          <button onClick={scrollToContact} className="btn-solid">
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
