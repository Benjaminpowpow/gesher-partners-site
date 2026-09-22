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

/**
 * One valuation run. Written whether or not the owner ever leaves his name,
 * which is the whole point: without this, a stranger can read his range and
 * walk, and no trace of it exists anywhere.
 */
export interface ValuationRow {
  site: string;
  company?: string;
  /** The range he was shown, exactly as he read it. Empty on a by-hand run. */
  range?: string;
  revenue?: string;
  profit?: string;
  ownerSalary?: string;
  /** "Within six months", "Just exploring". Words, as he picked them. */
  timeToSell?: string;
  /** Which vertical the engine matched, and which path it priced on. */
  vertical?: string;
  path?: string;
  /** How long the run took, in seconds, one decimal. */
  seconds?: string;
  /** What the run cost us, in dollars. */
  cost?: string;
  askedForBrief?: string;
  name?: string;
  email?: string;
  phone?: string;
  briefId?: string;
  /** The three cards he actually saw. */
  brief?: string;
  /**
   * v8: the four numbers the recipe multiplied, straight from the meta block.
   * Empty on a run that never reached the recipe (unreadable, wild card). These
   * sit at the END of the tab, after the brief, because the Apps Script maps
   * fields to columns by position and older rows must stay in step.
   */
  headcount?: string;
  perHead?: string;
  margin?: string;
  multiple?: string;
}

export interface LeadRow {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  /** His own site, asked for on the contact form since Sep 17. */
  website?: string;
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
  valuationRevenue?: string;
  valuationProfit?: string;
  valuationOwnerSalary?: string;
  /**
   * The id of the run he did. This is the only thing that ties a Leads row to
   * its Valuations row, where the full brief and the cost sit. Without it the
   * two tabs are strangers and the only place the link exists is the email.
   */
  valuationBriefId?: string;
  /** How soon he says he wants out. The field that decides who Ben calls today. */
  valuationTimeToSell?: string;
}

/**
 * Append one lead to the Sheet. Never throws, never rejects.
 *
 * Returns true when the row was written, false when it was not. The return
 * value is for logging only. Nothing the caller does should depend on it.
 */
export async function appendLeadRow(row: LeadRow): Promise<boolean> {
  return writeRow("Leads", {
    name: row.name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    company: row.company ?? "",
    website: row.website ?? "",
    revenue: row.revenue ?? "",
    stage: row.stage ?? "",
    message: row.message ?? "",
    sourcePage: row.sourcePage ?? "",
    valuationSite: row.valuationSite ?? "",
    valuationRange: row.valuationRange ?? "",
    valuationRevenue: row.valuationRevenue ?? "",
    valuationProfit: row.valuationProfit ?? "",
    valuationOwnerSalary: row.valuationOwnerSalary ?? "",
    valuationBriefId: row.valuationBriefId ?? "",
    valuationTimeToSell: row.valuationTimeToSell ?? "",
  });
}

/**
 * Append one valuation run to the "Valuations" tab. Same promise as above:
 * never throws, never rejects, never blocks the thing the owner is waiting for.
 */
export async function appendValuationRow(row: ValuationRow): Promise<boolean> {
  return writeRow("Valuations", { ...row });
}

/**
 * He already ran a valuation, and now he has handed over his details for the
 * brief. Fill them into the row that is already there rather than adding a
 * second one. A miss is harmless: he is in the email either way.
 */
export async function markValuationBriefRequested(
  briefId: string,
  who: { name?: string; email?: string; phone?: string },
): Promise<boolean> {
  return writeRow("Valuations", {
    updateBriefId: briefId,
    askedForBrief: "yes",
    name: who.name ?? "",
    email: who.email ?? "",
    phone: who.phone ?? "",
  });
}

/** The one place that actually talks to the Apps Script. */
async function writeRow(
  tab: "Leads" | "Valuations",
  fields: Record<string, string | undefined>,
): Promise<boolean> {
  const webhookUrl = process.env.LEADS_SHEET_WEBHOOK;

  if (!webhookUrl) {
    // Not an error. The site runs fine with no Sheet, it just keeps no list.
    console.warn(
      `[leads-sheet] LEADS_SHEET_WEBHOOK not set. Row not written to "${tab}":`,
      fields,
    );
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Which tab the script should write to.
        tab,
        // The script stamps its own date too. We send ours so the row shows the
        // moment the row hit the server, not the moment the script ran.
        date: new Date().toISOString(),
        ...fields,
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
