/**
 * The rules the page and the server share: the quiet gate on the front door,
 * the contact rules on the popup and the inline form, and the revenue check.
 * Spec: site/35-valuation-lead-magnet.md.
 */
import { describe, expect, it } from "vitest";
import {
  REQUIRED_FIELDS,
  answeredCount,
  contactProblem,
  looksLikeIsraeliPhone,
  missingRequired,
  revenueCheckFails,
  type EstimateAnswers,
  type ProfitCode,
  type RevenueCode,
} from "./valuationEstimate";

const FULL: EstimateAnswers = {
  url: "roltag.co.il",
  timeline: "within-1y",
  serious: 8,
  revenue: "10-25",
  profit: "1-2.5",
  staff: "",
  note: "",
};

const EMPTY: EstimateAnswers = {
  url: "",
  timeline: "",
  serious: null,
  revenue: "",
  profit: "",
  staff: "",
  note: "",
};

describe("the gate", () => {
  it("nothing filled: exactly the five required answers are missing, in page order", () => {
    expect(missingRequired(EMPTY)).toEqual(["url", "timeline", "serious", "revenue", "profit"]);
  });

  it("the optional two never count, filled or not", () => {
    expect(missingRequired({ ...EMPTY, staff: "11-50", note: "hi" })).toHaveLength(5);
    expect(missingRequired(FULL)).toEqual([]);
    expect(missingRequired({ ...FULL, staff: "", note: "" })).toEqual([]);
  });

  it("each required answer alone missing: only that one", () => {
    const blank: Record<(typeof REQUIRED_FIELDS)[number], Partial<EstimateAnswers>> = {
      url: { url: "   " },
      timeline: { timeline: "" },
      serious: { serious: null },
      revenue: { revenue: "" },
      profit: { profit: "" },
    };
    for (const field of REQUIRED_FIELDS) {
      expect(missingRequired({ ...FULL, ...blank[field] })).toEqual([field]);
    }
  });

  it("the slider only counts once touched, and only 1 to 10", () => {
    expect(missingRequired({ ...FULL, serious: null })).toEqual(["serious"]);
    expect(missingRequired({ ...FULL, serious: 1 })).toEqual([]);
    expect(missingRequired({ ...FULL, serious: 10 })).toEqual([]);
    expect(missingRequired({ ...FULL, serious: 0 })).toEqual(["serious"]);
    expect(missingRequired({ ...FULL, serious: 11 })).toEqual(["serious"]);
    expect(missingRequired({ ...FULL, serious: 5.5 })).toEqual(["serious"]);
  });

  it("a code that is not on the list is not an answer", () => {
    expect(missingRequired({ ...FULL, profit: "1-3" as ProfitCode })).toEqual(["profit"]);
  });

  it("the progress line counts the five", () => {
    expect(answeredCount(EMPTY)).toBe(0);
    expect(answeredCount({ ...EMPTY, url: "x.co.il", serious: 3 })).toBe(2);
    expect(answeredCount(FULL)).toBe(5);
  });
});

describe("the popup and the inline form", () => {
  it("nothing at all", () => expect(contactProblem("", "", "")).toBe("all"));
  it("name missing", () => expect(contactProblem("", "050-1234567", "")).toBe("name"));
  it("name missing comes before a bad email", () => expect(contactProblem("", "", "ben@gmail")).toBe("name"));
  it("both phone and email missing", () => expect(contactProblem("Dana", "", "")).toBe("reach"));
  it("a bad email", () => expect(contactProblem("Dana", "", "dana@gmail")).toBe("emailBad"));
  it("a bad email next to a phone is still a bad email", () =>
    expect(contactProblem("Dana", "050-1234567", "dana@")).toBe("emailBad"));
  it("phone only opens", () => expect(contactProblem("Dana", "050-1234567", "")).toBeNull());
  it("email only opens", () => expect(contactProblem("Dana", "", "dana@carmel.co.il")).toBeNull());
  it("both open", () => expect(contactProblem("Dana", "050-1234567", "dana@carmel.co.il")).toBeNull());
  it("spaces are not an answer", () => expect(contactProblem("  ", "  ", "  ")).toBe("all"));
});

describe("the revenue check (profit middle over revenue middle above 30%, Ben Oct 2)", () => {
  // Middles: revenue 2.5, 7.5, 17.5, 37.5, 50 (open top: its bottom edge).
  //          profit  0.5, 1.75, 3.75, 7.5, 10.
  it("Man Ltd's test is a flag: 3.75 / 7.5 = 50%", () => {
    expect(revenueCheckFails("5-10", "2.5-5")).toBe(true);
  });
  it("Eshet's test is fine: 7.5 / 37.5 = 20%", () => {
    expect(revenueCheckFails("25-50", "5-10")).toBe(false);
  });
  it("flags exactly the pairs above 30%", () => {
    const revenues: RevenueCode[] = ["under-5", "5-10", "10-25", "25-50", "over-50"];
    const profits: ProfitCode[] = ["under-1", "1-2.5", "2.5-5", "5-10", "over-10"];
    const hits: string[] = [];
    for (const r of revenues) for (const p of profits) if (revenueCheckFails(r, p)) hits.push(`${r}|${p}`);
    expect(hits.sort()).toEqual(
      [
        // 1.75/2.5 = 70%, 3.75/2.5, 7.5/2.5, 10/2.5
        "under-5|1-2.5", "under-5|2.5-5", "under-5|5-10", "under-5|over-10",
        // 3.75/7.5 = 50%, 7.5/7.5, 10/7.5   (1.75/7.5 = 23% is fine)
        "5-10|2.5-5", "5-10|5-10", "5-10|over-10",
        // 7.5/17.5 = 43%, 10/17.5 = 57%     (3.75/17.5 = 21% is fine)
        "10-25|5-10", "10-25|over-10",
        // 25 to 50: 10/37.5 = 27% is fine. Over 50: 10/50 = 20% is fine.
      ].sort(),
    );
  });
  it("under ₪1M of profit on under ₪5M of revenue is fine: 0.5 / 2.5 = 20%", () => {
    expect(revenueCheckFails("under-5", "under-1")).toBe(false);
  });
});

describe("the phone check (Israeli numbers only, Ben Oct 2)", () => {
  const good = [
    "050-1234567", // mobile, 10 digits
    "0501234567",
    "050 123 4567",
    "03-1234567", // landline, 9 digits
    "031234567",
    "+972-50-123-4567",
    "+972501234567",
    "+972 3 123 4567", // landline with +972
    "00972501234567",
    "972501234567",
    "+972-050-1234567", // the 0 kept after +972
    "501234567", // the 0 left off
    "(050) 123-4567",
  ];
  const bad = [
    "15678728", // Ben's test row: no Israeli number starts 01
    "2016553553", // a US number
    "050", // too short
    "050-12345678", // 11 digits
    "+1 201 655 3553", // another country
    "050-123-456a", // a letter
    "",
  ];
  for (const n of good) it(`accepts ${n}`, () => expect(looksLikeIsraeliPhone(n)).toBe(true));
  for (const n of bad)
    it(`turns away ${JSON.stringify(n)}`, () => expect(looksLikeIsraeliPhone(n)).toBe(false));
  it("a phone that is not Israeli is its own message, after name and reach", () => {
    expect(contactProblem("Dana", "15678728", "")).toBe("phoneBad");
    expect(contactProblem("", "15678728", "")).toBe("name");
    expect(contactProblem("Dana", "15678728", "dana@gmail")).toBe("phoneBad");
    expect(contactProblem("Dana", "050-1234567", "dana@gmail")).toBe("emailBad");
  });
});
