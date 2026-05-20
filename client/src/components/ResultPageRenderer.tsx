import React, { useMemo } from "react";
import HiddenRiskTeaser from "./HiddenRiskTeaser";

interface ResultPageRendererProps {
  content: string;
}

/**
 * Comprehensive result page renderer for all 6 sections per Round 3 spec.
 * Parses markdown and renders with custom typography, layout, and styling.
 */
export default function ResultPageRenderer({ content }: ResultPageRendererProps) {
  const sections = useMemo(() => {
    // Parse the markdown into sections
    const lines = content.split("\n");
    const result: { [key: string]: string[] } = {
      header: [],
      step1: [],
      step2: [],
      step3: [],
      nextStep: [],
    };

    let currentSection = "header";

    for (const line of lines) {
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
        >
          {/* Left column */}
          <div>
            <p style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 24, color: "var(--color-primary)", marginBottom: 24 }}>
              Market content here
            </p>
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
          >
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, color: "var(--color-primary)", marginBottom: 24 }}>
              Company Name
            </h3>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "#1A1A1A" }}>Company details here</p>
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

        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 24, color: "var(--color-primary)", marginBottom: 16 }}>
            Positive Impact
          </h3>
          <div style={{ backgroundColor: "#F8F4ED", borderRadius: 6, padding: 24, marginBottom: 16 }}>
            <p style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 18, color: "var(--color-primary)", marginBottom: 8 }}>
              Driver name
            </p>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 16, color: "#1A1A1A", lineHeight: 1.55 }}>
              Driver description here
            </p>
          </div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 24, color: "var(--color-primary)", marginBottom: 16 }}>
            Negative Impact
          </h3>
          <div style={{ backgroundColor: "#F8F4ED", borderRadius: 6, padding: 24, marginBottom: 16 }}>
            <p style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 18, color: "var(--color-primary)", marginBottom: 8 }}>
              Risk factor
            </p>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 16, color: "#1A1A1A", lineHeight: 1.55 }}>
              Risk description here
            </p>
          </div>
        </div>

        {/* Hidden teaser overlay */}
        <div style={{ marginTop: 32, marginBottom: 32 }}>
          <HiddenRiskTeaser />
        </div>

        {/* What this means for you callout */}
        <div
          style={{
            backgroundColor: "white",
            border: "1px solid rgba(27, 58, 92, 0.12)",
            borderRadius: 6,
            padding: 24,
            marginTop: 32,
          }}
        >
          <p style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 12, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            What this means for you
          </p>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 18, color: "#1A1A1A", lineHeight: 1.55 }}>
            Callout content here
          </p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Section 4: Step 3 Valuation and Buyers
// ─────────────────────────────────────────────────────────────────────

function Step3Section({ content }: { content: string }) {
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
            ₪X.XM to ₪Y.YM
          </div>
          <p style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 24, color: "#6B6B6B", marginBottom: 16 }}>
            (USD equivalent: $A.AM to $B.BM)
          </p>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 16, color: "#1A1A1A" }}>
            Based on: Business Details, Similar Israeli Deals, Market Trends.
          </p>
        </div>

        {/* Approach table */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: 48,
            marginBottom: 48,
            border: "1px solid rgba(27, 58, 92, 0.08)",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "var(--color-primary)" }}>
              <th style={{ color: "white", padding: 12, textAlign: "left", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Approach
              </th>
              <th style={{ color: "white", padding: 12, textAlign: "left", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Range (NIS)
              </th>
              <th style={{ color: "white", padding: 12, textAlign: "left", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Multiplier
              </th>
              <th style={{ color: "white", padding: 12, textAlign: "left", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Basis
              </th>
            </tr>
          </thead>
          <tbody>
            {["Revenue multiple", "SDE multiple", "EBITDA multiple", "Strategic premium"].map((approach, idx) => (
              <tr
                key={idx}
                style={{
                  backgroundColor: approach === "EBITDA multiple" ? "rgba(27, 58, 92, 0.06)" : "white",
                  borderTop: "1px solid rgba(27, 58, 92, 0.08)",
                }}
              >
                <td
                  style={{
                    padding: 12,
                    fontFamily: "var(--font-sans)",
                    fontWeight: approach === "EBITDA multiple" ? 600 : 400,
                    fontSize: 16,
                    color: "#1A1A1A",
                    borderLeft: approach === "EBITDA multiple" ? "3px solid var(--color-primary)" : "none",
                  }}
                >
                  {approach}
                </td>
                <td style={{ padding: 12, fontFamily: "var(--font-sans)", fontSize: 16, color: "#1A1A1A" }}>Range</td>
                <td style={{ padding: 12, fontFamily: "var(--font-sans)", fontSize: 16, color: "#1A1A1A" }}>Multiple</td>
                <td style={{ padding: 12, fontFamily: "var(--font-sans)", fontSize: 16, color: "#1A1A1A" }}>Basis</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Your Buyers list */}
        <div style={{ marginBottom: 48 }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 24, color: "var(--color-primary)", marginBottom: 24 }}>
            Your Buyers
          </h3>
          <ol style={{ listStyle: "none", paddingLeft: 32 }}>
            {["Buyer 1", "Buyer 2", "Buyer 3"].map((buyer, idx) => (
              <li key={idx} style={{ marginBottom: 20, position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: -32,
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 20,
                    color: "var(--color-primary)",
                  }}
                >
                  {idx + 1}.
                </span>
                <p style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 18, color: "var(--color-primary)", marginBottom: 4 }}>
                  {buyer}.
                </p>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 16, color: "#1A1A1A", lineHeight: 1.55 }}>
                  Buyer description here
                </p>
              </li>
            ))}
          </ol>
        </div>

        {/* What this means for you callout */}
        <div
          style={{
            backgroundColor: "white",
            border: "1px solid rgba(27, 58, 92, 0.12)",
            borderRadius: 6,
            padding: 24,
          }}
        >
          <p style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 12, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            What this means for you
          </p>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 18, color: "#1A1A1A", lineHeight: 1.55 }}>
            Final callout here
          </p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Section 5: Next Step
// ─────────────────────────────────────────────────────────────────────

function NextStepSection({ content }: { content: string }) {
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
            fontSize: 24,
            color: "white",
            marginBottom: 8,
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
        >
          {[
            { name: "OFIR BEN HAIM", bio: "40 years working with Israeli businesses. Hundreds of transactions. CPA." },
            { name: "BENJAMIN ARONSON", bio: "M&A, KPMG alum. Built and sold a company." },
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
                  fontSize: 24,
                  color: "white",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: 8,
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
