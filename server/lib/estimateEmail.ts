/**
 * The valuation estimate email. Sent only when he left an email (site/35).
 *
 * Same rule as the old letter (snapshotEmail.ts): the email is a second view
 * of the saved run, never a second piece of writing, and the model is never
 * called again. The range in his inbox is the range on his screen, character
 * for character. Every fixed line is a key in COPY_V.email
 * (client/src/pages/valuationCopy.ts), so Hebrew is a copy swap.
 *
 * The look is the old letter's: tables and inline styles only, Georgia and
 * Arial, because Gmail strips everything else. Its building blocks are
 * borrowed from snapshotEmail.ts, which still sends the old Hebrew tool's
 * letter until the Hebrew pass.
 */
import { VALUATION_COPY, type VCopy, type VLang } from "../../client/src/pages/valuationCopy";
import {
  BURGUNDY,
  FINE,
  FONT_SANS,
  FONT_SERIF,
  GESHER_LOGO_H,
  GESHER_LOGO_URL,
  GESHER_LOGO_W,
  LINE,
  NAVY,
  companyMark,
  escapeHtml,
  firstName,
  label,
  leadIn,
  para,
  small,
  titleHtml,
  valueDrivers,
} from "./snapshotEmail";

/** What the letter is allowed to know. */
export interface EstimateLetter {
  companyName?: string;
  companyOneliner?: string;
  /** "number" prints the range. The other two print the by-hand lines. */
  variant: "number" | "by_hand" | "big";
  /** "₪6M to ₪11M", exactly as the page printed it. Empty on the other two. */
  rangeText?: string;
  /** Market and Value only. The range is never in here. */
  resultMd?: string;
  logoUrl?: string;
  lang?: VLang;
}

function copyFor(lang?: VLang): VCopy {
  return VALUATION_COPY[lang === "he" ? "he" : "en"];
}

function companyOf(letter: EstimateLetter): string {
  return letter.companyName?.trim() || "business";
}

/** A range we promise to print, or the by-hand lines when there is none. */
function hasNumber(letter: EstimateLetter): boolean {
  return letter.variant === "number" && Boolean(letter.rangeText?.trim());
}

export function estimateSubject(letter: EstimateLetter): string {
  const c = copyFor(letter.lang).email;
  return hasNumber(letter) ? c.subject(companyOf(letter)) : c.specialSubject(companyOf(letter));
}

function titleFn(letter: EstimateLetter): (company: string) => string {
  const c = copyFor(letter.lang).email;
  return hasNumber(letter) ? c.title : c.specialTitle;
}

/** The two lines in the box: the figure and its note, or the by-hand pair. */
function rangeBox(letter: EstimateLetter): { label: string; big: string; note: string; isNumber: boolean } {
  const c = copyFor(letter.lang).email;
  if (hasNumber(letter)) {
    return { label: c.rangeLabel, big: letter.rangeText!.trim(), note: c.disclaimer, isNumber: true };
  }
  if (letter.variant === "big") return { label: "", big: c.bigLine, note: c.bigBody, isNumber: false };
  return { label: "", big: c.byHandLine, note: c.byHandBody, isNumber: false };
}

