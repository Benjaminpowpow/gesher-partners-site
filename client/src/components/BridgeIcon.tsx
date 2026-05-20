/**
 * Bridge icon (arch design) in navy color.
 * Used as wordmark in nav and favicon.
 */
export default function BridgeIcon({ width = 32, height = 32, className = "" }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Left pillar */}
      <rect x="30" y="60" width="20" height="100" fill="#0C1B2E" />
      
      {/* Right pillar */}
      <rect x="150" y="60" width="20" height="100" fill="#0C1B2E" />
      
      {/* Top left beam */}
      <rect x="30" y="60" width="90" height="12" fill="#0C1B2E" />
      
      {/* Top right beam */}
      <rect x="80" y="60" width="90" height="12" fill="#0C1B2E" />
      
      {/* Arch (curved bridge) */}
      <path
        d="M 50 75 Q 100 30 150 75"
        stroke="#0C1B2E"
        strokeWidth="18"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
