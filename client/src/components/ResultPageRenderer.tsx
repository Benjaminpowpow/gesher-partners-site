import { useMemo } from "react";
import { Streamdown } from "streamdown";

interface ResultPageRendererProps {
  content: string;
}

/**
 * Seller-only renderer (v7). The skill now outputs clean three-card markdown
 * (## Market / ## Value / ## Range and call), so there is nothing to scrub.
 *
 * We keep one light backstop, the second of the three "no leaks by design"
 * layers: if the model ever slips and emits an internal block, a sources list,
 * or a confidence flag, we strip it here before render. The heavy v6 scrubber
 * (50+ trace labels, structural backstops, callout rewriting) is gone.
 */
export function lightScrub(raw: string): string {
  let result = raw;
  // Drop any stray "## Internal" / "### Internal" block to the next heading or EOF.
  result = result.replace(/^#{2,3} Internal:.*?(?=^#{1,3} |$)/gms, "");
  // Drop a stray "## Sources" block to EOF.
  result = result.replace(/^## Sources.*$/gms, "");
  // Strip stray confidence flags: [high], [medium], [low], [confidence: ...].
  result = result.replace(/\s?\[(?:high|medium|low|confidence)[^\]]*\]/gi, "");
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

export default function ResultPageRenderer({ content }: ResultPageRendererProps) {
  const markdown = useMemo(() => lightScrub(content), [content]);

  if (!markdown.trim()) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>
        No content available
      </div>
    );
  }

  return (
    <>
      <div className="g-prose-wrapper">
        <div className="g-prose">
          <Streamdown>{markdown}</Streamdown>
        </div>
      </div>
      <style>{`
        .g-prose button[aria-label*="copy"],
        .g-prose button[aria-label*="download"] {
          display: none !important;
        }
      `}</style>
    </>
  );
}
