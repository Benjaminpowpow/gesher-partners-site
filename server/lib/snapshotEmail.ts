/**
 * The Valuation Snapshot email.
 *
 * Spec: PROJECTS/israel-ai-investment-bank/tools/exit-brief/08-snapshot-email-spec.md
 *
 * The one rule, and everything else follows from it:
 *
 *   The email is a second view of the saved run. It is not a second piece of
 *   writing, and the model is never called again to write it.
 *
 * The page already works this way. It builds its Range card from the parsed JSON
 * meta and never renders the model's own Range prose. This file does the same,
 * so the number in the owner's inbox equals the number on his screen character
 * for character. Before this, the email rendered the raw markdown, which is how
 * a JSON block and a stray "---" reached a real owner on Sep 17.
 *
 * Everything the owner reads is either a field off the saved run or a fixed
 * string from COPY below. No English sentence is written inline in the template,
 * so Hebrew later is a words job and not a rebuild.
 */

export type Lang = "en" | "he";

/** One saved run, which is all the email is allowed to know. */
export interface SnapshotRun {
  companyName?: string;
  companyOneliner?: string;
  /** "number" | "by_hand" | "unreadable" */
  rangeVariant?: string;
  /** The range exactly as the page printed it, e.g. "₪11.6M to ₪12.2M". */
  rangeText?: string;
  buyerTypes?: string;
  /** "A" | "A1" | "B" | "backup" | "wild_card" | "unreadable" */
  pathUsed?: string;
  /** The seller-facing markdown, meta already removed. */
  resultMd?: string;
  /** The owner's own logo, absolute https, raster. Undefined means letter. */
  logoUrl?: string;
  lang?: Lang;
}

export interface SnapshotRecipient {
  /** The whole name field as typed. Only the first word is used. */
  name?: string;
}

