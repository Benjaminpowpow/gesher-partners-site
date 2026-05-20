import { useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import HiddenRiskTeaser from "./HiddenRiskTeaser";

interface ResultPageRendererProps {
  content: string;
}

/**
 * Scrub rules for seller-facing Exit Brief rendering.
 * Rules A-E per Round 4 spec.
 */
function scrubbedContent(raw: string): { markdown: string; riskCount: number } {
  let result = raw;
  let riskCount = 0;

  // Rule A: Strip `## Internal:` blocks
  // Match from `## Internal:` to end of string or next `##` heading
  result = result.replace(/^## Internal:.*?(?=^##|$)/gms, "");
  result = result.replace(/\n\n+/g, "\n\n").trim();

  // Rule B: Strip confidence flags
  // Match: [high], [medium], [low], [confidence: ...], [high, seller-reported], etc.
  result = result.replace(/\s?\[(?:high|medium|low|confidence)[^\]]*\]/gi, "");

  // Rule C: Strip `## Sources used` block (and everything after it)
  result = result.replace(/^## Sources used.*$/gms, "");
  result = result.trim();

  // Rule D: Detect hidden risk teaser pattern
  // Regex: /\b(\d+)\s+more\s+risk\s+factors?\s+identified\.\s*Book\s+a\s+30[- ]minute\s+call\s+with\s+Ofir[^\n]*/i
  const riskMatch = result.match(/\b(\d+)\s+more\s+risk\s+factors?\s+identified\.\s*Book\s+a\s+30[- ]minute\s+call\s+with\s+Ofir[^\n]*/i);
  if (riskMatch) {
    riskCount = parseInt(riskMatch[1], 10);
    // Remove the pattern from markdown - it will be rendered as overlay
    result = result.replace(/\b\d+\s+more\s+risk\s+factors?\s+identified\.\s*Book\s+a\s+30[- ]minute\s+call\s+with\s+Ofir[^\n]*/i, "");
  }

  // Strip "Left column. " and "Right column. " prefixes from H3 headings
  result = result.replace(/^### (Left column\. |Right column\. )/gm, "### ");

  // Wrap "#### What this means for you" sections in a callout marker
  // We'll use a special marker that the component can detect and style
  result = result.replace(
    /^#### What this means for you\n\n([^\n]*(?:\n(?!^###|^####|^##)[^\n]*)*)\n?/gm,
    "\n:::callout\n**What this means for you**\n\n$1\n:::end-callout\n\n"
  );

  return { markdown: result, riskCount };
}

/**
 * Custom markdown processor to handle callout boxes.
 * Converts :::callout...:::end-callout markers to HTML callout divs.
 */
function processCallouts(markdown: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const calloutRegex = /:::callout\n([\s\S]*?)\n:::end-callout/g;
  let lastIndex = 0;
  let match;

  while ((match = calloutRegex.exec(markdown)) !== null) {
    // Add markdown before this callout
    if (match.index > lastIndex) {
      const beforeText = markdown.substring(lastIndex, match.index);
      if (beforeText.trim()) {
        parts.push(
          <div key={`md-${lastIndex}`} className="g-prose">
            <Streamdown>{beforeText}</Streamdown>
          </div>
        );
      }
    }

    // Add callout box
    const calloutContent = match[1];
    parts.push(
      <div
        key={`callout-${match.index}`}
        style={{
          background: "white",
          border: "1px solid rgba(27, 58, 92, 0.12)",
          borderRadius: "6px",
          padding: "24px",
          marginBottom: "24px",
          marginTop: "24px",
        }}
      >
        <div className="g-prose">
          <Streamdown>{calloutContent}</Streamdown>
        </div>
      </div>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining markdown
  if (lastIndex < markdown.length) {
    const remainingText = markdown.substring(lastIndex);
    if (remainingText.trim()) {
      parts.push(
        <div key={`md-end`} className="g-prose">
          <Streamdown>{remainingText}</Streamdown>
        </div>
      );
    }
  }

  return parts.length > 0 ? parts : [<Streamdown key="empty">{markdown}</Streamdown>];
}

export default function ResultPageRenderer({ content }: ResultPageRendererProps) {
  const [showRiskTeaser, setShowRiskTeaser] = useState(false);
  const { markdown, riskCount } = useMemo(() => scrubbedContent(content), [content]);

  if (!markdown || !markdown.trim()) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>No content available</div>;
  }

  const renderedContent = useMemo(() => processCallouts(markdown), [markdown]);

  return (
    <>
      <div className="g-prose-wrapper">
        {renderedContent}
      </div>
      {riskCount > 0 && (
        <HiddenRiskTeaser
          bodyLine={`${riskCount} more risk factor${riskCount === 1 ? "" : "s"} identified.`}
          callUrl="https://cal.com/ofir"
        />
      )}
      <style>{`
        .g-prose button[aria-label*="copy"],
        .g-prose button[aria-label*="download"] {
          display: none !important;
        }
      `}</style>
    </>
  );
}
