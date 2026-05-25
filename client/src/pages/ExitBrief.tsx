import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import BriefMarkdown from "@/components/BriefMarkdown";
import PdfModal from "@/components/PdfModal";
import HiddenRiskTeaser from "@/components/HiddenRiskTeaser";
import ResultPageRenderer from "@/components/ResultPageRenderer";

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
  // v7 seller-only headers: ## Market / ## Value / ## Range and call
  const marketMatch = fullMarkdown.match(/## Market[\s\S]*?(?=## Value|$)/);
  const driversMatch = fullMarkdown.match(/## Value[\s\S]*?(?=## Range and call|$)/);
  const valuationMatch = fullMarkdown.match(/## Range and call[\s\S]*/);

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

  // FEATURE-1: Normalize URL by adding https:// if no protocol
  const normalizeUrl = (urlStr: string): string => {
    const trimmed = urlStr.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  const validateUrl = (urlStr: string): boolean => {
    try {
      const parsed = new URL(urlStr);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError("");
    setStreamError("");
    
    if (!url.trim()) {
      setUrlError("Please enter a website URL");
      return;
    }
    
    // FEATURE-1: Normalize URL at the start
    const normalizedUrl = normalizeUrl(url);
    
    if (!validateUrl(normalizedUrl)) {
      setUrlError("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    setScreen("generating");
    abortRef.current = new AbortController();

    try {
      const body = {
        url: normalizedUrl,
        ...(revenue && { revenue: String(REVENUE_MIDPOINTS[revenue] || 0) }),
        ...(ebitda && { ebitda: String(EBITDA_MIDPOINTS[ebitda] || 0) }),
        ...(salary && { sde: String(SALARY_MIDPOINTS[salary] || 0) }),
      };

      const response = await fetch(`/api/exit-brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        try {
          const json = JSON.parse(error);
          setStreamError(json.error || "Failed to generate brief");
        } catch {
          setStreamError(error || "Failed to generate brief");
        }
        setScreen("input");
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setStreamError("Failed to read response");
        setScreen("input");
        return;
      }

      let fullMarkdown = "";
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines (NDJSON format)
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const json = JSON.parse(line);
              if (json.type === "chunk" && json.data) {
                fullMarkdown += json.data;
              } else if (json.type === "done") {
                // Brief generation complete, briefId is in json.briefId
              }
            } catch (e) {
              console.warn("[ExitBrief] Failed to parse NDJSON line:", line.substring(0, 100), e);
            }
          }
        }
      }
      
      // Process any remaining content in buffer (including final line without newline)
      if (buffer.trim()) {
        try {
          const json = JSON.parse(buffer);
          if (json.type === "chunk" && json.data) {
            fullMarkdown += json.data;
          } else if (json.type === "done") {
            // Brief generation complete
          }
        } catch (e) {
          console.warn("[ExitBrief] Failed to parse final NDJSON buffer:", buffer.substring(0, 100), e);
        }
      }
      
      // Debug: Log the markdown length to verify content was received
      console.log("[ExitBrief] Received markdown length:", fullMarkdown.length);
      if (fullMarkdown.length < 100) {
        console.warn("[ExitBrief] Warning: Very short markdown received. Content may not have streamed properly.");
      }

      const parsed = parseTabContent(fullMarkdown);
      const briefId = Math.random().toString(36).substring(7);
      
      // Debug: Log the parsed content
      console.log("[ExitBrief] Parsed market length:", parsed.market.length);
      console.log("[ExitBrief] Parsed drivers length:", parsed.drivers.length);
      console.log("[ExitBrief] Parsed valuation length:", parsed.valuation.length);
      console.log("[ExitBrief] First 200 chars of market:", parsed.market.substring(0, 200));

      setBriefResult({
        briefId,
        market: parsed.market,
        drivers: parsed.drivers,
        valuation: parsed.valuation,
      });

      setScreen("result");
      setActiveTab("market");
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setStreamError(err.message || "An error occurred");
      }
      setScreen("input");
    }
  };

  const handleReset = () => {
    setScreen("input");
    setUrl("");
    setRevenue("");
    setEbitda("");
    setSalary("");
    setUrlError("");
    setStreamError("");
    setBriefResult(null);
    setActiveTab("market");
    setShowPdfModal(false);
    if (abortRef.current) abortRef.current.abort();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Nav />
      <main className="flex-1">
        {/* ── INPUT SCREEN ── */}
        {screen === "input" && (
          <section className="g-section">
            <div className="g-container" style={{ maxWidth: 600 }}>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(32px, 6vw, 44px)",
                  fontWeight: 700,
                  color: "var(--color-primary)",
                  marginBottom: 16,
                  textAlign: "left",
                }}
              >
                What is your business worth?
              </h1>

              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 18,
                  color: "var(--color-body)",
                  lineHeight: 1.65,
                  marginBottom: 40,
                  textAlign: "left",
                }}
              >
                Paste your website URL. We'll analyze your business, Israeli M&A transactions in your vertical, and build a valuation range in about 2.5 minutes.
              </p>

              <form onSubmit={handleSubmit} style={{ marginBottom: 40 }}>
                {/* URL Input - boxed */}
                <div
                  style={{
                    border: "1px solid rgba(27, 58, 92, 0.15)",
                    borderRadius: 8,
                    padding: 24,
                    marginBottom: 24,
                    backgroundColor: "white",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      fontFamily: "var(--font-sans)",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--color-primary)",
                      marginBottom: 8,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Your website
                  </label>
                  <input
                    type="text"
                    placeholder="https://example.com or example.com"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setUrlError("");
                    }}
                    style={{
                      width: "100%",
                      fontFamily: "var(--font-sans)",
                      fontSize: 16,
                      padding: "12px 0",
                      border: "none",
                      borderBottom: "1px solid var(--color-hairline)",
                      outline: "none",
                      backgroundColor: "transparent",
                      color: "var(--color-body)",
                    }}
                  />
                  {urlError && (
                    <p style={{ color: "#C8102E", fontSize: 14, marginTop: 8 }}>
                      {urlError}
                    </p>
                  )}
                </div>

                {/* Optional section */}
                <div
                  style={{
                    border: "1px solid rgba(27, 58, 92, 0.15)",
                    borderRadius: 8,
                    padding: 24,
                    marginBottom: 24,
                    backgroundColor: "white",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--color-primary)",
                      marginBottom: 8,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Optional. Sharpen your range.
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--color-secondary)",
                      marginBottom: 20,
                    }}
                  >
                    Numbers sharpen the valuation range. We never share them.
                  </p>

                  {/* Revenue Dropdown */}
                  <label
                    style={{
                      display: "block",
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--color-primary)",
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Annual revenue (NIS)
                  </label>
                  <select
                    value={revenue}
                    onChange={(e) => setRevenue(e.target.value)}
                    style={{
                      width: "100%",
                      fontFamily: "var(--font-sans)",
                      fontSize: 14,
                      padding: "10px 0",
                      border: "none",
                      borderBottom: "1px solid var(--color-hairline)",
                      outline: "none",
                      backgroundColor: "transparent",
                      color: "var(--color-body)",
                      marginBottom: 20,
                      cursor: "pointer",
                    }}
                  >
                    <option value="">Select...</option>
                    <option value="less-5m">Less than 5M</option>
                    <option value="5-10m">5M - 10M</option>
                    <option value="10-20m">10M - 20M</option>
                    <option value="20-50m">20M - 50M</option>
                    <option value="50m-plus">50M+</option>
                  </select>

                  {/* EBITDA Dropdown */}
                  <label
                    style={{
                      display: "block",
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--color-primary)",
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    EBITDA (NIS)
                  </label>
                  <select
                    value={ebitda}
                    onChange={(e) => setEbitda(e.target.value)}
                    style={{
                      width: "100%",
                      fontFamily: "var(--font-sans)",
                      fontSize: 14,
                      padding: "10px 0",
                      border: "none",
                      borderBottom: "1px solid var(--color-hairline)",
                      outline: "none",
                      backgroundColor: "transparent",
                      color: "var(--color-body)",
                      marginBottom: 20,
                      cursor: "pointer",
                    }}
                  >
                    <option value="">Select...</option>
                    <option value="less-500k">Less than 500K</option>
                    <option value="500k-1m">500K - 1M</option>
                    <option value="1m-2-5m">1M - 2.5M</option>
                    <option value="2-5m-5m">2.5M - 5M</option>
                    <option value="5m-plus">5M+</option>
                  </select>

                  {/* Salary Dropdown */}
                  <label
                    style={{
                      display: "block",
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--color-primary)",
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Owner salary (NIS)
                  </label>
                  <select
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    style={{
                      width: "100%",
                      fontFamily: "var(--font-sans)",
                      fontSize: 14,
                      padding: "10px 0",
                      border: "none",
                      borderBottom: "1px solid var(--color-hairline)",
                      outline: "none",
                      backgroundColor: "transparent",
                      color: "var(--color-body)",
                      cursor: "pointer",
                    }}
                  >
                    <option value="">Select...</option>
                    <option value="less-300k">Less than 300K</option>
                    <option value="300k-400k">300K - 400K</option>
                    <option value="400k-500k">400K - 500K</option>
                    <option value="500k-600k">500K - 600K</option>
                    <option value="600k-plus">600K+</option>
                  </select>
                </div>

                {/* FEATURE-2: Restyle button with navy background and improved contrast */}
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    width: "100%",
                    background: "#1B3A5C",
                    color: "#FFFFFF",
                    borderRadius: "6px",
                    padding: "14px 32px",
                    font: "600 16px Inter, sans-serif",
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#0f2438")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#1B3A5C")}
                >
                  Quick valuation
                </button>
              </form>

              {streamError && (
                <div style={{ color: "#C8102E", fontSize: 14, padding: 16, backgroundColor: "#FFF0F0", borderRadius: 6 }}>
                  {streamError}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── GENERATING SCREEN ── */}
        {screen === "generating" && (
          <section className="g-section">
            <div style={{ maxWidth: 600, margin: "120px auto 200px", textAlign: "center" }}>
              {/* Animated three dots */}
              <div style={{ marginBottom: 40, display: "flex", justifyContent: "center", gap: 8 }}>
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: "#1B3A5C",
                      animation: `pulse 1.2s ease-in-out infinite`,
                      animationDelay: `${i * 0.4}s`,
                    }}
                  />
                ))}
              </div>

              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "clamp(22px, 4vw, 32px)",
                  color: "var(--color-primary)",
                  marginBottom: 16,
                }}
              >
                Reading your business.
              </h2>

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

              <div style={{ marginTop: 40, borderTop: "1px solid rgba(27, 58, 92, 0.08)", paddingTop: 16 }}>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "#6B6B6B" }}>
                  Average run time: about 2 minutes 30 seconds.
                </p>
              </div>

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
          </section>
        )}

        {/* ── RESULT SCREEN ── */}
        {screen === "result" && briefResult && (
          <section className="g-section">
            <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "0 32px" }}>
              {/* FEATURE-4: Folder-style tab bar */}
              <div
                style={{
                  background: "#F8F4ED",
                  padding: "48px 0 0 0",
                  marginBottom: 0,
                  display: "flex",
                  gap: "8px",
                }}
              >
                {(["market", "drivers", "valuation"] as TabId[]).map(tab => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: "16px 32px",
                        borderTopLeftRadius: "6px",
                        borderTopRightRadius: "6px",
                        borderBottomLeftRadius: "0",
                        borderBottomRightRadius: "0",
                        fontFamily: "var(--font-sans)",
                        fontSize: "14px",
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                        border: isActive ? "none" : "1px solid rgba(27, 58, 92, 0.12)",
                        borderTop: isActive ? "none" : "1px solid rgba(27, 58, 92, 0.12)",
                        borderLeft: isActive ? "none" : "1px solid rgba(27, 58, 92, 0.12)",
                        borderRight: isActive ? "none" : "1px solid rgba(27, 58, 92, 0.12)",
                        background: isActive ? "#1B3A5C" : "white",
                        color: isActive ? "white" : "#1B3A5C",
                        transition: "all 150ms ease",
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          (e.currentTarget as HTMLButtonElement).style.background = "#f0f0f0";
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          (e.currentTarget as HTMLButtonElement).style.background = "white";
                        }
                      }}
                    >
                      {tab === "market" && "Market"}
                      {tab === "drivers" && "Value"}
                      {tab === "valuation" && "Valuation"}
                    </button>
                  );
                })}
              </div>
              
              {/* Tab content area */}
              <div
                style={{
                  borderTop: "1px solid rgba(27, 58, 92, 0.12)",
                  paddingTop: "32px",
                  marginBottom: 48,
                  background: "transparent",
                }}
              >

                {/* Tab content - only show active tab */}
                {activeTab === "market" && <ResultPageRenderer content={briefResult.market} />}
                {activeTab === "drivers" && (
                  <>
                    <ResultPageRenderer content={briefResult.drivers} />
                    <div style={{ marginTop: 32 }}>
                      <HiddenRiskTeaser />
                    </div>
                  </>
                )}
                {activeTab === "valuation" && <ResultPageRenderer content={briefResult.valuation} />}
              </div>

              {/* Persistent footer: PDF button + Next step block */}
              <div style={{ marginTop: 80, paddingBottom: 80 }}>
                {/* PDF button - secondary pill */}
                <div style={{ marginBottom: 40 }}>
                  <button
                    onClick={() => setShowPdfModal(true)}
                    style={{
                      background: "none",
                      border: "1px solid var(--color-primary)",
                      color: "var(--color-primary)",
                      fontFamily: "var(--font-sans)",
                      fontWeight: 600,
                      fontSize: 14,
                      padding: "12px 28px",
                      borderRadius: 6,
                      cursor: "pointer",
                      transition: "all 150ms",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--color-primary)";
                      (e.currentTarget as HTMLButtonElement).style.color = "white";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "none";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--color-primary)";
                    }}
                  >
                    Get the PDF.
                  </button>
                </div>

                {/* Next step block (navy background) */}
                <div
                  style={{
                    background: "#1B3A5C",
                    color: "white",
                    padding: "40px",
                    borderRadius: 8,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  <p style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 20 }}>
                    Want the full overview. Book a 30 minute call with Ofir Ben Haim.
                  </p>
                  <a
                    href="https://cal.com/ofir"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      background: "white",
                      color: "#1B3A5C",
                      padding: "12px 28px",
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: 14,
                      textDecoration: "none",
                      cursor: "pointer",
                      transition: "opacity 150ms",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLAnchorElement).style.opacity = "0.9";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
                    }}
                  >
                    Book a call
                  </a>
                </div>
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
