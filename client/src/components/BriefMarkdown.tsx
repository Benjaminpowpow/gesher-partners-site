import { useMemo } from "react";
import { Streamdown } from "streamdown";

interface BriefMarkdownProps {
  content: string;
}

/**
 * Scrub rules for seller-facing Exit Brief rendering.
 * Rules A-D per Round 3 spec.
 */
function scrubbedContent(raw: string): string {
  let result = raw;

  // Rule A: Strip `## Internal:` blocks
  // Match from `## Internal:` to end of string or next `##` heading
  result = result.replace(/^## Internal:.*?(?=^##|$)/gms, "");
  // Clean up trailing newlines
  result = result.replace(/\n\n+/g, "\n\n").trim();

  // Rule B: Strip confidence flags
  // Match: [high], [medium], [low], [confidence: ...], [high, seller-reported], etc.
  result = result.replace(/\s?\[(?:high|medium|low|confidence)[^\]]*\]/gi, "");

  // Rule C: Strip `## Sources used` block (and everything after it)
  result = result.replace(/^## Sources used.*$/gms, "");
  result = result.trim();

  // Rule D: Detect hidden teaser and mark it for custom rendering
  // The teaser will be rendered as an overlay by the result page component
  // Keep it in the markdown but it will be handled specially by the renderer

  return result;
}

export default function BriefMarkdown({ content }: BriefMarkdownProps) {
  const scrubbed = useMemo(() => scrubbedContent(content), [content]);

  return (
    <div className="g-prose">
      <Streamdown>{scrubbed}</Streamdown>
    </div>
  );
}
