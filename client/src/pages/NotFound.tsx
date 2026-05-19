import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh" }}>
      <Nav />
      <main style={{ paddingTop: 64 }}>
        <section className="g-section" style={{ textAlign: "center" }}>
          <div className="g-container">
            <div style={{ maxWidth: 560, margin: "0 auto" }}>
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 700,
                  fontSize: "clamp(64px, 10vw, 120px)",
                  color: "var(--color-primary)",
                  opacity: 0.12,
                  lineHeight: 1,
                  marginBottom: 0,
                }}
              >
                404
              </p>

              <h1
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 700,
                  fontSize: "clamp(28px, 4vw, 44px)",
                  color: "var(--color-primary)",
                  marginBottom: 20,
                  marginTop: -16,
                }}
              >
                This page does not exist.
              </h1>

              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 18,
                  color: "var(--color-body)",
                  lineHeight: 1.65,
                  marginBottom: 40,
                }}
              >
                If you were looking for the Exit Brief tool, it is at{" "}
                <Link href="/exit-brief" style={{ color: "var(--color-primary)", fontWeight: 500 }}>
                  /exit-brief
                </Link>
                . If you were looking for something else, start from the home page.
              </p>

              <Link href="/" className="g-btn-primary" style={{ display: "inline-block" }}>
                Back to Gesher
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
