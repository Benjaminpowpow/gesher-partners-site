import React, { useMemo } from "react";
import HiddenRiskTeaser from "./HiddenRiskTeaser";
import { Streamdown } from "streamdown";

interface ResultPageRendererProps {
  content: string;
}

/**
 * Comprehensive result page renderer for all 6 sections per Round 3 spec.
 * Parses markdown and renders with custom typography, layout, and styling.
 * Handles all scrub rules and custom section rendering.
 */
export default function ResultPageRenderer({ content }: ResultPageRendererProps) {
  const sections = useMemo(() => {
    // Parse the markdown into logical sections
    const lines = content.split("\n");
    const result: { [key: string]: string[] } = {
      header: [],
      step1: [],
      step2: [],
      step3: [],
      nextStep: [],
    };

    let currentSection = "header";
    let inInternalBlock = false;

    for (const line of lines) {
      // Skip Internal blocks (Rule A)
      if (line.match(/^## Internal:/)) {
        inInternalBlock = true;
        continue;
      }
      if (inInternalBlock && line.match(/^## /)) {
        inInternalBlock = false;
      }
      if (inInternalBlock) continue;

      // Detect section changes
      if (line.startsWith("## Step 1")) {
        currentSection = "step1";
      } else if (line.startsWith("## Step 2")) {
        currentSection = "step2";
      } else if (line.startsWith("## Step 3")) {
        currentSection = "step3";
      } else if (line.startsWith("## Next step")) {
        currentSection = "nextStep";
      }

      if (currentSection in result) {
        result[currentSection].push(line);
      }
    }

    return result;
  }, [content]);

  return (
    <div className="result-page-renderer">
      {/* Section 1: Header */}
      <ResultHeader content={sections.header.join("\n")} />

      {/* Section 2: Step 1 Market Snapshot */}
      <Step1Section content={sections.step1.join("\n")} />

      {/* Section 3: Step 2 Value Drivers */}
      <Step2Section content={sections.step2.join("\n")} />

      {/* Section 4: Step 3 Valuation */}
      <Step3Section content={sections.step3.join("\n")} />

      {/* Section 5: Next Step */}
      <NextStepSection content={sections.nextStep.join("\n")} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Section 1: Result Header
// ─────────────────────────────────────────────────────────────────────

function ResultHeader({ content }: { content: string }) {
  const lines = content.split("\n").filter(l => l.trim());
  const h1 = lines.find(l => l.startsWith("# "));
  const blockquote = lines.find(l => l.startsWith("> "));

  return (
    <section
      style={{
        backgroundColor: "#F8F4ED",
        paddingTop: "80px",
        paddingBottom: "48px",
      }}
    >
      <div className="g-container">
        {h1 && (
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(36px, 8vw, 72px)",
              color: "var(--color-primary)",
              letterSpacing: "-0.01em",
              marginBottom: 12,
              textAlign: "left",
            }}
          >
            {h1.replace(/^# /, "")}
          </h1>
        )}
        {blockquote && (
          <blockquote
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 16,
              color: "#6B6B6B",
              marginTop: 12,
              borderLeft: "none",
              marginLeft: 0,
              paddingLeft: 0,
              textAlign: "left",
            }}
          >
            {blockquote.replace(/^> /, "")}
          </blockquote>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Section 2: Step 1 Market Snapshot
// ─────────────────────────────────────────────────────────────────────

function Step1Section({ content }: { content: string }) {
  // Extract left and right column content
  const leftMatch = content.match(/### Left column\. (.*?)\n([\s\S]*?)(?=### Right column|$)/);
  const rightMatch = content.match(/### Right column\. (.*?)\n([\s\S]*?)(?=##|$)/);

  const leftTitle = leftMatch?.[1] || "Market";
  const leftContent = leftMatch?.[2] || "";
  const rightTitle = rightMatch?.[1] || "Company";
  const rightContent = rightMatch?.[2] || "";

  return (
    <section
      style={{
        backgroundColor: "#F8F4ED",
        paddingTop: "64px",
        paddingBottom: "64px",
      }}
    >
      <div className="g-container">
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(28px, 5vw, 44px)",
            color: "var(--color-primary)",
            marginBottom: 16,
            textAlign: "left",
          }}
        >
          Step 1. Market Snapshot
        </h2>
        <div
          style={{
            width: 64,
            height: 1,
            backgroundColor: "#6B2C2C",
            marginBottom: 48,
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
          }}
          className="step1-grid"
        >
          {/* Left column */}
          <div>
            <h3
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 600,
                fontSize: "clamp(20px, 4vw, 28px)",
                color: "var(--color-primary)",
                marginBottom: 24,
                textAlign: "left",
              }}
            >
              {leftTitle}
            </h3>
            <div style={{ textAlign: "left" }}>
              <Streamdown>{leftContent}</Streamdown>
            </div>
          </div>

          {/* Right column - sticky company card */}
          <div
            style={{
              position: "sticky",
              top: 32,
              backgroundColor: "white",
              border: "1px solid rgba(27, 58, 92, 0.12)",
              borderRadius: 6,
              padding: 32,
            }}
            className="step1-sticky"
          >
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(22px, 4vw, 32px)",
                color: "var(--color-primary)",
                marginBottom: 24,
                textAlign: "left",
              }}
            >
              {rightTitle}
            </h3>
            <div style={{ textAlign: "left" }}>
              <Streamdown>{rightContent}</Streamdown>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 1024px) {
            .step1-grid {
              grid-template-columns: 1fr !important;
            }
            .step1-sticky {
              position: static !important;
            }
          }
        `}</style>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Section 3: Step 2 Value Drivers
// ─────────────────────────────────────────────────────────────────────

function Step2Section({ content }: { content: string }) {
  // Extract positive and negative driver sections
  const positiveMatch = content.match(/### Positive Impact\n([\s\S]*?)(?=### Negative Impact|$)/);
  const negativeMatch = content.match(/### Negative Impact\n([\s\S]*?)(?=####|$)/);
  const calloutMatch = content.match(/#### What this means for you\n([\s\S]*?)(?=##|$)/);

  const positiveContent = positiveMatch?.[1] || "";
  const negativeContent = negativeMatch?.[1] || "";
  const calloutContent = calloutMatch?.[1] || "";

  return (
    <section
      style={{
        backgroundColor: "white",
        paddingTop: "64px",
        paddingBottom: "64px",
      }}
    >
      <div className="g-container" style={{ maxWidth: 1200 }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(28px, 5vw, 44px)",
            color: "var(--color-primary)",
            marginBottom: 16,
            textAlign: "left",
          }}
        >
          Step 2. Value Drivers
        </h2>
        <div
          style={{
            width: 64,
            height: 1,
            backgroundColor: "#6B2C2C",
            marginBottom: 48,
          }}
        />

        {/* Positive Impact */}
        <div style={{ marginBottom: 32 }}>
          <h3
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              fontSize: "clamp(20px, 4vw, 28px)",
              color: "var(--color-primary)",
              marginBottom: 16,
              textAlign: "left",
            }}
          >
            Positive Impact
          </h3>
          <div style={{ textAlign: "left" }}>
            <Streamdown>{positiveContent}</Streamdown>
          </div>
        </div>

        {/* Negative Impact */}
        <div style={{ marginBottom: 32 }}>
          <h3
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              fontSize: "clamp(20px, 4vw, 28px)",
              color: "var(--color-primary)",
              marginBottom: 16,
              textAlign: "left",
            }}
          >
            Negative Impact
          </h3>
          <div style={{ textAlign: "left" }}>
            <Streamdown>{negativeContent}</Streamdown>
          </div>
        </div>

        {/* Hidden teaser overlay */}
        <div style={{ marginTop: 32, marginBottom: 32 }}>
          <HiddenRiskTeaser />
        </div>

        {/* What this means for you callout */}
        {calloutContent && (
          <div
            style={{
              backgroundColor: "white",
              border: "1px solid rgba(27, 58, 92, 0.12)",
              borderRadius: 6,
              padding: 24,
              marginTop: 32,
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                fontSize: 12,
                color: "var(--color-primary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
                textAlign: "left",
              }}
            >
              What this means for you
            </p>
            <div style={{ textAlign: "left" }}>
              <Streamdown>{calloutContent}</Streamdown>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Section 4: Step 3 Valuation and Buyers
// ─────────────────────────────────────────────────────────────────────

function Step3Section({ content }: { content: string }) {
  // Extract value range
  const valueMatch = content.match(/# (₪[^(]+)\n### \((.*?)\)/);
  const nisRange = valueMatch?.[1] || "₪X.XM to ₪Y.YM";
  const usdRange = valueMatch?.[2] || "USD equivalent";

  // Extract based on line
  const basedMatch = content.match(/Based on: (.*?)\n/);
  const basedOn = basedMatch?.[1] || "Business Details, Similar Israeli Deals, Market Trends";

  // Extract buyers section
  const buyersMatch = content.match(/### Your Buyers\n([\s\S]*?)(?=### What would|##|$)/);
  const buyersContent = buyersMatch?.[1] || "";

  // Extract what would sharpen section
  const sharpenMatch = content.match(/### What would sharpen your number\n([\s\S]*?)(?=### What this means|##|$)/);
  const sharpenContent = sharpenMatch?.[1] || "";

  // Extract final callout
  const finalCalloutMatch = content.match(/### What this means for you\n([\s\S]*?)(?=##|$)/);
  const finalCalloutContent = finalCalloutMatch?.[1] || "";

  return (
    <section
      style={{
        backgroundColor: "#F8F4ED",
        paddingTop: "80px",
        paddingBottom: "80px",
      }}
    >
      <div className="g-container" style={{ maxWidth: 1200 }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(28px, 5vw, 44px)",
            color: "var(--color-primary)",
            marginBottom: 16,
            textAlign: "left",
          }}
        >
          Step 3. Valuation and Buyers
        </h2>
        <div
          style={{
            width: 64,
            height: 1,
            backgroundColor: "#6B2C2C",
            marginBottom: 48,
          }}
        />

        {/* Value range display */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(48px, 10vw, 96px)",
              color: "var(--color-primary)",
              marginBottom: 8,
            }}
          >
            {nisRange}
          </div>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              fontSize: "clamp(18px, 4vw, 28px)",
              color: "#6B6B6B",
              marginBottom: 16,
            }}
          >
            {usdRange}
          </p>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 16, color: "#1A1A1A", textAlign: "center" }}>
            Based on: {basedOn}
          </p>
        </div>

        {/* Buyers section */}
        {buyersContent && (
          <div style={{ marginTop: 48, marginBottom: 48 }}>
            <h3
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 600,
                fontSize: "clamp(20px, 4vw, 28px)",
                color: "var(--color-primary)",
                marginBottom: 24,
                textAlign: "left",
              }}
            >
              Your Buyers
            </h3>
            <div style={{ textAlign: "left" }}>
              <Streamdown>{buyersContent}</Streamdown>
            </div>
          </div>
        )}

        {/* What would sharpen section */}
        {sharpenContent && (
          <div style={{ marginBottom: 48 }}>
            <h3
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 600,
                fontSize: "clamp(20px, 4vw, 28px)",
                color: "var(--color-primary)",
                marginBottom: 16,
                textAlign: "left",
              }}
            >
              What would sharpen your number
            </h3>
            <div style={{ textAlign: "left" }}>
              <Streamdown>{sharpenContent}</Streamdown>
            </div>
          </div>
        )}

        {/* Final callout */}
        {finalCalloutContent && (
          <div
            style={{
              backgroundColor: "white",
              border: "1px solid rgba(27, 58, 92, 0.12)",
              borderRadius: 6,
              padding: 24,
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                fontSize: 12,
                color: "var(--color-primary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
                textAlign: "left",
              }}
            >
              What this means for you
            </p>
            <div style={{ textAlign: "left" }}>
              <Streamdown>{finalCalloutContent}</Streamdown>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Section 5: Next Step
// ─────────────────────────────────────────────────────────────────────

function NextStepSection({ content }: { content: string }) {
  // Extract founder info
  const ofirMatch = content.match(/\[Ofir's photo and name\]\n(.*?)\n\n/);
  const benMatch = content.match(/\[Ben's photo and name\]\n(.*?)\n/);

  const ofirBio = ofirMatch?.[1] || "Ofir Ben Haim. 40 years working with Israeli businesses. Hundreds of transactions. CPA.";
  const benBio = benMatch?.[1] || "Benjamin Aronson. M&A, KPMG alum. Built and sold a company.";

  return (
    <section
      style={{
        backgroundColor: "var(--color-primary)",
        color: "white",
        paddingTop: "80px",
        paddingBottom: "80px",
      }}
    >
      <div className="g-container" style={{ maxWidth: 1200 }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(28px, 5vw, 44px)",
            color: "white",
            marginBottom: 16,
            textAlign: "left",
          }}
        >
          Next step
        </h2>
        <div
          style={{
            width: 64,
            height: 1,
            backgroundColor: "#6B2C2C",
            marginBottom: 48,
          }}
        />

        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            fontSize: "clamp(20px, 4vw, 28px)",
            color: "white",
            marginBottom: 8,
            textAlign: "left",
          }}
        >
          Want the full 15-page version. <span style={{ backgroundColor: "#6B2C2C", padding: "10px 24px", borderRadius: 6, display: "inline-block" }}>Book a 30 minute call with Ofir.</span> 100% confidential. No commitment.
        </p>

        {/* Founder cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
            marginTop: 60,
          }}
          className="next-step-grid"
        >
          {[
            { name: "OFIR BEN HAIM", bio: ofirBio },
            { name: "BENJAMIN ARONSON", bio: benBio },
          ].map((founder, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                borderRadius: 6,
                padding: 24,
              }}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: "4 / 3",
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  borderRadius: 6,
                  marginBottom: 16,
                }}
              />
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "clamp(20px, 4vw, 26px)",
                  color: "white",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: 8,
                  textAlign: "left",
                }}
              >
                {founder.name}
              </h3>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 15,
                  color: "rgba(255, 255, 255, 0.88)",
                  lineHeight: 1.55,
                  textAlign: "left",
                }}
              >
                {founder.bio}
              </p>
            </div>
          ))}
        </div>

        <style>{`
          @media (max-width: 768px) {
            .next-step-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </section>
  );
}
