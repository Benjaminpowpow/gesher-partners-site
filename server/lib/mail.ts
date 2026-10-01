/**
 * Who our email comes from and where leads land. Shared by every route that
 * sends mail: the contact form, the old Hebrew tool (routes/exitBrief.ts) and
 * the valuation estimate (routes/valuationEstimate.ts).
 */

// ─── Email addresses ────────────────────────────────────────────────────────
// Resend will only send from a domain we have verified in the Resend dashboard.
// The firm's domain is gesherpartners.com (no hyphen). An earlier version of
// this file sent from gesher-partners.com, which we do not own, so every send
// would have been rejected. MAIL_FROM lets us change this without a code push.
// "||" not "??" on purpose. A host that creates the variable but leaves it
// blank hands us "", which "??" would happily accept and we would send from
// "Gesher <>". Empty means unset here.
export const MAIL_FROM = process.env.MAIL_FROM || "office@gesherpartners.com";

// Where new leads and contact-form submissions land.
export const NOTIFY_EMAIL = process.env.LEAD_NOTIFICATION_EMAIL || MAIL_FROM;

// Resend wants "Display Name <address@domain>".
export function sender(displayName: string): string {
  return `${displayName} <${MAIL_FROM}>`;
}

// Anyone can POST to /api/contact, so anything that came off the wire gets
// escaped before it lands in an email we are going to open and read.
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
