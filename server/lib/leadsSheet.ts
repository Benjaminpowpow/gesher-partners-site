/**
 * The temporary lead list.
 *
 * Every contact-form submission gets appended as one row to a Google Sheet.
 * The Sheet is reached through a Google Apps Script web app, so there is no
 * service account, no key file and no cost. The script lives in the repo at
 * references/leads-sheet.gs so the setup can be rebuilt from the docs alone.
 *
 * This is a stopgap. A real database replaces it when the buyer/seller portal
 * gets built, and the Sheet becomes the migration source.
 *
 * Rule one: this must never break the email. Every failure here is caught and
 * logged. The caller gets a promise that always resolves.
 */

// How long we wait on the Sheet before giving up. Apps Script is usually well
// under a second. Eight seconds is slow enough to be a real failure.
const SHEET_TIMEOUT_MS = 8000;

export interface LeadRow {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  /** The revenue band the owner picked, as the label they saw on screen. */
  revenue?: string;
  /** Where they are in the process. The live home form does not ask this yet. */
  stage?: string;
  message?: string;
  /** The page the form was submitted from, e.g. "/" or "/he/". */
  sourcePage?: string;
  /** Set when the lead ran the valuation tool before writing in. */
  valuationSite?: string;
  valuationRange?: string;
}

/**
 * Append one lead to the Sheet. Never throws, never rejects.
 *
 * Returns true when the row was written, false when it was not. The return
 * value is for logging only. Nothing the caller does should depend on it.
 */
export async function appendLeadRow(row: LeadRow): Promise<boolean> {
  const webhookUrl = process.env.LEADS_SHEET_WEBHOOK;

  if (!webhookUrl) {
    // Not an error. The site runs fine with no Sheet, it just keeps no list.
    console.warn("[leads-sheet] LEADS_SHEET_WEBHOOK not set. Lead not written to the Sheet:", {
      name: row.name,
      email: row.email,
      phone: row.phone,
    });
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // The script stamps its own date too. We send ours so the row shows the
        // moment the lead hit the server, not the moment the script ran.
        date: new Date().toISOString(),
        name: row.name,
        email: row.email ?? "",
        phone: row.phone ?? "",
        company: row.company ?? "",
        revenue: row.revenue ?? "",
        stage: row.stage ?? "",
        message: row.message ?? "",
        sourcePage: row.sourcePage ?? "",
        valuationSite: row.valuationSite ?? "",
        valuationRange: row.valuationRange ?? "",
      }),
      signal: AbortSignal.timeout(SHEET_TIMEOUT_MS),
    });

    if (!response.ok) {
      // A deployment set to the wrong access level answers with a Google login
      // page and a 200, so a bad status is not the only way this goes wrong.
      // The script returns {"ok":true} on a good write, which we check below.
      console.error("[leads-sheet] Sheet rejected the row. HTTP", response.status);
      return false;
    }

    const body = await response.text();
    if (!body.includes('"ok":true')) {
      console.error(
        "[leads-sheet] Sheet did not confirm the write. Check that the web app is deployed " +
          'with "Who has access: Anyone". First 200 characters of the reply:',
        body.slice(0, 200)
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error("[leads-sheet] Write failed (non-blocking):", err);
    return false;
  }
}
