/**
 * The guard the spec asks for: given a saved run, nothing the model used to
 * bracket its output can reach the owner.
 *
 * On Sep 17 a real owner got the raw JSON meta and a stray "---" in his email.
 * These tests exist so that cannot come back quietly.
 */
import { describe, it, expect } from "vitest";
import {
  buildSnapshotEmailHtml,
  buildSnapshotEmailText,
  firstName,
  rangeBlockFor,
  shouldSendEmail,
  snapshotSubject,
  valueDrivers,
  type SnapshotRun,
} from "./snapshotEmail";

const RESULT_MD = `## Market
Israeli clinic software is consolidating.
Buyers have been active for three years.

## Value
**Installed base.** positive: Over 3,000 active healthcare practices use your software. That is a moat.
**Recurring revenue model.** Software sold on subscription generates predictable cash flow. Buyers pay multiples for it.
watch: **Margin proof needed.** We are estimating earnings from revenue. Exact profit moves the top.

## Range and call
₪11.6M to ₪12.2M. Talk to us and we will name the buyers.`;

const RUN: SnapshotRun = {
  companyName: "Optima",
  companyOneliner: "Vertical SaaS for Israeli healthcare clinics.",
  rangeVariant: "number",
  rangeText: "₪11.6M to ₪12.2M",
  buyerTypes: "a larger Israeli software or IT-services firm, and funds that buy software companies your size",
  pathUsed: "A1",
  resultMd: RESULT_MD,
  lang: "en",
};

