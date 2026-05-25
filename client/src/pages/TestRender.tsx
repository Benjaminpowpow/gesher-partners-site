import { useState } from "react";
import ResultPageRenderer from "@/components/ResultPageRenderer";
import sampleBrief from "../__tests__/fixtures/valuation-snapshot-sample.md?raw";

export default function TestRender() {
  const [activeTab, setActiveTab] = useState<"market" | "value" | "valuation">("market");

  // v7 seller-only headers: ## Market / ## Value / ## Range and call
  const parseTabContent = (markdown: string, section: string): string => {
    if (section === "market") {
      const m = markdown.match(/## Market[\s\S]*?(?=## Value|$)/);
      return m ? m[0] : "";
    } else if (section === "value") {
      const m = markdown.match(/## Value[\s\S]*?(?=## Range and call|$)/);
      return m ? m[0] : "";
    } else {
      const m = markdown.match(/## Range and call[\s\S]*/);
      return m ? m[0] : "";
    }
  };

  const marketContent = parseTabContent(sampleBrief, "market");
  const valueContent = parseTabContent(sampleBrief, "value");
  const valuationContent = parseTabContent(sampleBrief, "valuation");

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>v7 render check: Valuation Snapshot</h1>
      <p style={{ color: "#666", marginBottom: "30px" }}>
        Renders the seller-only sample through the v7 pipeline. Three cards, no trace, no flags, no tables.
      </p>

      {/* Tab Navigation */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "30px",
          borderBottom: "2px solid #e0e0e0",
        }}
      >
        {(["market", "value", "valuation"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "12px 20px",
              background: activeTab === tab ? "#1B3A5C" : "transparent",
              color: activeTab === tab ? "white" : "#333",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
              borderRadius: "4px 4px 0 0",
            }}
          >
            {tab === "market" && "MARKET"}
            {tab === "value" && "VALUE"}
            {tab === "valuation" && "VALUATION"}
          </button>
        ))}
      </div>

      {/* Content Renderer */}
      <div style={{ background: "transparent" }}>
        {activeTab === "market" && <ResultPageRenderer content={marketContent} />}
        {activeTab === "value" && <ResultPageRenderer content={valueContent} />}
        {activeTab === "valuation" && <ResultPageRenderer content={valuationContent} />}
      </div>

      {/* Verification Checklist */}
      <div style={{ marginTop: "40px", padding: "20px", background: "#f0f0f0", borderRadius: "8px" }}>
        <h3>Check</h3>
        <ul style={{ lineHeight: "1.8" }}>
          <li>Three cards: Market, Value, Range and call</li>
          <li>Each card under 100 words</li>
          <li>No confidence flags, no tables, no buyer names, no trace</li>
          <li>No copy or download buttons</li>
        </ul>
      </div>
    </div>
  );
}
