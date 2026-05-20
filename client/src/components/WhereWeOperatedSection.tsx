// Real KPMG Logo Component
function KPMGLogo() {
  return (
    <svg viewBox="0 0 200 100" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {/* KPMG Red Square */}
      <rect x="10" y="10" width="40" height="40" fill="#C8102E" rx="2" />
      {/* KPMG White K */}
      <text x="30" y="42" fontSize="32" fontWeight="bold" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif">
        K
      </text>
      {/* KPMG Text */}
      <text x="65" y="35" fontSize="18" fontWeight="600" fill="#1A1A1A" fontFamily="Arial, sans-serif">
        KPMG
      </text>
    </svg>
  );
}

// Real JFrog Logo Component
function JFrogLogo() {
  return (
    <svg viewBox="0 0 200 100" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {/* JFrog Icon - stylized J */}
      <g>
        {/* Left vertical bar */}
        <rect x="15" y="15" width="8" height="50" fill="#1E90FF" rx="2" />
        {/* Top horizontal bar */}
        <rect x="15" y="15" width="25" height="8" fill="#1E90FF" rx="2" />
        {/* Bottom curve */}
        <circle cx="40" cy="63" r="8" fill="#1E90FF" />
      </g>
      {/* JFrog Text */}
      <text x="65" y="45" fontSize="18" fontWeight="600" fill="#1A1A1A" fontFamily="Arial, sans-serif">
        JFrog
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
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 40,
            alignItems: "center",
            marginBottom: 40,
          }}
          className="logos-grid"
        >
          {/* KPMG Logo */}
          <div
            style={{
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.85,
              transition: "opacity 200ms ease-out",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.85";
            }}
            title="KPMG"
          >
            <KPMGLogo />
          </div>

          {/* JFrog Logo */}
          <div
            style={{
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.85,
              transition: "opacity 200ms ease-out",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.85";
            }}
            title="JFrog"
          >
            <JFrogLogo />
          </div>

          {/* Empty Placeholder 1 */}
          <div
            style={{
              height: 60,
              backgroundColor: "#E8E0D0",
              borderRadius: 4,
              opacity: 0.3,
            }}
          />

          {/* Empty Placeholder 2 */}
          <div
            style={{
              height: 60,
              backgroundColor: "#E8E0D0",
              borderRadius: 4,
              opacity: 0.3,
            }}
          />

          {/* Empty Placeholder 3 */}
          <div
            style={{
              height: 60,
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
