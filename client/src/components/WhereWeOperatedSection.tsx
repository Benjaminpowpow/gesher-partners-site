// Real KPMG Logo Component
function KPMGLogo() {
  return (
    <img
      src="/manus-storage/cGj33NPOnF0D_d0b584f4.jpeg"
      alt="KPMG Logo"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
      }}
    />
  );
}

// Real JFrog Logo Component
function JFrogLogo() {
  return (
    <img
      src="/manus-storage/ZEEpgUsPcX1h_2909ce33.png"
      alt="JFrog Logo"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
      }}
    />
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
