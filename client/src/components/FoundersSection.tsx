export default function FoundersSection() {
  const founderStory = [
    "We have both sold companies. Ben sold FinancePond. Ofir sold OB&H. We have sat on your side of the table. We know what it feels like to give up something you built over decades.",
    "That is why we built Gesher. After 14 months meeting hundreds of Israeli business owners, we saw the same thing every time. Real businesses. Real legacies. No proffessional advisor.",
    "Below 100M NIS, you don't get J.P Morgan or Goldman Sachs. You get unproffessional brokers. We built Gesher to give you the same process the big banks run for their billion-dollar deals. Better buyer map. Better competitive auction. With you on every call. Sized for a 5-50M NIS business.",
    "We are the advisor those owners never had.",
  ];

  return (
    <section
      id="founders"
      className="g-section"
      style={{ backgroundColor: "#F8F4ED" }}
    >
      <div className="g-container">
        <p className="small-caps" style={{ marginBottom: 16, color: "var(--color-secondary)", textAlign: "left" }}>
          The team
        </p>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(38px, 5vw, 44px)",
            color: "var(--color-primary)",
            marginBottom: 64,
            textAlign: "left",
          }}
        >
          Built by people who have been on your side of the table.
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            alignItems: "start",
          }}
          className="founders-grid"
        >
          {/* Left Column: Founder Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            {/* Ofir Card */}
            <div>
              <div
                className="portrait-frame"
                style={{
                  width: "100%",
                  aspectRatio: "4/3",
                  marginBottom: 24,
                  backgroundColor: "#E8E0D0",
                }}
              />
              <p className="small-caps" style={{ marginBottom: 8, color: "var(--color-secondary)" }}>
                Managing Director
              </p>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "clamp(22px, 3vw, 26px)",
                  color: "var(--color-primary)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                OFIR BEN HAIM
              </h3>
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 16,
                  color: "var(--color-body)",
                  lineHeight: 1.65,
                }}
              >
                40 years advising Israeli business owners as a CPA. Built and sold OB&H in 2022. Thousands of clients across industrial, distribution, and services verticals. He has seen every deal structure that works in the Israeli market and several that do not.
              </p>
            </div>

            {/* Benjamin Card */}
            <div>
              <div
                className="portrait-frame"
                style={{
                  width: "100%",
                  aspectRatio: "4/3",
                  marginBottom: 24,
                  backgroundColor: "#E8E0D0",
                }}
              />
              <p className="small-caps" style={{ marginBottom: 8, color: "var(--color-secondary)" }}>
                Vice President
              </p>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "clamp(22px, 3vw, 26px)",
                  color: "var(--color-primary)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                BENJAMIN ARONSON
              </h3>
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 16,
                  color: "var(--color-body)",
                  lineHeight: 1.65,
                }}
              >
                Ben brings deep operational experience from the Israeli technology and services sector. Built and sold FinancePond in 2024. He has sat on the founder side of transactions and built Gesher to run the process he wished he had.
              </p>
            </div>
          </div>

          {/* Right Column: Founder Story */}
          <div style={{ paddingTop: 8 }}>
            {founderStory.map((paragraph, i) => (
              <p
                key={i}
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 16,
                  color: "var(--color-body)",
                  lineHeight: 1.75,
                  marginBottom: i < founderStory.length - 1 ? 24 : 0,
                }}
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .founders-grid {
            grid-template-columns: 1fr !important;
            gap: 56px !important;
          }
        }
      `}</style>
    </section>
  );
}
