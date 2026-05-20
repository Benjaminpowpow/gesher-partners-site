const stats = [
  {
    number: "4 decades",
    caption: "Working with Israeli business owners. Thousands of clients, every vertical.",
  },
  {
    number: "10x buyers",
    caption: "Strategic buyers across Israel, the US, and the Gulf. Built on 40 years of relationships.",
  },
  {
    number: "30% higher",
    caption: "What a real auction delivers versus one buyer at a time.",
  },
  {
    number: "Success fee only",
    caption: "We get paid when you close.",
  },
];

export default function StatsSection() {
  return (
    <section
      style={{
        backgroundColor: "#F8F4ED",
        paddingTop: 120,
        paddingBottom: 120,
      }}
    >
      <div className="g-container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 24,
          }}
          className="stats-grid"
        >
          {stats.map((stat, i) => (
            <div
              key={i}
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid rgba(12, 27, 46, 0.08)",
                borderRadius: 6,
                padding: 32,
                boxShadow: "0 1px 3px rgba(12, 27, 46, 0.04)",
                textAlign: "left",
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
                  fontFamily: "var(--font-serif)",
                  fontWeight: 700,
                  fontSize: "clamp(44px, 5vw, 56px)",
                  color: "#6B2C2C",
                  lineHeight: 1.1,
                  marginBottom: 16,
                }}
              >
                {stat.number}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 400,
                  fontSize: 16,
                  color: "#1A1A1A",
                  lineHeight: 1.55,
                }}
              >
                {stat.caption}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
