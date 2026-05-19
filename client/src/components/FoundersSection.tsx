export default function FoundersSection() {
  return (
    <section
      id="founders"
      className="g-section"
      style={{ backgroundColor: "#F0EBE2" }}
    >
      <div className="g-container">
        <p className="g-eyebrow" style={{ marginBottom: 16 }}>The team</p>
        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            fontSize: "clamp(28px, 3.5vw, 44px)",
            color: "var(--color-primary)",
            marginBottom: 64,
            maxWidth: 620,
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
          {/* Ben */}
          <div>
            <div
              className="g-photo-placeholder"
              style={{ width: "100%", aspectRatio: "4/3", marginBottom: 28 }}
              aria-label="Photo of Ben — placeholder"
            />
            <p className="g-eyebrow" style={{ marginBottom: 8 }}>Managing Partner</p>
            <h3
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 600,
                fontSize: 28,
                color: "var(--color-primary)",
                marginBottom: 16,
              }}
            >
              Ben
            </h3>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 17,
                color: "var(--color-body)",
                lineHeight: 1.7,
              }}
            >
              Ben brings deep operational experience from the Israeli technology and services sector. He has sat on the founder side of multiple transactions and built Gesher to run the process he wished he had.
            </p>
          </div>

          {/* Ofir */}
          <div>
            <div
              className="g-photo-placeholder"
              style={{ width: "100%", aspectRatio: "4/3", marginBottom: 28 }}
              aria-label="Photo of Ofir Ben Haim — placeholder"
            />
            <p className="g-eyebrow" style={{ marginBottom: 8 }}>Senior Advisor</p>
            <h3
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 600,
                fontSize: 28,
                color: "var(--color-primary)",
                marginBottom: 16,
              }}
            >
              Ofir Ben Haim
            </h3>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 17,
                color: "var(--color-body)",
                lineHeight: 1.7,
                marginBottom: 24,
              }}
            >
              Ofir has 40 years of Israeli M&A experience across industrial, distribution, and services verticals. He knows the buyers, the brokers, and the banks. He has seen every deal structure that works in the Israeli market and several that do not.
            </p>
            <a
              href="https://cal.com/gesher"
              target="_blank"
              rel="noopener noreferrer"
              className="g-btn-primary"
            >
              Book a 30-minute call with Ofir.
            </a>
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
