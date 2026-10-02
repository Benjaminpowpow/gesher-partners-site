/**
 * The range math for the valuation estimate (site/35, "The range math").
 *
 * Band edges since Oct 2 (Ben, after the live test). Every expected value
 * below is worked out by hand in the comment above it. The rule, once:
 *
 *   LOW  = bottom of the profit band x the industry's low multiple, rounded DOWN
 *   HIGH = top of the profit band    x the industry's high multiple, rounded UP
 *   steps: 0.5 under 10, 1 from 10 up (millions), picked by the figure before rounding
 *
 * The profit band edges, in millions:
 *   Under ₪1M (priced as 0.5 to 1), ₪1M to 2.5M, ₪2.5M to 5M, ₪5M to 10M.
 *   Over ₪10M has no number.
 */
import { describe, expect, it } from "vitest";
import { PROFIT_BAND, type ProfitCode } from "@shared/valuationEstimate";
import { rangeFigureText } from "../../client/src/pages/valuationCopy";
import { VERTICALS, estimateRange, roundEstimate } from "./valuationMath";

function shown(row: { floor: number; top: number; margin?: number }, profit: ProfitCode): string {
  const r = estimateRange(row, PROFIT_BAND[profit]);
  return r.outcome === "number" ? rangeFigureText(r.lowM, r.highM) : r.outcome;
}

describe("the check table in 35, at 4.2x to 5.04x (Roltag's band)", () => {
  const row = { floor: 4.2, top: 5.04, margin: 0.16 };

  // LOW 0.5 x 4.2 = 2.1, down to 2.  HIGH 1 x 5.04 = 5.04, up to 5.5.
  it("Under ₪1M shows ₪2M to ₪5.5M", () => expect(shown(row, "under-1")).toBe("₪2M to ₪5.5M"));
  // LOW 1 x 4.2 = 4.2, down to 4.  HIGH 2.5 x 5.04 = 12.6, 10 and up, up to 13.
  it("₪1M to 2.5M shows ₪4M to ₪13M", () => expect(shown(row, "1-2.5")).toBe("₪4M to ₪13M"));
  // LOW 2.5 x 4.2 = 10.5, 10 and up, down to 10.  HIGH 5 x 5.04 = 25.2, up to 26.
  it("₪2.5M to 5M shows ₪10M to ₪26M", () => expect(shown(row, "2.5-5")).toBe("₪10M to ₪26M"));
  // LOW 5 x 4.2 = 21.  HIGH 10 x 5.04 = 50.4, up to 51.
  it("₪5M to 10M shows ₪21M to ₪51M", () => expect(shown(row, "5-10")).toBe("₪21M to ₪51M"));
  it("Over ₪10M has no number", () => expect(shown(row, "over-10")).toBe("big"));
});

