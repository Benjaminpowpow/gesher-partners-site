import { useState, useEffect } from "react";
import { Link } from "wouter";
import BridgeIcon from "./BridgeIcon";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: scrolled ? "rgba(248,244,237,0.97)" : "#F8F4ED",
        borderBottom: scrolled ? "1px solid rgba(27,58,92,0.1)" : "1px solid transparent",
        backdropFilter: scrolled ? "blur(8px)" : "none",
        transition: "border-color 200ms, background-color 200ms, backdrop-filter 200ms",
      }}
    >
      <div className="g-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        {/* Wordmark */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/manus-storage/e56b5bc97_logo_96a7475d.png" alt="Gesher Logo" style={{ width: 28, height: 28 }} />
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 18, fontWeight: 600, color: "var(--color-primary)", letterSpacing: "-0.5px" }}>gesher</span>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: 36 }} className="desktop-nav">
          <button
            onClick={() => scrollTo("how-it-works")}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 500, color: "var(--color-body)", padding: 0, transition: "color 150ms" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--color-primary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--color-body)")}
          >
            How it works
          </button>
          <button
            onClick={() => scrollTo("founders")}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 500, color: "var(--color-body)", padding: 0, transition: "color 150ms" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--color-primary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--color-body)")}
          >
            Founders
          </button>
          <button
            onClick={() => scrollTo("contact")}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 500, color: "var(--color-body)", padding: 0, transition: "color 150ms" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--color-primary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--color-body)")}
          >
            Contact
          </button>
          <Link href="/exit-brief" className="g-btn-primary" style={{ padding: "10px 22px", fontSize: 14 }}>
            Quick valuation
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 8, display: "none" }}
          aria-label="Toggle menu"
        >
          <span style={{ display: "block", width: 22, height: 2, background: "var(--color-primary)", marginBottom: 5, transition: "transform 200ms" }} />
          <span style={{ display: "block", width: 22, height: 2, background: "var(--color-primary)", marginBottom: 5 }} />
          <span style={{ display: "block", width: 22, height: 2, background: "var(--color-primary)" }} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ backgroundColor: "#F8F4ED", borderTop: "1px solid rgba(27,58,92,0.1)", padding: "20px 24px 24px" }}>
          {[
            { label: "How it works", id: "how-it-works" },
            { label: "Founders", id: "founders" },
            { label: "Contact", id: "contact" },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 17, fontWeight: 500, color: "var(--color-body)", padding: "12px 0", borderBottom: "1px solid rgba(27,58,92,0.08)" }}
            >
              {item.label}
            </button>
          ))}
          <Link href="/exit-brief" className="g-btn-primary" style={{ marginTop: 16, width: "100%", textAlign: "center" }} onClick={() => setMenuOpen(false)}>
            Quick valuation
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </header>
  );
}
