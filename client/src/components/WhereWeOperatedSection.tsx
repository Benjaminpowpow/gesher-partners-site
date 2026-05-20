export default function WhereWeOperatedSection() {
  return (
    <section
      style={{
        backgroundColor: "#F8F4ED",
        paddingTop: 80,
        paddingBottom: 80,
      }}
    >
      <div className="g-container">
        <p className="small-caps" style={{ marginBottom: 24, color: "var(--color-secondary)", textAlign: "left" }}>
          Track record
        </p>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(38px, 5vw, 44px)",
            color: "var(--color-primary)",
            marginBottom: 60,
            textAlign: "left",
          }}
        >
          Where the team has built and advised.
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 40,
            alignItems: "center",
            marginBottom: 40,
          }}
          className="logos-grid"
        >
          {/* KPMG Logo Placeholder */}
          <div
            style={{
              height: 48,
              backgroundColor: "#D8D0BF",
              borderRadius: 4,
              opacity: 0.6,
              transition: "opacity 200ms ease-out",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.6";
            }}
            title="KPMG"
          />

          {/* JFrog Logo Placeholder */}
          <div
            style={{
              height: 48,
              backgroundColor: "#D8D0BF",
              borderRadius: 4,
              opacity: 0.6,
              transition: "opacity 200ms ease-out",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.6";
            }}
            title="JFrog"
          />

          {/* Empty Placeholder 1 */}
          <div
            style={{
              height: 48,
              backgroundColor: "#E8E0D0",
              borderRadius: 4,
              opacity: 0.3,
            }}
          />

          {/* Empty Placeholder 2 */}
          <div
            style={{
              height: 48,
              backgroundColor: "#E8E0D0",
              borderRadius: 4,
              opacity: 0.3,
            }}
          />

          {/* Empty Placeholder 3 */}
          <div
            style={{
              height: 48,
              backgroundColor: "#E8E0D0",
              borderRadius: 4,
              opacity: 0.3,
            }}
          />
        </div>

        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--color-secondary)",
            textAlign: "left",
          }}
        >
          Operators and advisors before founders.
        </p>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .logos-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          .logos-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