/** The letter itself, one <table>, so Ben's copy can embed the same markup. */
export function estimateLetterTable(letter: EstimateLetter, to: { name?: string }): string {
  const lang = letter.lang === "he" ? "he" : "en";
  const dir = lang === "he" ? "rtl" : "ltr";
  const c = copyFor(lang).email;
  const company = companyOf(letter);
  const box = rangeBox(letter);
  const drivers = valueDrivers(letter.resultMd ?? "", "Value");
  const start = dir === "rtl" ? "right" : "left";
  const end = dir === "rtl" ? "left" : "right";

  const bigStyle = box.isNumber
    ? `font-family:${FONT_SERIF};font-size:36px;line-height:1.1;color:${BURGUNDY};`
    : `font-family:${FONT_SERIF};font-size:26px;line-height:1.2;color:${NAVY};`;

  // The figure sits in its own isolate, so "₪6M to ₪11M" reads left to right
  // inside a right-to-left letter and a Hebrew figure reads right to left
  // inside an English one. <bdi> works out each from its own letters.
  const bigInner = `<bdi>${escapeHtml(box.big)}</bdi>`;

  const driverHtml = drivers
    .map((d) =>
      para((d.lead ? leadIn(d.lead + (/[.:!?]$/.test(d.lead) ? "" : ".")) : "") + escapeHtml(d.body)),
    )
    .join("");

  return `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" dir="${dir}"
         style="width:600px;max-width:600px;background:#ffffff;border-collapse:collapse;">

    <!-- Masthead -->
    <tr><td style="padding:18px 40px;border-bottom:1px solid ${LINE};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="${start}" valign="middle">
          <img src="${GESHER_LOGO_URL}" width="${GESHER_LOGO_W}" height="${GESHER_LOGO_H}"
               alt="Gesher" style="display:block;border:0;width:${GESHER_LOGO_W}px;height:${GESHER_LOGO_H}px;">
        </td>
        <td align="${end}" valign="middle">${label(c.privateLabel, end, dir === "rtl")}</td>
      </tr></table>
    </td></tr>

    <!-- Company header -->
    <tr><td style="padding:30px 40px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        ${companyMark({ logoUrl: letter.logoUrl }, company)}
        <td style="width:16px;">&nbsp;</td>
        <td valign="middle">
          <div style="font-family:${FONT_SERIF};font-size:27px;line-height:1.15;color:${NAVY};">${titleHtml({ title: titleFn(letter) }, company)}</div>
          ${letter.companyOneliner?.trim() ? `<div style="margin-top:4px;">${small(letter.companyOneliner.trim())}</div>` : ""}
        </td>
      </tr></table>
    </td></tr>

    <!-- Letter -->
    <tr><td style="padding:24px 40px 32px;">
      ${para(escapeHtml(c.greeting(firstName(to.name))))}

      <!-- Range -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="border-top:1px solid ${NAVY};border-bottom:1px solid ${NAVY};margin:0 0 22px;">
        <tr><td style="padding:18px 0;">
          ${box.label ? `<div style="margin-bottom:6px;">${label(box.label, start, dir === "rtl")}</div>` : ""}
          <div style="${bigStyle}margin-bottom:6px;">${bigInner}</div>
          <div>${small(box.note)}</div>
        </td></tr>
      </table>

      ${driverHtml}
      ${para(leadIn(c.closeLead) + escapeHtml(c.closeBody))}
      ${para(escapeHtml(c.closeRead))}
      <p style="margin:0 0 18px;font-family:${FONT_SERIF};font-size:17px;line-height:1.4;color:${NAVY};">
        ${escapeHtml(c.signName)}<br>${escapeHtml(c.signFirm)}
      </p>
      <p style="margin:8px 0 0;padding-top:16px;border-top:1px solid ${LINE};font-family:${FONT_SANS};
                font-size:12px;line-height:1.5;color:${FINE};">${escapeHtml(c.fine)}</p>
    </td></tr>

  </table>`;
}

/** The letter in its own envelope, which is what the owner receives. */
export function buildEstimateEmailHtml(letter: EstimateLetter, to: { name?: string }): string {
  const lang = letter.lang === "he" ? "he" : "en";
  const dir = lang === "he" ? "rtl" : "ltr";
  return `<!doctype html>
<html dir="${dir}" lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(titleFn(letter)(companyOf(letter)))}</title></head>
<body style="margin:0;padding:0;background:#f4efe5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4efe5;">
<tr><td align="center" style="padding:24px 12px;">
  ${estimateLetterTable(letter, to)}
</td></tr>
</table>
</body></html>`;
}

/** The same letter as plain text, from the same fields. */
export function buildEstimateEmailText(letter: EstimateLetter, to: { name?: string }): string {
  const c = copyFor(letter.lang).email;
  const box = rangeBox(letter);
  const lines: string[] = [titleFn(letter)(companyOf(letter)), ""];
  if (letter.companyOneliner?.trim()) lines.push(letter.companyOneliner.trim(), "");
  lines.push(c.greeting(firstName(to.name)), "");
  if (box.label) lines.push(box.label.toUpperCase());
  lines.push(box.big, box.note, "");
  for (const d of valueDrivers(letter.resultMd ?? "", "Value")) {
    lines.push(d.lead ? `${d.lead} ${d.body}` : d.body);
  }
  lines.push("", `${c.closeLead} ${c.closeBody}`, "", c.closeRead, "", c.signName, c.signFirm, "", c.fine);
  return lines.join("\n");
}
