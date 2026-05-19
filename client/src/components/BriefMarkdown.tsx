import { Streamdown } from "streamdown";

interface BriefMarkdownProps {
  content: string;
}

export default function BriefMarkdown({ content }: BriefMarkdownProps) {
  return (
    <div className="g-prose">
      <Streamdown>{content}</Streamdown>
    </div>
  );
}
