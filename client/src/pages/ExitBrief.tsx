import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import OfirSidebar from "@/components/OfirSidebar";
import BriefMarkdown from "@/components/BriefMarkdown";
import PdfModal from "@/components/PdfModal";

type ScreenState = "input" | "generating" | "result";
type TabId = "market" | "drivers" | "valuation";

const STATUS_MESSAGES = [
  "Reading your website.",
  "Searching Israeli M&A transactions.",
  "Identifying your buyer pool.",
  "Calculating your valuation range.",
  "Writing your brief.",
];

interface BriefResult {
  briefId: string;
  market: string;
  drivers: string;
  valuation: string;
}

function parseTabContent(fullMarkdown: string): { market: string; drivers: string; valuation: string } {
  // Split on the three section headers
  const marketMatch = fullMarkdown.match(/## Step 1[\s\S]*?(?=## Step 2|$)/);
  const driversMatch = fullMarkdown.match(/## Step 2[\s\S]*?(?=## Step 3|$)/);
  const valuationMatch = fullMarkdown.match(/## Step 3[\s\S]*/);

  return {
    market: marketMatch ? marketMatch[0].trim() : fullMarkdown,
    drivers: driversMatch ? driversMatch[0].trim() : "",
    valuation: valuationMatch ? valuationMatch[0].trim() : "",
  };
}

export default function ExitBrief() {
  const [screen, setScreen] = useState<ScreenState>("input");
  const [url, setUrl] = useState("");
  const [revenue, setRevenue] = useState("");
  const [ebitda, setEbitda] = useState("");
  const [sde, setSde] = useState("");
  const [urlError, setUrlError] = useState("");

  const [statusIdx, setStatusIdx] = useState(0);
  const [statusKey, setStatusKey] = useState(0);
  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [briefResult, setBriefResult] = useState<BriefResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("market");
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [streamError, setStreamError] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  // Rotate status messages during generation
  useEffect(() => {
    if (screen === "generating") {
      setStatusIdx(0);
      setStatusKey(k => k + 1);
      statusIntervalRef.current = setInterval(() => {
        setStatusIdx(i => {
          const next = i + 1;
          if (next < STATUS_MESSAGES.length) {
            setStatusKey(k => k + 1);
            return next;
          }
          return i;
        });
      }, 4500);
    } else {
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    }
    return () => {
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    };
  }, [screen]);

  const validateUrl = (val: string) => {
    try {
      const u = new URL(val.startsWith("http") ? val : `https://${val}`);
      return u.hostname.includes(".");
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim();
    if (!validateUrl(cleanUrl)) {
      setUrlError("Please enter a valid website URL, e.g. https://your-company.co.il");
      return;
    }
    setUrlError("");
    setScreen("generating");
    setStreamError("");

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const resp = await fetch("/api/exit-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`,
          revenue: revenue || undefined,
          ebitda: ebitda || undefined,
          sde: sde || undefined,
        }),
        signal: ctrl.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Server error ${resp.status}`);
      }

      // Handle streaming response (newline-delimited JSON)
      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let collectedMarkdown = "";
      let resultBriefId = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Process complete lines
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          try {
            const event = JSON.parse(line) as { type: string; data?: string; briefId?: string };
            if (event.type === "chunk" && event.data) {
              collectedMarkdown += event.data;
            } else if (event.type === "done" && event.briefId) {
              resultBriefId = event.briefId;
            }
          } catch (e) {
            // Skip unparseable lines
          }
        }

        // Keep incomplete line in buffer
        buffer = lines[lines.length - 1] ?? "";
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer) as { type: string; data?: string; briefId?: string };
          if (event.type === "chunk" && event.data) {
            collectedMarkdown += event.data;
          } else if (event.type === "done" && event.briefId) {
            resultBriefId = event.briefId;
          }
        } catch (e) {
          // Skip unparseable lines
        }
      }

      const tabs = parseTabContent(collectedMarkdown);
      setBriefResult({ briefId: resultBriefId, ...tabs });
      setScreen("result");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setStreamError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setScreen("input");
    }
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setScreen("input");
    setUrl("");
    setRevenue("");
    setEbitda("");
    setSde("");
    setBriefResult(null);
    setActiveTab("market");
    setStreamError("");
  };

  const tabContent = briefResult
    ? activeTab === "market"
      ? briefResult.market
      : activeTab === "drivers"
      ? briefResult.drivers
      : briefResult.valuation
    : "";

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh" }}>
      <Nav />
      <main style={{ paddingTop: 64 }}>

        {/* ── INPUT SCREEN ── */}
        {screen === "input" && (
          <section className="g-section">
            <div className="g-container">
              <div style={{ maxWidth: 680, margin: "0 auto" }} className="g-fade-in">
                <p className="g-eyebrow" style={{ marginBottom: 20 }}>Free tool</p>
                <h1
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontWeight: 700,
                    fontSize: "clamp(32px, 5vw, 56px)",
                    color: "var(--color-primary)",
                    marginBottom: 20,
                    lineHeight: 1.1,
                  }}
                >
                  Get a quick read on your business.
                </h1>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 18,
                    color: "var(--color-body)",
                    lineHeight: 1.65,
                    marginBottom: 48,
                  }}
                >
                  Paste your company website. We read it, pull comparable Israeli transactions, and return a three-part brief: market context, value drivers, and an estimated valuation range.
                </p>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <div>
                    <label
                      htmlFor="brief-url"
                      style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 15, color: "var(--color-body)", marginBottom: 8 }}
                    >
                      Company website URL
                    </label>
                    <input
                      id="brief-url"
                      type="text"
                      required
                      value={url}
                      onChange={e => { setUrl(e.target.value); setUrlError(""); }}
                      placeholder="https://your-company.co.il"
                      style={{ fontSize: 17 }}
                    />
                    {urlError && (
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--color-accent)", marginTop: 6 }}>
                        {urlError}
                      </p>
                    )}
                  </div>

                  {/* Optional financial intake */}
                  <div
                    style={{
                      backgroundColor: "var(--color-white)",
                      border: "1px solid rgba(27,58,92,0.12)",
                      borderRadius: 8,
                      padding: "24px 24px 20px",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontWeight: 500,
                        fontSize: 14,
                        color: "var(--color-subtext)",
                        marginBottom: 4,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                      }}
                    >
                      Optional — sharpen your range
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 14,
                        color: "var(--color-subtext)",
                        lineHeight: 1.55,
                        marginBottom: 20,
                      }}
                    >
                      Financial figures sharpen the valuation range from [low] to [high] confidence. We never share them.
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }} className="intake-grid">
                      <div>
                        <label
                          htmlFor="brief-revenue"
                          style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 13, color: "var(--color-subtext)", marginBottom: 6 }}
                        >
                          Annual revenue (NIS)
                        </label>
                        <input
                          id="brief-revenue"
                          type="text"
                          value={revenue}
                          onChange={e => setRevenue(e.target.value)}
                          placeholder="e.g. 12,000,000"
                          style={{ fontSize: 15 }}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="brief-ebitda"
                          style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 13, color: "var(--color-subtext)", marginBottom: 6 }}
                        >
                          EBITDA or net profit (NIS)
                        </label>
                        <input
                          id="brief-ebitda"
                          type="text"
                          value={ebitda}
                          onChange={e => setEbitda(e.target.value)}
                          placeholder="e.g. 2,400,000"
                          style={{ fontSize: 15 }}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="brief-sde"
                          style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 13, color: "var(--color-subtext)", marginBottom: 6 }}
                        >
                          Owner salary + net profit (NIS)
                        </label>
                        <input
                          id="brief-sde"
                          type="text"
                          value={sde}
                          onChange={e => setSde(e.target.value)}
                          placeholder="e.g. 3,200,000"
                          style={{ fontSize: 15 }}
                        />
                      </div>
                    </div>
                  </div>

                  {streamError && (
                    <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--color-accent)" }}>
                      {streamError}
                    </p>
                  )}

                  <div>
                    <button type="submit" className="g-btn-primary" style={{ fontSize: 17, padding: "18px 40px" }}>
                      Generate my Exit Brief
                    </button>
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        color: "var(--color-subtext)",
                        marginTop: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      Strictly private. Built from public sources. Not an offer or a valuation opinion.
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </section>
        )}

        {/* ── GENERATING SCREEN ── */}
        {screen === "generating" && (
          <section className="g-section">
            <div className="g-container">
              <div
                style={{
                  maxWidth: 560,
                  margin: "0 auto",
                  textAlign: "center",
                  paddingTop: 40,
                }}
                className="g-fade-in"
              >
                {/* Animated dots */}
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 48 }}>
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "var(--color-primary)",
                        animation: `dotPulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                        opacity: 0.3,
                      }}
                    />
                  ))}
                </div>

                <h2
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontWeight: 600,
                    fontSize: 32,
                    color: "var(--color-primary)",
                    marginBottom: 24,
                  }}
                >
                  Reading your business.
                </h2>

                <p
                  key={statusKey}
                  className="g-status-text"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 17,
                    color: "var(--color-subtext)",
                    lineHeight: 1.6,
                  }}
                >
                  {STATUS_MESSAGES[statusIdx]}
                </p>

                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "var(--color-subtext)",
                    marginTop: 40,
                    lineHeight: 1.5,
                  }}
                >
                  This typically takes 30 to 90 seconds.
                  <br />
                  We are searching Israeli M&A databases and reading your site.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── RESULT SCREEN ── */}
        {screen === "result" && briefResult && (
          <section style={{ paddingTop: 48, paddingBottom: 80 }}>
            <div className="g-container">
              {/* Header */}
              <div style={{ marginBottom: 40 }} className="g-fade-in">
                <p className="g-eyebrow" style={{ marginBottom: 12 }}>Your Exit Brief</p>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
                  <h1
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontWeight: 700,
                      fontSize: "clamp(28px, 4vw, 44px)",
                      color: "var(--color-primary)",
                    }}
                  >
                    Your business, read.
                  </h1>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button
                      onClick={() => setShowPdfModal(true)}
                      className="g-btn-secondary"
                      style={{ fontSize: 14, padding: "10px 20px" }}
                    >
                      Download as PDF
                    </button>
                    <button
                      onClick={handleReset}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "var(--font-sans)",
                        fontSize: 14,
                        color: "var(--color-subtext)",
                        padding: "10px 0",
                        transition: "color 150ms",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = "var(--color-primary)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--color-subtext)")}
                    >
                      Start a new brief
                    </button>
                  </div>
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "var(--color-subtext)",
                    marginTop: 8,
                  }}
                >
                  Strictly private. Built from public sources. Not an offer or a valuation opinion.
                </p>
              </div>

              {/* Tab bar */}
              <div
                style={{
                  display: "flex",
                  borderBottom: "2px solid rgba(27,58,92,0.12)",
                  marginBottom: 40,
                  gap: 0,
                }}
              >
                {(["market", "drivers", "valuation"] as TabId[]).map(tab => {
                  const labels: Record<TabId, string> = {
                    market: "Market Snapshot",
                    drivers: "Value Drivers",
                    valuation: "Valuation and Buyers",
                  };
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "var(--font-sans)",
                        fontWeight: isActive ? 600 : 400,
                        fontSize: 15,
                        color: isActive ? "var(--color-primary)" : "var(--color-subtext)",
                        padding: "12px 24px 14px",
                        borderBottom: isActive ? "2px solid var(--color-primary)" : "2px solid transparent",
                        marginBottom: -2,
                        transition: "color 150ms, border-color 150ms",
                      }}
                    >
                      {labels[tab]}
                    </button>
                  );
                })}
              </div>

              {/* Content + sidebar */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 300px",
                  gap: 48,
                  alignItems: "start",
                }}
                className="result-grid"
              >
                {/* Main content */}
                <div key={activeTab} className="g-fade-in">
                  {tabContent ? (
                    <BriefMarkdown content={tabContent} />
                  ) : (
                    <p style={{ fontFamily: "var(--font-sans)", color: "var(--color-subtext)", fontStyle: "italic" }}>
                      This section was not generated. Start a new brief to try again.
                    </p>
                  )}
                </div>

                {/* Ofir sidebar */}
                <OfirSidebar />
              </div>
            </div>
          </section>
        )}

      </main>
      <Footer />

      {/* PDF Modal */}
      {showPdfModal && briefResult && (
        <PdfModal briefId={briefResult.briefId} onClose={() => setShowPdfModal(false)} />
      )}

      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.15; transform: scale(0.9); }
          40% { opacity: 1; transform: scale(1.1); }
        }
        @media (max-width: 900px) {
          .result-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .intake-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
