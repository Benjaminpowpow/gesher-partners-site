import { useState, useRef, useEffect } from "react";
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

// Mapping dropdown values to midpoint numbers
const REVENUE_MIDPOINTS: Record<string, number | undefined> = {
  "less-5m": 2500000,
  "5-10m": 7500000,
  "10-20m": 15000000,
  "20-50m": 35000000,
  "50m-plus": 60000000,
};

const EBITDA_MIDPOINTS: Record<string, number | undefined> = {
  "less-500k": 250000,
  "500k-1m": 750000,
  "1m-2-5m": 1750000,
  "2-5m-5m": 3750000,
  "5m-plus": 6000000,
};

const SALARY_MIDPOINTS: Record<string, number | undefined> = {
  "less-300k": 200000,
  "300k-400k": 350000,
  "400k-500k": 450000,
  "500k-600k": 550000,
  "600k-plus": 700000,
};

function parseTabContent(fullMarkdown: string): { market: string; drivers: string; valuation: string } {
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
  const [salary, setSalary] = useState("");
  const [urlError, setUrlError] = useState("");

  const [statusIdx, setStatusIdx] = useState(0);
  const [statusKey, setStatusKey] = useState(0);
  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [briefResult, setBriefResult] = useState<BriefResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("market");
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [streamError, setStreamError] = useState("");

  const abortRef = useRef<AbortController | null>(null);

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
      // Convert dropdown selections to midpoint values
      const revenueValue = revenue ? REVENUE_MIDPOINTS[revenue] : undefined;
      const ebitdaValue = ebitda ? EBITDA_MIDPOINTS[ebitda] : undefined;
      const salaryValue = salary ? SALARY_MIDPOINTS[salary] : undefined;

      const resp = await fetch("/api/exit-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`,
          revenue: revenueValue,
          ebitda: ebitdaValue,
          sde: salaryValue,
        }),
        signal: ctrl.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Server error ${resp.status}`);
      }

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

        buffer = lines[lines.length - 1] ?? "";
      }

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
    setSalary("");
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
                <p className="small-caps" style={{ marginBottom: 20, color: "var(--color-secondary)", textAlign: "left" }}>
                  Free tool
                </p>
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: "clamp(60px, 8vw, 72px)",
                    color: "var(--color-primary)",
                    marginBottom: 24,
                    lineHeight: 1.1,
                    letterSpacing: "-0.01em",
                    textAlign: "left",
                  }}
                >
                  Get a quick read on your business.
                </h1>
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 16,
                    color: "var(--color-body)",
                    lineHeight: 1.75,
                    marginBottom: 48,
                    textAlign: "left",
                  }}
                >
                  What is your business worth? We pull comparable Israeli transactions and walk you through what a serious buyer would pay. Three sections: market context, value drivers, and a valuation range. Backed by real data.
                </p>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {/* URL Input Box */}
                  <div
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid rgba(12, 27, 46, 0.12)",
                      borderRadius: 6,
                      padding: 24,
                    }}
                  >
                    <label
                      htmlFor="brief-url"
                      style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 15, color: "var(--color-secondary)", marginBottom: 12 }}
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
                      style={{
                        width: "100%",
                        border: "none",
                        borderBottom: "1px solid var(--color-hairline)",
                        padding: "12px 0",
                        fontFamily: "var(--font-sans)",
                        fontSize: 16,
                        backgroundColor: "transparent",
                      }}
                    />
                    {urlError && (
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--color-accent)", marginTop: 8 }}>
                        {urlError}
                      </p>
                    )}
                  </div>

                  {/* Optional financial intake */}
                  <div
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid rgba(12, 27, 46, 0.12)",
                      borderRadius: 6,
                      padding: 24,
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontWeight: 500,
                        fontSize: 14,
                        color: "var(--color-secondary)",
                        marginBottom: 8,
                        textTransform: "uppercase",
                        letterSpacing: "0.15em",
                      }}
                    >
                      Optional. Sharpen your range.
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 14,
                        color: "var(--color-secondary)",
                        lineHeight: 1.55,
                        marginBottom: 20,
                      }}
                    >
                      Numbers sharpen the valuation range. We never share them.
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }} className="intake-grid">
                      <div>
                        <label
                          htmlFor="brief-revenue"
                          style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 13, color: "var(--color-secondary)", marginBottom: 6 }}
                        >
                          Annual revenue (NIS)
                        </label>
                        <select
                          id="brief-revenue"
                          value={revenue}
                          onChange={e => setRevenue(e.target.value)}
                          style={{
                            width: "100%",
                            border: "none",
                            borderBottom: "1px solid var(--color-hairline)",
                            padding: "12px 0",
                            fontFamily: "var(--font-sans)",
                            fontSize: 15,
                            backgroundColor: "transparent",
                            color: revenue ? "var(--color-body)" : "var(--color-secondary)",
                            cursor: "pointer",
                          }}
                        >
                          <option value="">Select a range</option>
                          <option value="less-5m">Less than 5M NIS</option>
                          <option value="5-10m">5-10M NIS</option>
                          <option value="10-20m">10-20M NIS</option>
                          <option value="20-50m">20-50M NIS</option>
                          <option value="50m-plus">50M+ NIS</option>
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="brief-ebitda"
                          style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 13, color: "var(--color-secondary)", marginBottom: 6 }}
                        >
                          EBITDA or net profit (NIS)
                        </label>
                        <select
                          id="brief-ebitda"
                          value={ebitda}
                          onChange={e => setEbitda(e.target.value)}
                          style={{
                            width: "100%",
                            border: "none",
                            borderBottom: "1px solid var(--color-hairline)",
                            padding: "12px 0",
                            fontFamily: "var(--font-sans)",
                            fontSize: 15,
                            backgroundColor: "transparent",
                            color: ebitda ? "var(--color-body)" : "var(--color-secondary)",
                            cursor: "pointer",
                          }}
                        >
                          <option value="">Select a range</option>
                          <option value="less-500k">Less than 500K NIS</option>
                          <option value="500k-1m">500K-1M NIS</option>
                          <option value="1m-2-5m">1M-2.5M NIS</option>
                          <option value="2-5m-5m">2.5M-5M NIS</option>
                          <option value="5m-plus">5M+ NIS</option>
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="brief-salary"
                          style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 13, color: "var(--color-secondary)", marginBottom: 6 }}
                        >
                          Owner salary (NIS)
                        </label>
                        <select
                          id="brief-salary"
                          value={salary}
                          onChange={e => setSalary(e.target.value)}
                          style={{
                            width: "100%",
                            border: "none",
                            borderBottom: "1px solid var(--color-hairline)",
                            padding: "12px 0",
                            fontFamily: "var(--font-sans)",
                            fontSize: 15,
                            backgroundColor: "transparent",
                            color: salary ? "var(--color-body)" : "var(--color-secondary)",
                            cursor: "pointer",
                          }}
                        >
                          <option value="">Select a range</option>
                          <option value="less-300k">Less than 300K NIS</option>
                          <option value="300k-400k">300K-400K NIS</option>
                          <option value="400k-500k">400K-500K NIS</option>
                          <option value="500k-600k">500K-600K NIS</option>
                          <option value="600k-plus">600K+ NIS</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {streamError && (
                    <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--color-accent)" }}>
                      {streamError}
                    </p>
                  )}

                  <div>
                    <button type="submit" className="btn-solid" style={{ fontSize: 17, padding: "18px 40px" }}>
                      Generate my Exit Brief
                    </button>
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        color: "var(--color-secondary)",
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
                  textAlign: "left",
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
                        animation: `pulse 1.5s ease-in-out ${i * 0.3}s infinite`,
                      }}
                    />
                  ))}
                </div>

                <p
                  key={statusKey}
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 18,
                    color: "var(--color-body)",
                    lineHeight: 1.65,
                    animation: "fadeIn 0.4s ease-out",
                  }}
                >
                  {STATUS_MESSAGES[statusIdx]}
                </p>

                <style>{`
                  @keyframes pulse {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 1; }
                  }
                  @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                  }
                `}</style>
              </div>
            </div>
          </section>
        )}

        {/* ── RESULT SCREEN ── */}
        {screen === "result" && briefResult && (
          <section className="g-section">
            <div className="g-container">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 48, alignItems: "start" }} className="result-grid">
                {/* Main content */}
                <div>
                  {/* Tab buttons */}
                  <div style={{ display: "flex", gap: 16, marginBottom: 40, borderBottom: "1px solid var(--color-hairline)", paddingBottom: 20 }}>
                    {(["market", "drivers", "valuation"] as TabId[]).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                          background: "none",
                          border: "none",
                          fontFamily: "var(--font-sans)",
                          fontSize: 15,
                          fontWeight: activeTab === tab ? 600 : 400,
                          color: activeTab === tab ? "var(--color-primary)" : "var(--color-secondary)",
                          cursor: "pointer",
                          paddingBottom: 8,
                          borderBottom: activeTab === tab ? "2px solid var(--color-primary)" : "none",
                          transition: "color 150ms",
                        }}
                      >
                        {tab === "market" && "Market Snapshot"}
                        {tab === "drivers" && "Value Drivers"}
                        {tab === "valuation" && "Valuation and Buyers"}
                      </button>
                    ))}
                  </div>

                  {/* Tab content */}
                  <BriefMarkdown content={tabContent} />

                  {/* PDF button */}
                  <div style={{ marginTop: 40 }}>
                    <button
                      onClick={() => setShowPdfModal(true)}
                      className="btn-solid"
                    >
                      Download as PDF
                    </button>
                  </div>
                </div>

                {/* Ofir sidebar */}
                <OfirSidebar />
              </div>

              {/* Reset button */}
              <div style={{ marginTop: 60, textAlign: "left" }}>
                <button
                  onClick={handleReset}
                  className="btn-ghost"
                >
                  Generate another brief
                </button>
              </div>
            </div>

            <style>{`
              @media (max-width: 1024px) {
                .result-grid {
                  grid-template-columns: 1fr !important;
                }
              }
            `}</style>
          </section>
        )}

        {/* PDF Modal */}
        {showPdfModal && briefResult && (
          <PdfModal
            briefId={briefResult.briefId}
            onClose={() => setShowPdfModal(false)}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
