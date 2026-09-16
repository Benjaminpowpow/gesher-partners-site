/**
 * Gesher lead list. Google Apps Script web app.
 *
 * What it does: the site POSTs one lead here as JSON, and this writes one row
 * to the sheet it is bound to. Free, no service account, no key file.
 *
 * Where it goes: Extensions -> Apps Script, from inside the Google Sheet.
 * Full paste and deploy steps are in the vault at
 * PROJECTS/israel-ai-investment-bank/site/07-live-site-and-sync-playbook.md.
 *
 * This copy is the source of truth. If you change the script in Google, paste
 * the change back here so the setup can be rebuilt from the repo alone.
 */

// The column order. Change this and the header row changes with it on the next
// write to an empty sheet. Existing rows are not touched.
var HEADERS = [
  'Date',
  'Name',
  'Email',
  'Phone',
  'Company',
  'Revenue band',
  'Stage',
  'Message',
  'Source page',
  'Valuation site',
  'Valuation range'
];

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // First write on a blank sheet lays down the header row.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    // The site sends an ISO timestamp. Turn it into a real date so the sheet
    // can sort and filter on it. If it will not parse, keep the raw text.
    var when = payload.date ? new Date(payload.date) : new Date();
    if (isNaN(when.getTime())) {
      when = payload.date || '';
    }

    sheet.appendRow([
      when,
      payload.name || '',
      payload.email || '',
      payload.phone || '',
      payload.company || '',
      payload.revenue || '',
      payload.stage || '',
      payload.message || '',
      payload.sourcePage || '',
      payload.valuationSite || '',
      payload.valuationRange || ''
    ]);

    return json({ ok: true });
  } catch (err) {
    // Written to the Apps Script execution log. Check it at
    // script.google.com -> your project -> Executions.
    console.error('Lead write failed: ' + err);
    return json({ ok: false, error: String(err) });
  }
}

// A GET in the browser is the quickest way to check the deployment is live and
// open. It must show {"ok":true,...} and not a Google login page.
function doGet() {
  return json({ ok: true, message: 'Gesher lead list is listening. POST leads here.' });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
