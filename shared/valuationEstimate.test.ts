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

describe("the revenue check (only impossible pairs, Ben Oct 1)", () => {
  const flagged: [RevenueCode, ProfitCode][] = [
    ["under-5", "5-10"],
    ["under-5", "over-10"],
    ["5-10", "over-10"],
  ];
  it("flags exactly the three impossible pairs", () => {
    const revenues: RevenueCode[] = ["under-5", "5-10", "10-25", "25-50", "over-50"];
    const profits: ProfitCode[] = ["under-1", "1-2.5", "2.5-5", "5-10", "over-10"];
    const hits: string[] = [];
    for (const r of revenues) for (const p of profits) if (revenueCheckFails(r, p)) hits.push(`${r}|${p}`);
    expect(hits.sort()).toEqual(flagged.map(([r, p]) => `${r}|${p}`).sort());
  });
});