// ─── Copy ────────────────────────────────────────────────────────────────────
// Every fixed string in the email, keyed by language. The Hebrew block holds
// Ben's picks, line for line, from the vault file
// site/30-hebrew-valuation-copy-ben-picks.md. Hebrew is never written here
// first.
//
// `headings` is not shown to anyone. The engine writes "## Market", "## Value"
// and "## Range and call" in English inside its output in both languages,
// because the page and this file find their sections by matching those lines.
// Keying them here means the finder asks the language's own dictionary instead
// of a hardcoded English word, so the day the markers change they change in one
// place.
const COPY = {
  en: {
    dir: "ltr" as const,
    headings: { market: "Market", value: "Value", range: "Range and call" },
    subject: (company: string) => `Your ${company} Valuation Snapshot`,
    privateLabel: "Strictly private",
    title: (company: string) => `Your ${company} Valuation Snapshot`,
    greeting: (first: string) =>
      first ? `Hello ${first}, here is the snapshot you just ran.` : "Here is the snapshot you just ran.",
    rangeLabelFirstEstimate: "Your range · a first estimate",
    rangeLabelRough: "Your range · rough",
    rangeLabelPlain: "Your range",
    warnFirstEstimate:
      "This number can be far off. We built it in a few minutes from the information you shared and public information. We have not seen your books.",
    warnRough:
      "This number can be far off. You shared no numbers, so we built it in a few minutes from your website and public information. We have not seen your books.",
    byHandLine: "We price your space by hand.",
    warnByHand:
      "Your business is not a cookie cutter case, so we will not throw out a number we cannot stand behind.",
    whoWouldBuyLead: "Who would buy.",
    // The engine writes the buyer types as a mid-sentence list ("a larger
    // Israeli software firm, and funds that..."). After a bold lead-in it has
    // to start like a sentence, so the first letter is raised.
    whoWouldBuy: (types: string) => {
      const t = types.trim().replace(/[.\s]+$/, "");
      return `${t.charAt(0).toUpperCase()}${t.slice(1)}.`;
    },
    closeLead: "It looks like you have something here.",
    closeBody:
      "To put a real number on it, we need to see your financial statements. Reply to this email and we will set up a short call. We sign an NDA before you send anything.",
    closeRead: "We read every reply ourselves.",
    signName: "Ofir and Benjamin",
    signFirm: "Gesher Partners",
    fine: "An estimate, not a valuation. Not an offer, or advice to buy or sell.",
  },
  // Every line below is copied verbatim, by ID, from
  // site/30-hebrew-valuation-copy-ben-picks.md. The headings stay English: they
  // are markers the finder matches on, never shown to the owner.
  he: {
    dir: "rtl" as const,
    headings: { market: "Market", value: "Value", range: "Range and call" },
    subject: (company: string) => `ניתוח שווי ראשוני של ${company}`,
    privateLabel: "בדיסקרטיות",
    title: (company: string) => `ניתוח שווי ראשוני של ${company}`,
    // File 30 writes the greeting as two parts split by " / ". They join here
    // with a space, one line, the same shape as the English.
    greeting: (first: string) =>
      first ? `שלום ${first}, הניתוח שהרצת מוכן.` : "הניתוח שהרצת מוכן.",
    rangeLabelFirstEstimate: "הטווח שלך · אומדן ראשוני",
    rangeLabelRough: "הטווח שלך · משוער",
    rangeLabelPlain: "הטווח שלך",
    warnFirstEstimate:
      "המספר הזה יכול להיות רחוק מהמציאות. בנינו אותו תוך כמה דקות מהמידע ששיתפת וממידע ציבורי. לא ראינו את הדוחות שלך.",
    warnRough:
      "המספר הזה יכול להיות רחוק מהמציאות. לא שיתפת מספרים, אז בנינו אותו תוך כמה דקות מהאתר וממידע ציבורי. לא ראינו את הדוחות שלך.",
    byHandLine: "לתחום שלך אנחנו בונים הערכת שווי ראשונית",
    warnByHand:
      "העסק שלך לא מקרה סטנדרטי, ולכן לא נזרוק מספר שאי אפשר לעמוד מאחוריו.",
    whoWouldBuyLead: "מי יקנה.",
    // Hebrew has no capitals, so the list only needs its closing period.
    whoWouldBuy: (types: string) => `${types.trim().replace(/[.\s]+$/, "")}.`,
    closeLead: "נראה שיש כאן משהו אמיתי.",
    closeBody:
      "כדי לשים על זה מספר אמיתי, צריך לראות את הדוחות הכספיים שלך. השב למייל הזה ונקבע שיחת ייעוץ קצרה. נחתום על NDA לפני שתשלח משהו.",
    closeRead: "אנחנו קוראים כל תשובה בעצמנו.",
    signName: "אופיר ובנימין",
    signFirm: "Gesher Partners",
    fine: "אומדן, לא הערכת שווי. לא הצעה, ולא המלצה לקנות או למכור.",
  },
} satisfies Record<Lang, unknown>;

function copyFor(lang?: Lang) {
  return lang === "he" ? COPY.he : COPY.en;
}

// ─── Small helpers ───────────────────────────────────────────────────────────

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The first word of the name field, and nothing else.
 *
 * The Sep 17 test email said "Hello Benjamin Aronson test 3", because the field
 * is whatever he typed. A letter greets a man by his first name.
 */
