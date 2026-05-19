import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export default function Privacy() {
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
                Privacy Policy
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
                  This privacy policy will be published before the Gesher website launches publicly. It will cover how we collect, use, and protect information submitted through this site, including the Exit Brief tool and contact form.
                </p>
                <p style={{ marginTop: 20 }}>
                  In the meantime, if you have questions about how your information is handled, please contact us at{" "}
                  <a href="mailto:hello@gesher-partners.com" style={{ color: "var(--color-primary)" }}>
                    hello@gesher-partners.com
                  </a>
                  .
                </p>
                <p style={{ marginTop: 20 }}>
                  We read every email. We reply within one business day.
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
