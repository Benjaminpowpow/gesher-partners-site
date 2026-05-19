import { Link } from "wouter";

export default function Footer() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer style={{ backgroundColor: "var(--color-bg)", borderTop: "1px solid rgba(27,58,92,0.12)" }}>
      <div className="g-container" style={{ paddingTop: 64, paddingBottom: 48 }}>
        {/* Three columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr",
            gap: 48,
            marginBottom: 48,
          }}
          className="footer-grid"
        >
          {/* Col 1: Brand */}
          <div>
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 600,
                fontSize: 22,
                color: "var(--color-primary)",
                letterSpacing: "0.02em",
                display: "block",
                marginBottom: 12,
              }}
            >
              Gesher
            </span>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 15,
                color: "var(--color-subtext)",
                lineHeight: 1.6,
                marginBottom: 16,
                maxWidth: 300,
              }}
            >
              Small Businesses, Maximum Outcome.
            </p>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                color: "var(--color-subtext)",
                lineHeight: 1.6,
              }}
            >
              <strong style={{ color: "var(--color-body)", fontWeight: 500 }}>Office</strong>
              <br />
              [OB&H office address, Ben to paste from obhcpa.com]
            </p>
          </div>

          {/* Col 2: Links */}
          <div>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 500,
                fontSize: 13,
                color: "var(--color-subtext)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 16,
              }}
            >
              Site
            </p>
            <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Home", action: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
                { label: "How it works", action: () => scrollTo("how-it-works") },
                { label: "Founders", action: () => scrollTo("founders") },
                { label: "Contact", action: () => scrollTo("contact") },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    fontSize: 15,
                    color: "var(--color-subtext)",
                    padding: 0,
                    textAlign: "left",
                    transition: "color 150ms",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--color-primary)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--color-subtext)")}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Col 3: Tools & Legal */}
          <div>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 500,
                fontSize: 13,
                color: "var(--color-subtext)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 16,
              }}
            >
              Tools
            </p>
            <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link
                href="/exit-brief"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 15,
                  color: "var(--color-subtext)",
                  transition: "color 150ms",
                }}
                onMouseEnter={e => ((e.target as HTMLElement).style.color = "var(--color-primary)")}
                onMouseLeave={e => ((e.target as HTMLElement).style.color = "var(--color-subtext)")}
              >
                Exit Brief
              </Link>
              <Link
                href="/privacy"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 15,
                  color: "var(--color-subtext)",
                  transition: "color 150ms",
                }}
                onMouseEnter={e => ((e.target as HTMLElement).style.color = "var(--color-primary)")}
                onMouseLeave={e => ((e.target as HTMLElement).style.color = "var(--color-subtext)")}
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 15,
                  color: "var(--color-subtext)",
                  transition: "color 150ms",
                }}
                onMouseEnter={e => ((e.target as HTMLElement).style.color = "var(--color-primary)")}
                onMouseLeave={e => ((e.target as HTMLElement).style.color = "var(--color-subtext)")}
              >
                Terms
              </Link>
            </nav>
          </div>
        </div>

        {/* Legal strip */}
        <div
          style={{
            borderTop: "1px solid rgba(27,58,92,0.1)",
            paddingTop: 24,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--color-subtext)",
              lineHeight: 1.6,
              maxWidth: 640,
            }}
          >
            Gesher Partners is not a licensed investment advisor. Nothing on this site constitutes investment advice or a solicitation to buy or sell any security.
          </p>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--color-subtext)",
            }}
          >
            &copy; 2025 Gesher Partners. All rights reserved.
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .footer-grid > div:first-child {
            grid-column: 1 / -1;
          }
        }
        @media (max-width: 480px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
}
