// KPMG Logo Component
function KPMGLogo() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <rect width="200" height="200" fill="none" />
      {/* KPMG Red Square */}
      <rect x="20" y="20" width="160" height="160" fill="#C8102E" rx="8" />
      {/* KPMG White Text - simplified K */}
      <text x="100" y="130" fontSize="120" fontWeight="bold" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif">
        K
      </text>
    </svg>
  );
}

// JFrog Logo Component
function JFrogLogo() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <rect width="200" height="200" fill="none" />
      {/* JFrog Blue Circle */}
      <circle cx="100" cy="100" r="80" fill="#1E90FF" />
      {/* JFrog White J */}
      <text x="100" y="135" fontSize="100" fontWeight="bold" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif">
        J
      </text>
    </svg>
  );
}

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
          {/* KPMG Logo */}
          <div
            style={{
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.8,
              transition: "opacity 200ms ease-out",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.8";
            }}
            title="KPMG"
          >
            <KPMGLogo />
          </div>

          {/* JFrog Logo */}
          <div
            style={{
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.8,
              transition: "opacity 200ms ease-out",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.8";
            }}
            title="JFrog"
          >
            <JFrogLogo />
          </div>

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
