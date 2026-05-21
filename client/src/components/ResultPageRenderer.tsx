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

  // Rule A: Strip `## Internal:` and `### Internal:` blocks
  // Match from `## Internal:` or `### Internal:` to end of string or next heading
  result = result.replace(/^#{2,3} Internal:.*?(?=^#{1,3} |$)/gms, "");
  result = result.replace(/\n\n+/g, "\n\n").trim();

  // BUG-1 Fix Part A: Expand trace label list
  // Match labels at line start (after optional bullet/bold) through next ## heading or EOF
  const TRACE_LABELS = [
    // Step 1 trace labels
    'Path used',
    'Sources confirming',
    'Sources confirming overview',
    'Phase 1b vertical-fit',
    'Phase 1b',
    'Scale-band reasoning',
    'Scale band',
    'Archetype call',
    'Anything cut from',
    'Cut from the seller-facing',
    'Classification',
    'Vertical-fit check on customers',
    'Vertical-fit check',
    'Founder profile',
    'Seller archetype',
    // Step 2 trace labels
    'Drivers considered',
    'Value drivers considered',
    'Source for each',
    'Sources for each',
    'Top-buyer-type weighting',
    'Readiness-screen items',
    'Why the negative pick',
    'Why the zero-shown',
    'Negative driver selection',
    // Step 3 trace labels
    'Full comp table',
    'Comp table',
    'Comp table (for audit',
    'Median multiples pulled',
    'Sentiment signals',
    'Sentiment overlay',
    'Israeli adjustment math',
    'Israeli adjustment applied',
    'Foreign-principal exemption check',
    'Range width',
    'Yad2 and ranin',
    'Yad2/ranin',
    'Yad2/ranin check',
    'Yad2',
    'All 5 lanes walked',
    'All 5 buyer lanes walked',
    'All five lanes walked',
    'Buyer-search framework lanes',
    'Archetype-driven re-ordering',
    'Archetype-driven ordering',
    'Cross-check notes',
    'Cross-check vs acquirer-map',
    'Cross-check vs acquirer-map-compact',
    'Engagement block selection',
    // Step 2 summary leaks (specific pattern)
    'Positive:',
    'Negative:',
  ];
  
  for (const label of TRACE_LABELS) {
    // Match: optional bullet, optional bold, label (case-insensitive), then content until next ## or EOF
    // Special handling for Positive: and Negative: to avoid matching H3 headings
    let pattern: RegExp;
    if (label === 'Positive:' || label === 'Negative:') {
      // Only match when it's a line starting with the label followed by description (not an H3 heading)
      const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      pattern = new RegExp(
        `^(?:- )?(?:\\*\\*)?${escapedLabel}\\s+[^\n]*?(?=^##|^###|$)`,
        'gmi'
      );
    } else {
      const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      pattern = new RegExp(
        `^(?:- )?(?:\\*\\*)?${escapedLabel}(?:\\*\\*)?:.*?(?=^##|$)`,
        'gmi'
      );
    }
    result = result.replace(pattern, '');
  }
  
  // Clean up excess blank lines after trace stripping
  result = result.replace(/\n\n+/g, "\n\n").trim();

  // BUG-1 Fix Part B: Structural backstop
  // Strip remaining trace content after company card (Step 1) or after last "What this means for you" (Steps 2-3)
  const steps = result.split(/^## Step \d+\./m);
  const processedSteps = steps.map((step, idx) => {
    if (idx === 0) return step; // Skip content before first step
    
    // Detect which step this is
    const stepNum = idx; // Corresponds to Step 1, 2, 3, etc.
    
    if (stepNum === 1) {
      // Step 1: Find company-at-a-glance card and strip everything after it
      // Card ends with "**Website.**" or similar
      const cardMatch = step.match(/\*\*Website\.\*\*[^\n]*\n/);
      if (cardMatch) {
        const cardEndIndex = step.indexOf(cardMatch[0]) + cardMatch[0].length;
        const beforeCard = step.substring(0, cardEndIndex);
        const afterCard = step.substring(cardEndIndex);
        // Find next ## heading in afterCard
        const nextHeadingMatch = afterCard.match(/^## /m);
        if (nextHeadingMatch) {
          const nextHeadingIndex = afterCard.indexOf(nextHeadingMatch[0]);
          const afterCardClean = afterCard.substring(nextHeadingIndex);
          return beforeCard + '\n' + afterCardClean;
        } else {
          return beforeCard;
        }
      }
    } else if (stepNum === 2 || stepNum === 3) {
      // Steps 2-3: Find LAST occurrence of "What this means for you" and strip everything after the following paragraph
      const wtmyMatches = Array.from(step.matchAll(/^####?\s+What this means for you/gim));
      if (wtmyMatches.length > 0) {
        const lastMatch = wtmyMatches[wtmyMatches.length - 1];
        const afterWtmy = step.substring(lastMatch.index! + lastMatch[0].length);
        // Find the paragraph after the heading (skip blank lines)
        const paragraphMatch = afterWtmy.match(/\n\n([^\n]+(?:\n(?!^##|^###|^####|\n)[^\n]*)*)/);
        if (paragraphMatch) {
          const paragraphEnd = lastMatch.index! + lastMatch[0].length + paragraphMatch.index! + paragraphMatch[0].length;
          return step.substring(0, paragraphEnd);
        }
      }
    }
    
    return step;
  });
  
  result = processedSteps.join('## Step ');
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
