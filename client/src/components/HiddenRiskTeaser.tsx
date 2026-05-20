import { Lock } from "lucide-react";

interface HiddenRiskTeaserProps {
  /**
   * Body line. Defaults to "2 more risk factors identified."
   * Can be overridden to "Some risk factors are not visible from public sources."
   */
  bodyLine?: string;
  /**
   * Ofir's call booking URL. Defaults to placeholder.
   */
  callUrl?: string;
}

export default function HiddenRiskTeaser({
  bodyLine = "2 more risk factors identified.",
  callUrl = "https://cal.com/ofir-gesher",
}: HiddenRiskTeaserProps) {
  return (
    <div
      style={{
        position: "relative",
        background: "rgba(248, 244, 237, 0.7)",
        border: "1px solid rgba(27, 58, 92, 0.2)",
        borderRadius: 6,
        padding: 32,
        marginTop: 24,
        backdropFilter: "blur(10px)",
        overflow: "hidden",
      }}
    >
      {/* Frosted overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(27, 58, 92, 0.65)",
          backdropFilter: "blur(10px)",
          borderRadius: 6,
        }}
      />

      {/* Content (on top of frosted layer) */}
      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        {/* Lock icon */}
        <Lock
          size={24}
          color="#6B2C2C"
          style={{
            margin: "0 auto 12px",
            display: "block",
          }}
        />

        {/* Body line */}
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            fontSize: 20,
            color: "white",
            margin: "0 0 8px 0",
          }}
        >
          {bodyLine}
        </p>

        {/* Subhead */}
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 400,
            fontSize: 14,
            color: "rgba(255, 255, 255, 0.88)",
            margin: "0 0 20px 0",
          }}
        >
          Book a 30-minute call with Ofir to walk through them.
        </p>

        {/* CTA button */}
        <a
          href={callUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            background: "#1B3A5C",
            color: "white",
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: 14,
            padding: "12px 28px",
            borderRadius: 6,
            textDecoration: "none",
            transition: "transform 150ms, box-shadow 150ms",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.02)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 8px 16px rgba(27, 58, 92, 0.2)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
          }}
        >
          Book the call.
        </a>
      </div>
    </div>
  );
}
