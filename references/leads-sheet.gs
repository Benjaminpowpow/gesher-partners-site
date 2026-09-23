/**
 * Gesher lead list. Google Apps Script web app.
 *
 * What it does: the site POSTs one row here as JSON, and this writes it to the
 * sheet it is bound to. Free, no service account, no key file.
 *
 * Two tabs, because there are two different things worth keeping:
 *
 *   "Leads"      Somebody filled in the contact form. A person who wants to talk.
 *   "Valuations" Somebody ran the valuation tool. Every single run, whether or
 *                not they ever left a name. This is the one that tells you how
 *                many strangers looked at the tool and what it quoted them.
 *
 * The site picks the tab with a "tab" field in the payload. Anything else, or
 * nothing, goes to "Leads" so an older version of the site still works.
 *
 * Where it goes: Extensions -> Apps Script, from inside the Google Sheet.
 * Full paste and deploy steps are in the vault at
 * PROJECTS/israel-ai-investment-bank/site/07-live-site-and-sync-playbook.md.
 *
 * This copy is the source of truth. If you change the script in Google, paste
 * the change back here so the setup can be rebuilt from the repo alone.
 *
 * Changing a script that is already deployed: Deploy -> Manage deployments ->
 * pencil -> Version: New version -> Deploy. Saving alone changes nothing live.
 */

// Column order per tab. Change one and its header row changes with it the next
// time that tab is created. Existing rows are never touched.
var TABS = {
  Leads: [
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
    'Valuation range',
    'Valuation revenue band',
    'Valuation profit band',
    'Valuation owner salary band',
    // The only thing tying this row to its row on the Valuations tab, where the
    // brief and the cost live. Added Sep 17, after the first real test showed
    // the two tabs had no way to find each other.
    'Valuation brief ID',
    // How soon he says he wants out. Added Sep 17 with the new front door.
    'Valuation time to sell',
    // His own site, off the contact form. Added Sep 17. It goes on the end
    // rather than beside Company, because a column inserted in the middle
    // would put every row already in the sheet out of step with its headers.
    'Website'
  ],
  Valuations: [
    'Date',
    'Website',
    'Company',
    'Range shown',
    'Revenue band',
    'Profit band',
    'Owner salary band',
    'Time to sell',
    'Vertical',
    'Path',
    'Seconds',
    'Cost (USD)',
    'Asked for the brief?',
    'Name',
    'Email',
    'Phone',
    'Brief ID',
    'The brief they saw',
    // v8 (Sep 22): the four numbers the recipe multiplied. Appended at the end
    // on purpose. Add these four header cells to the live tab by hand before
    // redeploying, so the rows already there stay in step with their headers.
    'Headcount used',
    'Revenue per head',
    'Margin',
    'Multiple',
    // v2 (Sep 23): how many times this domain has been run. 3 or more is
    // somebody who keeps coming back, which is a warm lead.
    'Runs on this domain'
  ]
};

var FIELDS = {
  Leads: [
    'name',
    'email',
    'phone',
    'company',
    'revenue',
    'stage',
    'message',
    'sourcePage',
    'valuationSite',
    'valuationRange',
    'valuationRevenue',
    'valuationProfit',
    'valuationOwnerSalary',
    'valuationBriefId',
    'valuationTimeToSell',
    'website'
  ],
  Valuations: [
    'site',
    'company',
    'range',
    'revenue',
    'profit',
    'ownerSalary',
    'timeToSell',
    'vertical',
    'path',
    'seconds',
    'cost',
    'askedForBrief',
    'name',
    'email',
    'phone',
    'briefId',
    'brief',
    'headcount',
    'perHead',
    'margin',
    'multiple',
    'runsOnDomain'
  ]
};

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var tabName = TABS[payload.tab] ? payload.tab : 'Leads';
    var headers = TABS[tabName];
    var sheet = getOrCreateTab(tabName, headers);

    // An update, not a new row. Used when somebody who already ran a valuation
    // comes back and asks for the brief: his name and phone fill into the row
    // that is already there, instead of making a confusing second one.
    if (payload.updateBriefId) {
      return json({ ok: updateByBriefId(sheet, headers, payload) });
    }

    // The site sends an ISO timestamp. Turn it into a real date so the sheet
    // can sort and filter on it. If it will not parse, keep the raw text.
    var when = payload.date ? new Date(payload.date) : new Date();
    if (isNaN(when.getTime())) {
      when = payload.date || '';
    }

    var row = [when];
    var fields = FIELDS[tabName];
    for (var i = 0; i < fields.length; i++) {
      var value = payload[fields[i]];
      row.push(value === undefined || value === null ? '' : value);
    }
    sheet.appendRow(row);

    return json({ ok: true });
  } catch (err) {
    // Written to the Apps Script execution log. Check it at
    // script.google.com -> your project -> Executions.
    console.error('Row write failed: ' + err);
    return json({ ok: false, error: String(err) });
  }
}

// Fill the named columns into the row that carries this Brief ID. Searches from
// the bottom, because the row we want is almost always one of the newest.
// Returns false when there is no such row, and the caller just moves on: a lead
// is never lost over a bookkeeping miss.
function updateByBriefId(sheet, headers, payload) {
  var idCol = headers.indexOf('Brief ID') + 1;
  if (idCol === 0 || sheet.getLastRow() < 2) return false;

  var ids = sheet.getRange(2, idCol, sheet.getLastRow() - 1, 1).getValues();
  var rowNumber = 0;
  for (var i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) === String(payload.updateBriefId)) {
      rowNumber = i + 2;
      break;
    }
  }
  if (!rowNumber) return false;

  // Only the columns this payload actually carries. Everything else is left
  // exactly as it was.
  var map = {
    askedForBrief: 'Asked for the brief?',
    name: 'Name',
    email: 'Email',
    phone: 'Phone'
  };
  for (var key in map) {
    if (payload[key] === undefined || payload[key] === null) continue;
    var col = headers.indexOf(map[key]) + 1;
    if (col > 0) sheet.getRange(rowNumber, col).setValue(payload[key]);
  }
  return true;
}

// Find the tab, or make it and lay down its header row. The very first tab of a
// brand new sheet is called "Sheet1"; it gets renamed rather than left orphaned.
function getOrCreateTab(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);

  if (!sheet) {
    var all = ss.getSheets();
    if (all.length === 1 && all[0].getLastRow() === 0 && /^Sheet ?1$/.test(all[0].getName())) {
      sheet = all[0].setName(name);
    } else {
      sheet = ss.insertSheet(name);
    }
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return sheet;
  }

  // A tab that already has rows keeps the header row it was born with. So when
  // a column gets added to the list above, the new values land in a column with
  // no name over it. This writes the missing names in. It only ever adds to the
  // right of what is there, never renames or moves an existing column, so the
  // rows already in the sheet are not touched.
  var width = sheet.getLastColumn();
  if (width < headers.length) {
    var missing = headers.slice(width);
    sheet
      .getRange(1, width + 1, 1, missing.length)
      .setValues([missing])
      .setFontWeight('bold');
  }
  return sheet;
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
