/**
 * Checks COPY_V_HE in client/src/pages/valuationCopy.ts against the approved
 * Hebrew in the vault, site/39-valuation-hebrew-worksheet.md, row by row.
 * Rows 1 to 108: the column "Claude draft, 2026-10-02". Rows 109 to 123:
 * section O, without the source note in brackets.
 *
 * Run from the repo root (Node 22, tsx from node_modules):
 *   node_modules/.bin/tsx qa/check-hebrew-copy.mts "<path to 39>"
 * Prints every row that differs and exits 1, or prints PASS.
 */
import { readFileSync } from "node:fs";
import { COPY_V_HE as H } from "../client/src/pages/valuationCopy";

const file = process.argv[2];
if (!file) {
  console.error("Usage: tsx qa/check-hebrew-copy.mts <path to 39-valuation-hebrew-worksheet.md>");
  process.exit(2);
}

// Row number -> the Hebrew cell, as written in 39.
const sheet = new Map<number, string>();
for (const line of readFileSync(file, "utf8").split("\n")) {
  const m = line.match(/^\|\s*(\d+)\s*\|/);
  if (!m) continue;
  const cells = line.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim().replace(/\\\|/g, "|"));
  let he = cells[cells.length - 1];
  const row = Number(m[1]);
  if (row >= 109) he = he.replace(/^`|`?\s*\((?:line|live|word list|Ben|section)[^)]*\)\s*$/g, "").replace(/`$/, "").trim();
  sheet.set(row, he);
}

const P = "{percent}" as unknown as number;
const N = "{n}" as unknown as number;
const dot = (o: Record<string, string>) => Object.values(o).join(" · ");

// Row number -> what the code says for it, in the same shape as the sheet.
const code: Record<number, string> = {
  1: H.nav.talkToUs,
  2: H.nav.homeAriaLabel,
  3: H.nav.langAriaLabel,
  4: H.front.headline,
  5: H.front.progress(P),
  6: H.front.urlLabel,
  7: H.front.urlPlaceholder,
  8: H.front.whenLabel,
  9: H.front.selectPlaceholder,
  10: H.timeToSell.now,
  11: H.timeToSell["within-1y"],
  12: H.timeToSell["1-2y"],
  13: H.timeToSell["2-5y"],
  14: H.timeToSell.exploring,
  15: H.front.seriousLabel,
  16: `${H.front.seriousEnds.low} · ${H.front.seriousEnds.high}`,
  17: H.front.revenueLabel,
  18: dot(H.revenue),
  19: H.front.profitLabel,
  20: dot(H.profit),
  21: H.front.staffLabel,
  22: dot(H.staff),
  23: H.front.noteLabel,
  24: H.front.missing,
  25: H.front.submit,
  26: H.front.contactNote,
  27: H.front.confidential,
  28: H.disclaimer,
  29: H.working.heading,
  30: H.working.sub,
  31: H.stages.read,
  32: H.stages.learn,
  33: H.stages.market,
  34: H.stages.value,
  35: H.stages.range,
  36: H.working.longStep,
  37: H.working.companyFallbackName,
  38: H.working.ringAriaLabel(P),
  39: H.taglines[0],
  40: H.taglines[1],
  41: H.taglines[2],
  42: H.gate.label,
  43: H.gate.heading,
  44: H.gate.sub,
  45: H.gate.nameLabel,
  46: H.gate.phoneLabel,
  47: H.gate.emailLabel,
  48: H.gate.errAll,
  49: H.gate.errName,
  50: H.gate.errReach,
  51: H.gate.errEmailBad,
  52: H.gate.errPhoneBad,
  53: H.gate.confidential,
  54: H.gate.submit,
  55: H.result.title("{company}"),
  56: H.result.privateLine,
  57: H.result.cardMarket,
  58: H.result.cardValue,
  59: H.result.cardRange,
  60: H.result.rangeFigure("12", "28"),
  61: H.result.rangeLine,
  62: H.result.ctaLead,
  63: H.result.ctaBody,
  64: H.result.callBtn,
  65: H.result.scarcity,
  66: H.result.callDone,
  67: H.result.specialTitle("{company}"),
  68: H.result.cardSpecial,
  69: H.result.bigLead,
  70: H.result.bigBody,
  71: H.result.byHandLead,
  72: H.result.byHandBody,
  73: H.result.specialCta,
  74: H.error.headingUnreadable,
  75: H.error.subUnreadable,
  76: H.error.talkBtn,
  77: H.error.retryBtn,
  78: H.talk.title,
  79: H.talk.subWithRun,
  80: H.talk.subNoRun,
  81: H.talk.nameLabel,
  82: H.talk.reachLabel,
  83: H.talk.messageLabel,
  84: [H.talk.submit, H.talk.sending, H.talk.retry, H.talk.closeBtn].join(" / "),
  85: H.talk.sentTitle,
  86: H.talk.sentBody,
  103: H.server.cooldown,
  104: H.server.overCap,
  105: H.server.notConfigured,
  106: H.server.busy,
  107: H.head.title,
  108: H.head.description,
  109: H.front.urlError,
  110: H.talk.errName,
  111: H.talk.errReachMissing,
  112: H.talk.errEmailBad,
  113: H.talk.closeAriaLabel,
  114: H.talk.sendFailed,
  115: H.error.headingBlocked,
  116: H.working.stagesAriaLabel,
  117: H.result.coRevenue,
  118: H.result.coProfit,
  119: H.result.companyAriaLabel,
  121: H.front.progressAriaLabel,
  122: H.front.seriousNotChosen,
  123: H.front.seriousValueText(N),
};

let bad = 0;
for (const [row, mine] of Object.entries(code)) {
  const want = sheet.get(Number(row));
  if (want === undefined) {
    console.log(`row ${row}: not in the sheet`);
    bad++;
  } else if (want !== mine) {
    console.log(`row ${row}: differs\n  sheet: ${want}\n  code:  ${mine}`);
    bad++;
  }
}
// Row 120: no word, the label alone.
if (H.result.watchLabel("X") !== "X") {
  console.log("row 120: watchLabel must return the label alone");
  bad++;
}
for (const row of Array.from(sheet.keys())) {
  if (!(row in code) && row !== 120) {
    console.log(`row ${row}: in the sheet, not checked against the code`);
    bad++;
  }
}
console.log(bad ? `FAIL: ${bad} rows` : `PASS: ${Object.keys(code).length + 1} rows match 39`);
process.exit(bad ? 1 : 0);