export function firstName(raw?: string): string {
  const w = (raw ?? "").trim().split(/\s+/)[0] ?? "";
  // Anything with a digit or a symbol in it is not a name.
  return /^[\p{L}'\-]{2,}$/u.test(w) ? w : "";
}

/** Keep the first sentence of a driver. A trim, never a rewrite. */
export function firstSentence(s: string): string {
  const t = s.trim();
  const m = t.match(/^[\s\S]*?[.!?](?=\s|$)/);
  return (m ? m[0] : t).trim();
}

/**
 * Swap the engine's three marker headings for the ones in a language's
 * dictionary, before anything reads the markdown.
 *
 * The engine writes them in English in both languages, on purpose, because
 * they are markers and not words anyone reads. This is the one place the email
 * turns a marker into the heading its own language calls it. On an English run
 * the dictionary says the same three words, so the markdown comes out
 * unchanged, character for character.
 */
export function withHeadings(
  resultMd: string,
  headings: { market: string; value: string; range: string },
): string {
  return resultMd
    .replace(/^##\s+Market\s*$/gm, `## ${headings.market}`)
    .replace(/^##\s+Value\s*$/gm, `## ${headings.value}`)
    .replace(/^##\s+Range and call\s*$/gm, `## ${headings.range}`);
}

/**
 * Pull the Value drivers out of the saved markdown.
 *
 * Each driver is "**Lead-in.** Body sentence. More sentences." The email keeps
 * the lead-in and the first sentence of the body. The Market section stays on
 * the page and never reaches the email.
 *
 * `valueHeading` is whatever withHeadings just wrote, so this never has to know
 * which language it is reading.
 */
export function valueDrivers(
  resultMd?: string,
  valueHeading: string = "Value",
): { lead: string; body: string }[] {
  if (!resultMd) return [];
  const out: { lead: string; body: string }[] = [];
  let inValue = false;
  for (const raw of resultMd.split("\n")) {
    const line = raw.trim();
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      inValue = heading[1].trim() === valueHeading;
      continue;
    }
    if (!inValue || !line) continue;
    // The engine writes the positive:/watch: flag in two places depending on
    // the driver: sometimes in front of the whole line, sometimes after the
    // bold lead-in. The page reads these to pick an icon. The email must not
    // print either one, so the flag is stripped before and after the split.
    const dropFlag = (t: string) => t.replace(/^\s*(?:positive|watch):\s*/i, "");
    const cleaned = dropFlag(line.replace(/^[-*•]\s+/, ""));
    const bold = cleaned.match(/^\*\*(.+?)\*\*\s*(.*)$/);
    if (bold) {
      out.push({ lead: bold[1].trim(), body: firstSentence(dropFlag(bold[2])) });
    } else if (cleaned) {
      out.push({ lead: "", body: firstSentence(cleaned) });
    }
  }
  return out;
}

type RangeBlock =
  | { kind: "number"; label: string; big: string; warn: string }
  | { kind: "byHand"; label: string; big: string; warn: string };

/**
 * Which of the three range blocks this run gets.
 *
 * The guard matters more than it looks: a run marked `number` whose range_text
 * came back empty must fall to by hand, or the owner gets "₪ to ₪".
 */
export function rangeBlockFor(run: SnapshotRun, lang?: Lang): RangeBlock {
  const c = copyFor(lang);
  const text = (run.rangeText ?? "").trim();
  const byHand = run.rangeVariant === "by_hand" || !text;
  if (byHand) {
    return { kind: "byHand", label: c.rangeLabelPlain, big: c.byHandLine, warn: c.warnByHand };
  }
  // v8 wrote A or A1 when the owner shared his numbers. v2 (Sep 23) writes the
  // recipe tier instead: T2 is revenue, T3 is profit, T1 is a headcount guess
  // with no numbers from him. Without T2 and T3 here, every run since v2 told
  // an owner who typed his numbers that he had shared none.
  const path = (run.pathUsed ?? "").toUpperCase();
  const sharedNumbers = path === "A" || path === "A1" || path === "T2" || path === "T3";
  return {
    kind: "number",
    label: sharedNumbers ? c.rangeLabelFirstEstimate : c.rangeLabelRough,
    big: text,
    warn: sharedNumbers ? c.warnFirstEstimate : c.warnRough,
  };
}

/** An unreadable run has no snapshot, so there is nothing to send. */
export function shouldSendEmail(run: SnapshotRun): boolean {
  return run.rangeVariant !== "unreadable" && run.pathUsed !== "unreadable";
}

export function snapshotSubject(run: SnapshotRun): string {
  const c = copyFor(run.lang);
  return c.subject(run.companyName?.trim() || "business");
}

// ─── The letter ──────────────────────────────────────────────────────────────
// Tables and inline styles only. No flex, no grid, no external CSS, no web
// fonts: Gmail strips all four. Georgia for the letter, Arial for labels and
// fine print, because those two are on every machine that will open this.

const NAVY = "#16243b";
const INK = "#2b2e35";
const MUTED = "#77715f";
const LINE = "#e2dbcb";
const BURGUNDY = "#7b2d2d";
const FINE = "#8d887a";

const FONT_SERIF = "Georgia, 'Times New Roman', serif";
const FONT_SANS = "Arial, Helvetica, sans-serif";

/** Where the hosted Gesher lockup lives. Absolute, because email has no origin. */
export const GESHER_LOGO_URL = "https://gesherpartners.com/brand/gesher-lockup-email.png";
const GESHER_LOGO_W = 132;
const GESHER_LOGO_H = 46;

function label(text: string, align: string): string {
  return (
    `<span style="font-family:${FONT_SANS};font-size:11px;letter-spacing:.16em;` +
    `text-transform:uppercase;color:${MUTED};font-weight:bold;text-align:${align};">${escapeHtml(text)}</span>`
  );
}

function small(text: string): string {
  return (
    `<span style="font-family:${FONT_SANS};font-size:14px;line-height:1.55;color:${MUTED};">` +
    `${escapeHtml(text)}</span>`
  );
}

function para(html: string): string {
  return (
    `<p style="margin:0 0 18px;font-family:${FONT_SERIF};font-size:17px;` +
    `line-height:1.68;color:${INK};">${html}</p>`
  );
}

function leadIn(text: string): string {
  return `<span style="font-weight:bold;color:${NAVY};">${escapeHtml(text)}</span> `;
}

/**
 * The company mark: his own logo when the page gave us a raster one, otherwise a
 * bordered square with the first letter. The square is not a failure state. It
 * is always sharp, and it never shows a stranger a broken image.
 */
function companyMark(run: SnapshotRun, alt: string): string {
  const box =
    "width:58px;height:58px;border:1px solid " + LINE + ";background:#ffffff;text-align:center;";
  if (run.logoUrl) {
    return (
      `<td style="${box}padding:0;" width="58" valign="middle">` +
      `<img src="${escapeHtml(run.logoUrl)}" width="48" height="48" alt="${escapeHtml(alt)}" ` +
      `style="display:block;margin:0 auto;width:48px;height:48px;object-fit:contain;border:0;"></td>`
    );
  }
  const letter = (alt.trim()[0] ?? "?").toUpperCase();
  return (
    `<td style="${box}font-family:${FONT_SERIF};font-size:28px;color:${NAVY};" ` +
    `width="58" height="58" valign="middle" align="center">${escapeHtml(letter)}</td>`
  );
}

/**
 * The letter itself, as one <table> and nothing else.
 *
 * Kept separate from the document shell so Ben's lead notification can embed
 * the very same markup. He asked to see exactly what the owner sees, and a
 * second rendering would be a second thing to keep in step. One fragment, two
 * envelopes.
 */
export function snapshotLetterTable(run: SnapshotRun, to: SnapshotRecipient): string {
  const c = copyFor(run.lang);
  const dir = c.dir;
  const company = run.companyName?.trim() || "business";
  const block = rangeBlockFor(run, run.lang);
  const drivers = valueDrivers(
    withHeadings(run.resultMd ?? "", c.headings),
    c.headings.value,
  );

  const bigStyle =
    block.kind === "number"
      ? `font-family:${FONT_SERIF};font-size:36px;line-height:1.1;color:${BURGUNDY};`
      : `font-family:${FONT_SERIF};font-size:26px;line-height:1.2;color:${NAVY};`;

  // The number is Latin-and-shekel and must not reorder inside a Hebrew line.
  const bigInner = `<span dir="ltr">${escapeHtml(block.big)}</span>`;

  const driverHtml = drivers
    .map((d) => para((d.lead ? leadIn(d.lead + (/[.:!?]$/.test(d.lead) ? "" : ".")) : "") + escapeHtml(d.body)))
    .join("");

  const buyerHtml = run.buyerTypes?.trim()
    ? para(leadIn(c.whoWouldBuyLead) + escapeHtml(c.whoWouldBuy(run.buyerTypes)))
    : "";

  return `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" dir="${dir}"
         style="width:600px;max-width:600px;background:#ffffff;border-collapse:collapse;">

    <!-- Masthead -->
    <tr><td style="padding:18px 40px;border-bottom:1px solid ${LINE};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="${dir === "rtl" ? "right" : "left"}" valign="middle">
          <img src="${GESHER_LOGO_URL}" width="${GESHER_LOGO_W}" height="${GESHER_LOGO_H}"
               alt="Gesher" style="display:block;border:0;width:${GESHER_LOGO_W}px;height:${GESHER_LOGO_H}px;">
        </td>
        <td align="${dir === "rtl" ? "left" : "right"}" valign="middle">${label(c.privateLabel, dir === "rtl" ? "left" : "right")}</td>
      </tr></table>
    </td></tr>

    <!-- Company header -->
    <tr><td style="padding:30px 40px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        ${companyMark(run, company)}
        <td style="width:16px;">&nbsp;</td>
        <td valign="middle">
          <div style="font-family:${FONT_SERIF};font-size:27px;line-height:1.15;color:${NAVY};">${escapeHtml(c.title(company))}</div>
          ${run.companyOneliner?.trim() ? `<div style="margin-top:4px;">${small(run.companyOneliner.trim())}</div>` : ""}
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
          <div style="margin-bottom:6px;">${label(block.label, dir === "rtl" ? "right" : "left")}</div>
          <div style="${bigStyle}margin-bottom:6px;">${bigInner}</div>
          <div>${small(block.warn)}</div>
        </td></tr>
      </table>

      ${driverHtml}
      ${buyerHtml}
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
export function buildSnapshotEmailHtml(run: SnapshotRun, to: SnapshotRecipient): string {
  const c = copyFor(run.lang);
  const company = run.companyName?.trim() || "business";
  return `<!doctype html>
<html dir="${c.dir}" lang="${run.lang ?? "en"}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(c.title(company))}</title></head>
<body style="margin:0;padding:0;background:#f4efe5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4efe5;">
<tr><td align="center" style="padding:24px 12px;">
  ${snapshotLetterTable(run, to)}
</td></tr>
</table>
</body></html>`;
}

/** The same letter as plain text, from the same fields. Never a second draft. */
export function buildSnapshotEmailText(run: SnapshotRun, to: SnapshotRecipient): string {
  const c = copyFor(run.lang);
  const company = run.companyName?.trim() || "business";
  const block = rangeBlockFor(run, run.lang);
  const lines: string[] = [c.title(company), ""];
  if (run.companyOneliner?.trim()) lines.push(run.companyOneliner.trim(), "");
  lines.push(c.greeting(firstName(to.name)), "");
  lines.push(block.label.toUpperCase(), block.big, block.warn, "");
  for (const d of valueDrivers(
    withHeadings(run.resultMd ?? "", c.headings),
    c.headings.value,
  )) {
    lines.push(d.lead ? `${d.lead} ${d.body}` : d.body);
  }
  if (run.buyerTypes?.trim()) lines.push("", `${c.whoWouldBuyLead} ${c.whoWouldBuy(run.buyerTypes)}`);
  lines.push("", `${c.closeLead} ${c.closeBody}`, "", c.closeRead, "", c.signName, c.signFirm, "", c.fine);
  return lines.join("\n");
}
