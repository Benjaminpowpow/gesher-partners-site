import { useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import HiddenRiskTeaser from "./HiddenRiskTeaser";

interface ResultPageRendererProps {
  content: string;
}

/**
 * Scrub rules for seller-facing Exit Brief rendering.
 * Rules A-E per Round 4 spec, plus BUG-1, BUG-2, BUG-3 fixes.
 */
function scrubbedContent(raw: string): { markdown: string; riskCount: number } {
  let result = raw;
  let riskCount = 0;

  // Rule A: Strip `## Internal:` blocks
  // Match from `## Internal:` to end of string or next `##` heading
  result = result.replace(/^## Internal:.*?(?=^##|$)/gms, "");
  result = result.replace(/\n\n+/g, "\n\n").trim();

  // BUG-1: Strip trace label sections (new pass after Rule A)
  // Match labels at line start (after optional bullet/bold) through next ## heading or EOF
  const TRACE_LABELS = [
    'Path used',
    'Sources confirming',
    'Phase 1b vertical-fit',
    'Phase 1b',
    'Scale-band reasoning',
    'Archetype call',
    'Anything cut from',
    'Cut from the seller-facing',
    'Drivers considered',
    'Value drivers considered',
    'Source for each',
    'Sources for each',
    'Top-buyer-type weighting',
    'Readiness-screen items',
    'Why the negative pick',
    'Why the zero-shown',
    'Full comp table',
    'Comp table',
    'Median multiples pulled',
    'Sentiment signals',
    'Israeli adjustment math',
    'Yad2 and ranin',
    'Yad2/ranin',
    'Yad2',
    'All 5 lanes walked',
    'All five lanes walked',
    'Buyer-search framework lanes',
    'Archetype-driven re-ordering',
    'Archetype-driven ordering',
    'Cross-check notes',
    'Cross-check vs acquirer-map',
    'Engagement block selection',
  ];
  
  for (const label of TRACE_LABELS) {
    // Match: optional bullet, optional bold, label (case-insensitive), then content until next ## or EOF
    // Pattern: line start → optional "- " → optional "**" → label → rest of line → content until next ## or EOF
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
      `^(?:- )?(?:\\*\\*)?${escapedLabel}(?:\\*\\*)?:.*?(?=^##|$)`,
      'gmi'
    );
    result = result.replace(pattern, '');
  }
  
  // Clean up excess blank lines after trace stripping
  result = result.replace(/\n\n+/g, "\n\n").trim();

  // Rule B: Strip confidence flags
  // Match: [high], [medium], [low], [confidence: ...], [high, seller-reported], etc.
  result = result.replace(/\s?\[(?:high|medium|low|confidence)[^\]]*\]/gi, "");

  // BUG-2: Remove orphan Confidence labels after Rule B
  // If a line is only "Confidence:" and whitespace/punctuation, remove it
  result = result.replace(/^\s*Confidence:\s*[.\s]*$/gm, "");
  // If a line contains "Confidence:" followed only by whitespace and punctuation, strip it
  result = result.replace(/Confidence:\s*[.\s]*(?=\n|$)/g, "");
  
  // Clean up excess blank lines
  result = result.replace(/\n\n+/g, "\n\n").trim();

  // Rule C: Strip `## Sources used` block (and everything after it)
  result = result.replace(/^## Sources used.*$/gms, "");
  result = result.trim();

  // BUG-3: Detect hidden risk teaser pattern with updated regex that matches any digit
  // Updated regex: /\b(\d+)\s+more\s+risk\s+factors?\s+identified\.\s*Book\s+a\s+30[- ]?minute\s+call\s+with\s+Ofir[^\n]*/gi
  const riskMatches = Array.from(result.matchAll(/\b(\d+)\s+more\s+risk\s+factors?\s+identified\.\s*Book\s+a\s+30[- ]?minute\s+call\s+with\s+Ofir[^\n]*/gi));
  let maxRiskCount = 0;
  const matchesToRemove: Array<{ start: number; end: number }> = [];
  
  for (const match of riskMatches) {
    const count = parseInt(match[1], 10);
    if (count > maxRiskCount) {
      maxRiskCount = count;
    }
    matchesToRemove.push({ start: match.index, end: match.index + match[0].length });
  }
  
  // Remove all matches (keep only the highest count)
  riskCount = maxRiskCount;
  if (matchesToRemove.length > 0) {
    // Sort in reverse order to maintain indices
    matchesToRemove.sort((a, b) => b.start - a.start);
    for (const match of matchesToRemove) {
      result = result.substring(0, match.start) + result.substring(match.end);
    }
  }
  
  // Clean up excess blank lines
  result = result.replace(/\n\n+/g, "\n\n").trim();

  // Strip "Left column. " and "Right column. " prefixes from H3 headings
  result = result.replace(/^### (Left column\. |Right column\. )/gm, "### ");
  
  // Additional cleanup: remove excess blank lines one final time
  result = result.replace(/\n\n+/g, "\n\n").trim();

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
