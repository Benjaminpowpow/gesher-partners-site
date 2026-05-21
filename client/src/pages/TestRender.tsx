import { useState } from "react";
import ResultPageRenderer from "@/components/ResultPageRenderer";
import maromBrief from "../__tests__/fixtures/marom-brief.md?raw";

export default function TestRender() {
  const [activeTab, setActiveTab] = useState<"market" | "drivers" | "valuation">("market");

  // Parse the markdown into tabs
  const parseTabContent = (markdown: string, section: string): string => {
    let content = markdown;

    // Extract the specific step section
    if (section === "market") {
      const match = content.match(/## Step 1\.[\s\S]*?(?=## Step 2|$)/);
      content = match ? match[0] : "";
    } else if (section === "drivers") {
      const match = content.match(/## Step 2\.[\s\S]*?(?=## Step 3|$)/);
      content = match ? match[0] : "";
    } else if (section === "valuation") {
      const match = content.match(/## Step 3\.[\s\S]*?$/);
      content = match ? match[0] : "";
    }

    return content;
  };

  const marketContent = parseTabContent(maromBrief, "market");
  const driversContent = parseTabContent(maromBrief, "drivers");
  const valuationContent = parseTabContent(maromBrief, "valuation");

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>BUG-1 Verification: Marom Brief Rendering</h1>
      <p style={{ color: "#666", marginBottom: "30px" }}>
        This page renders the Marom fixture markdown through the updated preprocessing pipeline.
        All trace labels, confidence brackets, and internal sections should be stripped.
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
        {["market", "drivers", "valuation"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
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
            {tab === "market" && "MARKET SNAPSHOT"}
            {tab === "drivers" && "VALUE DRIVERS"}
            {tab === "valuation" && "VALUATION AND BUYERS"}
          </button>
        ))}
      </div>

      {/* Content Renderer */}
      <div style={{ background: "transparent" }}>
        {activeTab === "market" && <ResultPageRenderer content={marketContent} />}
        {activeTab === "drivers" && <ResultPageRenderer content={driversContent} />}
        {activeTab === "valuation" && <ResultPageRenderer content={valuationContent} />}
      </div>

      {/* Verification Checklist */}
      <div style={{ marginTop: "40px", padding: "20px", background: "#f0f0f0", borderRadius: "8px" }}>
        <h3>Verification Checklist</h3>
        <ul style={{ lineHeight: "1.8" }}>
          <li>✓ Zero "## Internal:" sections visible</li>
          <li>✓ Zero `[high]`, `[medium]`, `[low]`, `[confidence:...]` brackets</li>
          <li>✓ Zero "## Sources used" section</li>
          <li>✓ Zero "Classification:" block</li>
          <li>✓ Zero "Sources confirming overview:" block</li>
          <li>✓ Zero "Positive:" / "Negative:" summary lines (after driver cards)</li>
          <li>✓ Zero "Comp table (for audit...):" block</li>
          <li>✓ Zero "Sentiment overlay:" block</li>
          <li>✓ Zero "Israeli adjustment applied:" block</li>
          <li>✓ Zero "Foreign-principal exemption check:" block</li>
          <li>✓ Zero "Range width:" block</li>
          <li>✓ Zero "All 5 buyer lanes walked:" block</li>
          <li>✓ Zero "Cross-check vs acquirer-map-compact:" block</li>
          <li>✓ Zero "Yad2/ranin check:" block</li>
          <li>✓ "### Positive Impact" and "### Negative Impact" H3 headings ARE visible</li>
          <li>✓ "What this means for you" rendered as callout box</li>
          <li>✓ No copy/download buttons visible</li>
        </ul>
      </div>
    </div>
  );
}
