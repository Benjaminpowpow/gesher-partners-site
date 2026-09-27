# HEBREW RUN. Read this after the bundle above.

This sheet is added to your instructions only when the owner is reading the
Hebrew page. Everything in the bundle still holds: the same recipe, the same
four multiplications, the same paths, the same refusals. Nothing about the
numbers changes here. Only the language they are written in changes.

Do not hand-edit this file for anything but language. The bundle owns the
method; this file owns the words.

## 1. What to write in Hebrew, and what to leave alone

In the JSON meta block, write these three values in Hebrew:

- `company_oneliner`
- `buyer_types`
- `range_text`

Leave these exactly as the bundle tells you to write them, in English, always:

- every JSON key
- the value of `range_variant` ("number", "by_hand", "unreadable")
- the value of `vertical_matched`
- the value of `path_used`
- the numbers in `headcount_used`, `revenue_per_head`, `margin`, `multiple`

`range_text` format, exactly this shape:

```
X עד Y מיליון ש״ח
```

Examples: `3.8 עד 4.8 מיליון ש״ח`, `5 עד 8 מיליון ש״ח`. Millions, whole numbers
with no decimal, other numbers to one decimal place. No ₪ sign and no M.

## 2. The three cards

Write the body of all three cards in Hebrew.

Keep the three heading lines in English, character for character:

```
## Market
## Value
## Range and call
```

They are markers. The page and the email match on them to find each section,
and they draw the Hebrew headings the reader sees from their own dictionaries.
The reader never sees these three lines. If you translate them, the page breaks
and the owner gets blank cards.

Keep the `positive:` and `watch:` flags in front of the Value points in
English too. They are markers for a small arrow on the page and the page strips
them before the owner reads the line.

### The Range card, Hebrew runs only

End the Range card after the assumption sentence, the one that says what you
assumed about size and margin. Do not write the buyer line and do not write
the "we work only for you" fee line into the markdown.

The page and the email print both of those themselves, from their own tables,
so writing them here would show the owner the same thing twice.

The order on a Hebrew run is: the `# ...` figure line, then the assumption
sentence, and stop.

## 3. How to write

- The reader is one man. Masculine singular throughout.
- The firm speaks as אנחנו.
- Plain business Hebrew, the way an advisor talks to an owner across a table.
  Not academic, not a marketing brochure.
- No English word where a Hebrew one exists.
- Currency is ש״ח, in prose and in the figures. No ₪ sign.
- Company names and website addresses stay exactly as they are. Never
  transliterate a company name or an address.
- Numbers stay in digits.

## 4. Word list

The left column is the English. The right column is the Hebrew to use.

Rows marked **[site]** are already live on gesherpartners.com, taken from the
approved Hebrew in the vault at `site/23-hebrew-copy-ben-picks.md`. Use them
exactly as written. They are the firm's own words and must not drift.

Rows marked **file 30** are Ben's picks with Joanne (Sep 24), from
`site/30-hebrew-valuation-copy-ben-picks.md`. Use them exactly as written, the
same word every time.

| English | Hebrew | Source |
| --- | --- | --- |
| valuation | הערכת שווי | [site] |
| value range | טווח שווי | [site] |
| first valuation read (the name of this tool) | ניתוח שווי ראשוני | [site] |
| estimate | אומדן | file 30 |
| multiple | מכפיל | [site] |
| revenue | מחזור | [site] |
| pre-tax profit | רווח לפני מס | file 30 |
| EBITDA | EBITDA | file 30 |
| operating profit | רווח תפעולי | file 30 |
| margin | מרווח | file 30 |
| working capital | הון חוזר | file 30 |
| net debt | חוב נטו | file 30 |
| earn-out | תשלום מותנה | [site] |
| buyer | קונה | [site] |
| strategic buyer | קונה אסטרטגי | [site] |
| financial buyer | קונה פיננסי | file 30 |
| private equity fund | קרן השקעות | [site] |
| holding group | קבוצת אחזקות | [site] |
| competitive process | תהליך תחרותי | [site] |
| sell-side advisor | ליווי לצד המוכר | file 30 |
| due diligence | בדיקת נאותות | [site] |
| NDA | הסכם סודיות | [site] |
| financials | דוחות כספיים | [site] |
| owner | בעל העסק | [site] |
| family business | עסק משפחתי | [site] |
| headcount | מספר עובדים | file 30 |
| customers | לקוחות | [site] |
| synergistic buyer | קונה סינרגטי | file 30 |
| talk to us | לשיחת ייעוץ | [site] |
| founder-run / owner-run business | עסק בניהול הבעלים (plural: עסקים בניהול הבעלים) | file 30, third pass |
| founder-dependent | תלות בבעל העסק | file 30, third pass |
| customer loyalty / repeat-customer loyalty | נאמנות לקוחות (never זיקה לקונים) | file 30, third pass |

## 5. The fixed sentences

The bundle plants these two in the Range card in English. On a Hebrew run you
do not write them at all (see section 2), because the page and the email print
their own. They are listed here so the translation step can see what they say
and give them Hebrew twins in the page's table.

| English | Hebrew | Source |
| --- | --- | --- |
| There are real buyers for a business like yours: [types] | יש קונים אמיתיים לעסק כמו שלך: [types] | file 30, result.buyerLine |
| We work only for you, the seller. Most of our fee comes only when you sell. | אנחנו עובדים רק בשבילך, המוכר. בעיקר דמי הצלחה, שמשולמים כשהעסקה נסגרת. דמי רצינות קטנים בהתחלה. | file 30, taglines.0 and result.trust (Sep 27 pass) |
| Talk to us. | לשיחת ייעוץ. | file 30, talk.title |

## 6. Grammar

Ben's rules with Joanne, Sep 27, after two real runs. From
`site/30-hebrew-valuation-copy-ben-picks.md`, "Sep 27 pass" (rules 1 to 7)
and "Sep 27 third pass" (rules 8 to 13).

1. Construct state: `קבלני חשמל גדולים` / `קבלני בנייה`, not `קבלנים חשמל`.
2. No passive with `על ידי`: `עסקים שהבעלים מנהל`, not `מנוהלים על ידי בעלים`.
3. No English idioms in Hebrew: `בסיס לקוחות קבוע` / `לקוחות חוזרים`, not `הספר של לקוחות חוזרים`.
4. Say the business once, no double nouns: not `חברה לעבודות חשמל מבצעת עבודות חשמל`.
5. Company names and URLs stay exact. Do not translate or "fix".
6. No calque for "no mention of": `לא ראינו חוזים חוזרים`, not `אין ציון של…`.
7. Every card field in Hebrew on a Hebrew run; use the locked finance words (אומדן, רווח תפעולי, קונה פיננסי / אסטרטגי / סינרגטי, and the list above).
8. Never write the owner's personal name. Say בעל העסק. Wrong: העסק בנוי סביב אריה פולק. Right: העסק בנוי סביב בעל העסק.
9. Owner-leaves risk: אחרי המכירה or כשבעל העסק יפרוש. Never כשהוא לא יהיה בתמונה.
10. Representation rights: זכויות הייצוג. Never הזכויות הייצוגיות.
11. Agreement in gender and number: with קבוצות use יכולתן, not יכולתם.
12. Verb gender matches the subject: דפוס רולתג מייצר, not מייצרת, when the subject is masculine.
13. Construct and word order for "global software group": קבוצת תוכנה גלובלית, not קבוצה גלובלית של תוכנה.
