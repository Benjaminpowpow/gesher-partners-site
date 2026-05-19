export default function OfirSidebar() {
  return (
    <aside
      style={{
        position: "sticky",
        top: 88,
        width: "100%",
      }}
    >
      <div
        className="g-card"
        style={{
          padding: "32px 28px",
          borderTop: "3px solid var(--color-primary)",
        }}
      >
        {/* Photo placeholder */}
        <div
          className="g-photo-placeholder"
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            marginBottom: 20,
          }}
          aria-label="Photo of Ofir Ben Haim — placeholder"
        />

        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
            fontSize: 13,
            color: "var(--color-subtext)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 8,
          }}
        >
          Senior Advisor
        </p>

        <h3
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            fontSize: 20,
            color: "var(--color-primary)",
            marginBottom: 14,
            lineHeight: 1.2,
          }}
        >
          Ofir Ben Haim
        </h3>

        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            color: "var(--color-body)",
            lineHeight: 1.65,
            marginBottom: 24,
          }}
        >
          Want the full picture? Book a 30-minute call with Ofir. We will walk through your specific number, your buyer list, and the two or three things that will move your multiple.
        </p>

        <a
          href="https://cal.com/gesher"
          target="_blank"
          rel="noopener noreferrer"
          className="g-btn-primary"
          style={{ width: "100%", textAlign: "center", fontSize: 15, padding: "14px 20px" }}
        >
          Book a call with Ofir
        </a>

        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--color-subtext)",
            marginTop: 16,
            lineHeight: 1.5,
            textAlign: "center",
          }}
        >
          40 years of Israeli M&A experience.
          <br />
          No obligation.
        </p>
      </div>
    </aside>
  );
}
