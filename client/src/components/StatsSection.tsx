const stats = [
  { number: "4 decades", label: "of Israeli M&A experience" },
  { number: "3 markets", label: "Israel, Europe, North America" },
  { number: "Real auction", label: "Multiple buyers, competitive process" },
  { number: "Paid when you win", label: "Success fee only. No retainer." },
];

export default function StatsSection() {
  return (
    <section
      style={{
        backgroundColor: "var(--color-primary)",
        paddingTop: 80,
        paddingBottom: 80,
      }}
    >
      <div className="g-container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 40,
          }}
          className="stats-grid"
        >
          {stats.map((stat, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 700,
                  fontSize: "clamp(28px, 4vw, 52px)",
                  color: "var(--color-accent)",
                  lineHeight: 1.1,
                  marginBottom: 10,
                }}
              >
                {stat.number}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 400,
                  fontSize: 15,
                  color: "rgba(248,244,237,0.75)",
                  lineHeight: 1.4,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 32px !important;
          }
        }
        @media (max-width: 375px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