describe("nothing internal reaches the owner", () => {
  const html = buildSnapshotEmailHtml(RUN, { name: "Benjamin Aronson test 3" });

  it("prints the range exactly once", () => {
    const hits = html.split("₪11.6M to ₪12.2M").length - 1;
    expect(hits).toBe(1);
  });

  for (const leak of ["path_used", "vertical_matched", "range_variant", "company_oneliner", "positive:", "watch:", "```"]) {
    it(`never contains ${leak}`, () => {
      expect(html).not.toContain(leak);
    });
  }

  it("never contains a bare JSON object", () => {
    expect(html).not.toMatch(/\{\s*"/);
  });

  it("does not render the model's Range and call section", () => {
    expect(html).not.toContain("Talk to us and we will name the buyers");
  });

  it("leaves the Market section on the page", () => {
    expect(html).not.toContain("Israeli clinic software is consolidating");
  });
});

describe("the greeting", () => {
  it("uses the first word only", () => {
    expect(firstName("Benjamin Aronson test 3")).toBe("Benjamin");
  });
  it("is empty when the field is junk", () => {
    expect(firstName("  ")).toBe("");
    expect(firstName("x")).toBe("");
    expect(firstName("test2")).toBe("");
  });
  it("drops the name from the sentence when there is none", () => {
    const html = buildSnapshotEmailHtml(RUN, {});
    expect(html).toContain("Here is the snapshot you just ran.");
    expect(html).not.toContain("Hello ,");
  });
});

describe("value drivers", () => {
  const drivers = valueDrivers(RESULT_MD);

  it("takes only the Value section", () => {
    expect(drivers).toHaveLength(3);
  });
  it("keeps the lead-in and the first sentence only", () => {
    expect(drivers[0].lead).toBe("Installed base.");
    expect(drivers[0].body).toBe("Over 3,000 active healthcare practices use your software.");
    expect(drivers[0].body).not.toContain("That is a moat");
  });
  it("strips the page-only flags", () => {
    expect(drivers[0].body).not.toContain("positive:");
    expect(drivers[2].lead).toBe("Margin proof needed.");
  });
});

describe("the range block, by state", () => {
  it("path A1 is a first estimate", () => {
    const b = rangeBlockFor({ ...RUN, pathUsed: "A1" });
    expect(b.label).toBe("Your range · a first estimate");
    expect(b.warn).toContain("from the information you shared");
  });
  it("path A is a first estimate", () => {
    expect(rangeBlockFor({ ...RUN, pathUsed: "A" }).label).toBe("Your range · a first estimate");
  });
  it("path B is rough", () => {
    const b = rangeBlockFor({ ...RUN, pathUsed: "B" });
    expect(b.label).toBe("Your range · rough");
    expect(b.warn).toContain("You shared no numbers");
  });
  it("v2 tiers: T2 and T3 are a first estimate, T1 is rough", () => {
    expect(rangeBlockFor({ ...RUN, pathUsed: "T3" }).label).toBe("Your range · a first estimate");
    expect(rangeBlockFor({ ...RUN, pathUsed: "T2" }).label).toBe("Your range · a first estimate");
    expect(rangeBlockFor({ ...RUN, pathUsed: "T1" }).warn).toContain("You shared no numbers");
  });
  it("the backup band is rough", () => {
    expect(rangeBlockFor({ ...RUN, pathUsed: "backup" }).label).toBe("Your range · rough");
  });
  it("by_hand shows no number", () => {
    const b = rangeBlockFor({ ...RUN, rangeVariant: "by_hand", rangeText: "" });
    expect(b.kind).toBe("byHand");
    expect(b.big).toBe("We price your space by hand.");
  });
  it("a number state with an empty range falls back to by hand", () => {
    const b = rangeBlockFor({ ...RUN, rangeVariant: "number", rangeText: "   " });
    expect(b.kind).toBe("byHand");
  });
  it("never prints an empty range", () => {
    const html = buildSnapshotEmailHtml({ ...RUN, rangeText: "" }, { name: "Ben" });
    expect(html).not.toContain("₪ to ₪");
    expect(html).toContain("We price your space by hand.");
  });
});

describe("unreadable runs", () => {
  it("send no email", () => {
    expect(shouldSendEmail({ ...RUN, rangeVariant: "unreadable" })).toBe(false);
    expect(shouldSendEmail({ ...RUN, pathUsed: "unreadable" })).toBe(false);
  });
  it("a normal run does send", () => {
    expect(shouldSendEmail(RUN)).toBe(true);
  });
});

describe("the rest of the letter", () => {
  const html = buildSnapshotEmailHtml(RUN, { name: "Benjamin" });

  it("names the company in text, not only in the logo", () => {
    expect(html).toContain("Your Optima Valuation Snapshot");
  });
  it("uses the company in the subject", () => {
    expect(snapshotSubject(RUN)).toBe("Your Optima Valuation Snapshot");
  });
  it("asks for the financials and mentions the NDA", () => {
    expect(html).toContain("we need to see your financial statements");
    expect(html).toContain("We sign an NDA before you send anything.");
  });
  it("has no button and no link to the site", () => {
    expect(html).not.toContain("<a ");
  });
  it("drops the we-work-only-for-you line", () => {
    expect(html).not.toContain("We work only for you");
  });
  it("says a few minutes, never about a minute", () => {
    expect(html).toContain("in a few minutes");
    expect(html).not.toContain("about a minute");
  });
  it("escapes what the model gave us", () => {
    const nasty = buildSnapshotEmailHtml({ ...RUN, companyName: '<script>x</script>' }, {});
    expect(nasty).not.toContain("<script>");
  });
  it("falls back to a letter when there is no logo", () => {
    expect(html).not.toContain("<img src=\"https://optima");
    expect(html).toContain(">O<");
  });
  it("uses the owner's logo when the site gave us one", () => {
    const withLogo = buildSnapshotEmailHtml({ ...RUN, logoUrl: "https://optima.org.il/logo.png" }, {});
    expect(withLogo).toContain("https://optima.org.il/logo.png");
  });
});

describe("the plain-text part", () => {
  const text = buildSnapshotEmailText(RUN, { name: "Benjamin Aronson" });

  it("carries the same range", () => {
    expect(text).toContain("₪11.6M to ₪12.2M");
  });
  it("carries no markup and no internals", () => {
    expect(text).not.toContain("<");
    expect(text).not.toContain("path_used");
    expect(text).not.toContain("positive:");
  });
  it("greets by first name", () => {
    expect(text).toContain("Hello Benjamin,");
  });
});

describe("the Hebrew letter", () => {
  const HE: SnapshotRun = { ...RUN, lang: "he", rangeText: "₪11.6M עד ₪12.2M", pathUsed: "T3" };
  it("uses Ben's picks from file 30, not the English", () => {
    expect(snapshotSubject(HE)).toBe("ניתוח שווי ראשוני של Optima");
    const html = buildSnapshotEmailHtml(HE, { name: "חיים כהן" });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("שלום חיים, הניתוח שהרצת מוכן.");
    expect(html).toContain("הטווח שלך · אומדן ראשוני");
    expect(html).toContain("אומדן, לא הערכת שווי. לא הצעה, ולא המלצה לקנות או למכור.");
    expect(html).toContain("₪11.6M עד ₪12.2M");
    expect(html).not.toContain("Valuation Snapshot");
    expect(html).not.toContain("תמצית");
  });
});
