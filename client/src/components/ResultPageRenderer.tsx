import { useMemo } from "react";
import { Streamdown } from "streamdown";

interface ResultPageRendererProps {
  content: string;
}

/**
 * Result page renderer for Exit Brief tabs.
 * Content is already split by ExitBrief.tsx into market/drivers/valuation sections.
 * This component just renders the markdown content directly with proper styling.
 */
export default function ResultPageRenderer({ content }: ResultPageRendererProps) {
  if (!content || !content.trim()) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>No content available</div>;
  }

  return (
    <div className="g-prose">
      <Streamdown>{content}</Streamdown>
    </div>
  );
}