describe("the live library rows, each industry's own low and high multiple", () => {
  it("parses the rows the tests below rely on", () => {
    expect(VERTICALS.get("industrial-equipment-distribution")).toMatchObject({ floor: 4.8, top: 5.5 });
    expect(VERTICALS.get("manufacturing")).toMatchObject({ floor: 4.2, top: 5.0 });
    expect(VERTICALS.get("vertical-saas-vms")).toMatchObject({ floor: 6.0, top: 7.5 });
    expect(VERTICALS.get("security-services")).toMatchObject({ floor: 2.9, top: 3.4 });
  });

  describe("Man Ltd's industry, distribution, 4.8x to 5.5x", () => {
    const row = VERTICALS.get("industrial-equipment-distribution")!;
    // LOW 0.5 x 4.8 = 2.4, down to 2.  HIGH 1 x 5.5 = 5.5, already a step.
    it("Under ₪1M", () => expect(shown(row, "under-1")).toBe("₪2M to ₪5.5M"));
    // LOW 1 x 4.8 = 4.8, down to 4.5.  HIGH 2.5 x 5.5 = 13.75, up to 14.
    it("₪1M to 2.5M", () => expect(shown(row, "1-2.5")).toBe("₪4.5M to ₪14M"));
    // The live test (Oct 2): LOW 2.5 x 4.8 = 12.  HIGH 5 x 5.5 = 27.5, up to 28.
    it("₪2.5M to 5M is ₪12M to ₪28M (manltd.co.il)", () => expect(shown(row, "2.5-5")).toBe("₪12M to ₪28M"));
    // LOW 5 x 4.8 = 24.  HIGH 10 x 5.5 = 55.
    it("₪5M to 10M", () => expect(shown(row, "5-10")).toBe("₪24M to ₪55M"));
    it("Over ₪10M", () => expect(shown(row, "over-10")).toBe("big"));
  });

  describe("manufacturing (Eshet, Roltag), 4.2x to 5.0x", () => {
    const row = VERTICALS.get("manufacturing")!;
    // LOW 2.1, down to 2.  HIGH 1 x 5 = 5, already a step.
    it("Under ₪1M", () => expect(shown(row, "under-1")).toBe("₪2M to ₪5M"));
    // LOW 4.2, down to 4.  HIGH 2.5 x 5 = 12.5, 10 and up, up to 13.
    it("₪1M to 2.5M", () => expect(shown(row, "1-2.5")).toBe("₪4M to ₪13M"));
    // LOW 10.5, down to 10.  HIGH 5 x 5 = 25.
    it("₪2.5M to 5M", () => expect(shown(row, "2.5-5")).toBe("₪10M to ₪25M"));
    // The live test (Oct 2), eshet.co.il: LOW 5 x 4.2 = 21.  HIGH 10 x 5 = 50.
    it("₪5M to 10M is ₪21M to ₪50M (eshet.co.il)", () => expect(shown(row, "5-10")).toBe("₪21M to ₪50M"));
  });

  describe("vertical SaaS, 6.0x to 7.5x", () => {
    const row = VERTICALS.get("vertical-saas-vms")!;
    // LOW 0.5 x 6 = 3.  HIGH 1 x 7.5 = 7.5.
    it("Under ₪1M", () => expect(shown(row, "under-1")).toBe("₪3M to ₪7.5M"));
    // LOW 1 x 6 = 6.  HIGH 2.5 x 7.5 = 18.75, up to 19.
    it("₪1M to 2.5M", () => expect(shown(row, "1-2.5")).toBe("₪6M to ₪19M"));
    // LOW 2.5 x 6 = 15.  HIGH 5 x 7.5 = 37.5, up to 38.
    it("₪2.5M to 5M", () => expect(shown(row, "2.5-5")).toBe("₪15M to ₪38M"));
    // LOW 5 x 6 = 30.  HIGH 10 x 7.5 = 75.
    it("₪5M to 10M", () => expect(shown(row, "5-10")).toBe("₪30M to ₪75M"));
  });

  describe("security services, 2.9x to 3.4x", () => {
    const row = VERTICALS.get("security-services")!;
    // LOW 0.5 x 2.9 = 1.45, down to 1.  HIGH 1 x 3.4 = 3.4, up to 3.5.
    it("Under ₪1M", () => expect(shown(row, "under-1")).toBe("₪1M to ₪3.5M"));
    // LOW 1 x 2.9 = 2.9, down to 2.5.  HIGH 2.5 x 3.4 = 8.5.
    it("₪1M to 2.5M", () => expect(shown(row, "1-2.5")).toBe("₪2.5M to ₪8.5M"));
    // LOW 2.5 x 2.9 = 7.25, down to 7.  HIGH 5 x 3.4 = 17.
    it("₪2.5M to 5M", () => expect(shown(row, "2.5-5")).toBe("₪7M to ₪17M"));
    // LOW 5 x 2.9 = 14.5, 10 and up, down to 14.  HIGH 10 x 3.4 = 34.
    it("₪5M to 10M", () => expect(shown(row, "5-10")).toBe("₪14M to ₪34M"));
  });

  it("dental and other practices have no profit multiple, so they are priced by hand", () => {
    const row = VERTICALS.get("healthcare-services")!;
    expect(row.margin).toBeUndefined();
    for (const p of ["under-1", "1-2.5", "2.5-5", "5-10", "over-10"] as ProfitCode[]) {
      expect(estimateRange(row, PROFIT_BAND[p]).outcome).toBe("by_hand");
    }
  });
});

describe("rounding, both ways", () => {
  it("down, under 10, to the half million below", () => {
    expect(roundEstimate(2.1, "down")).toBe(2);
    expect(roundEstimate(2.9, "down")).toBe(2.5);
    expect(roundEstimate(9.8, "down")).toBe(9.5);
    expect(roundEstimate(4, "down")).toBe(4); // already a step
  });
  it("up, under 10, to the half million above", () => {
    expect(roundEstimate(2.1, "up")).toBe(2.5);
    expect(roundEstimate(5.04, "up")).toBe(5.5);
    expect(roundEstimate(9.8, "up")).toBe(10);
    expect(roundEstimate(5.5, "up")).toBe(5.5); // already a step
  });
  it("down, 10 and up, to the million below", () => {
    expect(roundEstimate(10.5, "down")).toBe(10);
    expect(roundEstimate(14.5, "down")).toBe(14);
    expect(roundEstimate(21, "down")).toBe(21);
  });
  it("up, 10 and up, to the million above", () => {
    expect(roundEstimate(10.1, "up")).toBe(11);
    expect(roundEstimate(27.5, "up")).toBe(28);
    expect(roundEstimate(50, "up")).toBe(50);
  });
  it("a figure the computer gets slightly wrong still rounds as the arithmetic says", () => {
    // 2.5 x 4.4 is 11 exactly; a computer gives 11.000000000000002, which a
    // plain round-up would turn into 12.
    expect(roundEstimate(2.5 * 4.4, "up")).toBe(11);
    expect(roundEstimate(0.1 * 3 * 10, "down")).toBe(3); // 3.0000000000000004
  });
  it("prints one decimal only when there is one", () => {
    expect(rangeFigureText(12, 28)).toBe("₪12M to ₪28M");
    expect(rangeFigureText(2, 5.5)).toBe("₪2M to ₪5.5M");
  });
});

describe("no randomness", () => {
  it("the same row and band give the same range every time", () => {
    const row = VERTICALS.get("it-services")!;
    const first = estimateRange(row, PROFIT_BAND["2.5-5"]);
    for (let i = 0; i < 50; i++) expect(estimateRange(row, PROFIT_BAND["2.5-5"])).toEqual(first);
  });
});
