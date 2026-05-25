import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export default function Terms() {
  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh" }}>
      <Nav />
      <main style={{ paddingTop: 64 }}>
        <section className="g-section">
          <div className="g-container">
            <div style={{ maxWidth: 680, margin: "0 auto" }}>
              <p className="g-eyebrow" style={{ marginBottom: 20 }}>Legal</p>
              <h1
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 700,
                  fontSize: "clamp(28px, 4vw, 44px)",
                  color: "var(--color-primary)",
                  marginBottom: 24,
                }}
              >
                Terms of Service
              </h1>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 17,
                  color: "var(--color-body)",
                  lineHeight: 1.7,
                  backgroundColor: "var(--color-white)",
                  padding: "40px 40px",
                  borderRadius: 8,
                  border: "1px solid rgba(27,58,92,0.1)",
                }}
              >
                <p>
                  These terms of service will be published before the Gesher website launches publicly. They will govern your use of this site, including the Valuation Snapshot tool and any advisory services offered by Gesher.
                </p>
                <p style={{ marginTop: 20 }}>
                  The Valuation Snapshot tool is provided for informational purposes only. It is not an offer, a valuation opinion, or financial advice. It is built from public sources and is strictly private.
                </p>
                <p style={{ marginTop: 20 }}>
                  If you have questions, contact us at{" "}
                  <a href="mailto:hello@gesher-partners.com" style={{ color: "var(--color-primary)" }}>
                    hello@gesher-partners.com
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
