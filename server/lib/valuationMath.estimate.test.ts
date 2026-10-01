/**
 * The range math for the valuation estimate (site/35, "The range math").
 *
 * Every expected value below is worked out by hand in the comment above it,
 * so a failure here says which multiplication moved, not just that a number
 * changed. The rule, once:
 *
 *   LOW  = (band low + 1/4 of the band) x floor
 *   HIGH = (band low + 3/4 of the band) x top
 *   round: under 10 to the nearest 0.5, 10 and up to the nearest 1 (millions)
 *
 * The four points of the profit bands, in millions:
 *   Under ₪1M (priced as 0.5 to 1):  0.5 + 0.125 = 0.625,  0.5 + 0.375 = 0.875
 *   ₪1M to 2.5M (width 1.5):         1 + 0.375 = 1.375,    1 + 1.125 = 2.125
 *   ₪2.5M to 5M (width 2.5):         2.5 + 0.625 = 3.125,  2.5 + 1.875 = 4.375
 *   ₪5M to 10M (width 5):            5 + 1.25 = 6.25,      5 + 3.75 = 8.75
 */
import { describe, expect, it } from "vitest";
import { PROFIT_BAND, type ProfitCode } from "@shared/valuationEstimate";
import { rangeFigureText } from "../../client/src/pages/valuationCopy";
import { VERTICALS, estimateRange, roundEstimate } from "./valuationMath";

function shown(row: { floor: number; top: number; margin?: number }, profit: ProfitCode): string {
  const r = estimateRange(row, PROFIT_BAND[profit]);
  return r.outcome === "number" ? rangeFigureText(r.lowM, r.highM) : r.outcome;
}

describe("the check table in 35, at a 4.2x floor and a 5.04x top (4.2 x 1.2)", () => {
  const row = { floor: 4.2, top: 5.04, margin: 0.16 };

  // LOW 0.625 x 4.2 = 2.625 -> 2.5.  HIGH 0.875 x 5.04 = 4.41 -> 4.5.
  it("Under ₪1M shows ₪2.5M to ₪4.5M", () => expect(shown(row, "under-1")).toBe("₪2.5M to ₪4.5M"));
  // LOW 1.375 x 4.2 = 5.775 -> 6.  HIGH 2.125 x 5.04 = 10.71 -> 11 (10 and up, whole millions).
  it("₪1M to 2.5M shows ₪6M to ₪11M", () => expect(shown(row, "1-2.5")).toBe("₪6M to ₪11M"));
  // LOW 3.125 x 4.2 = 13.125 -> 13.  HIGH 4.375 x 5.04 = 22.05 -> 22.
  it("₪2.5M to 5M shows ₪13M to ₪22M", () => expect(shown(row, "2.5-5")).toBe("₪13M to ₪22M"));
  // LOW 6.25 x 4.2 = 26.25 -> 26.  HIGH 8.75 x 5.04 = 44.1 -> 44.
  it("₪5M to 10M shows ₪26M to ₪44M", () => expect(shown(row, "5-10")).toBe("₪26M to ₪44M"));
  it("Over ₪10M has no number", () => expect(shown(row, "over-10")).toBe("big"));

  it("35's worked example: LOW ₪1.375M x 4.2, HIGH ₪2.125M x 5.04", () => {
    const r = estimateRange(row, PROFIT_BAND["1-2.5"]);
    expect(r).toMatchObject({ outcome: "number", lowM: 6, highM: 11, floor: 4.2, top: 5.04 });
  });
});

describe("the live library rows, each industry's own floor and top", () => {
  it("parses the rows the tests below rely on", () => {
    expect(VERTICALS.get("manufacturing")).toMatchObject({ floor: 4.2, top: 5.0 });
    expect(VERTICALS.get("vertical-saas-vms")).toMatchObject({ floor: 6.0, top: 7.5 });
    expect(VERTICALS.get("security-services")).toMatchObject({ floor: 2.9, top: 3.4 });
    expect(VERTICALS.get("backup-software")).toMatchObject({ floor: 5.0, top: 7.0 });
  });

  describe("manufacturing (Roltag's band), 4.2x to 5.0x: the same check table", () => {
    const row = VERTICALS.get("manufacturing")!;
    // HIGH 0.875 x 5.0 = 4.375 -> 4.5.
    it("Under ₪1M", () => expect(shown(row, "under-1")).toBe("₪2.5M to ₪4.5M"));
    // HIGH 2.125 x 5.0 = 10.625 -> 11.
    it("₪1M to 2.5M", () => expect(shown(row, "1-2.5")).toBe("₪6M to ₪11M"));
    // HIGH 4.375 x 5.0 = 21.875 -> 22.
    it("₪2.5M to 5M", () => expect(shown(row, "2.5-5")).toBe("₪13M to ₪22M"));
    // HIGH 8.75 x 5.0 = 43.75 -> 44.
    it("₪5M to 10M", () => expect(shown(row, "5-10")).toBe("₪26M to ₪44M"));
    it("Over ₪10M", () => expect(shown(row, "over-10")).toBe("big"));
  });

  describe("vertical SaaS, 6.0x to 7.5x", () => {
    const row = VERTICALS.get("vertical-saas-vms")!;
    // LOW 0.625 x 6 = 3.75 -> 4.  HIGH 0.875 x 7.5 = 6.5625 -> 6.5.
    it("Under ₪1M", () => expect(shown(row, "under-1")).toBe("₪4M to ₪6.5M"));
    // LOW 1.375 x 6 = 8.25 -> 8.5.  HIGH 2.125 x 7.5 = 15.9375 -> 16.
    it("₪1M to 2.5M", () => expect(shown(row, "1-2.5")).toBe("₪8.5M to ₪16M"));
    // LOW 3.125 x 6 = 18.75 -> 19.  HIGH 4.375 x 7.5 = 32.8125 -> 33.
    it("₪2.5M to 5M", () => expect(shown(row, "2.5-5")).toBe("₪19M to ₪33M"));
    // LOW 6.25 x 6 = 37.5 -> 38.  HIGH 8.75 x 7.5 = 65.625 -> 66.
    it("₪5M to 10M", () => expect(shown(row, "5-10")).toBe("₪38M to ₪66M"));
    it("Over ₪10M", () => expect(shown(row, "over-10")).toBe("big"));
  });

  describe("security services, 2.9x to 3.4x", () => {
    const row = VERTICALS.get("security-services")!;
    // LOW 0.625 x 2.9 = 1.8125 -> 2.  HIGH 0.875 x 3.4 = 2.975 -> 3.
    it("Under ₪1M", () => expect(shown(row, "under-1")).toBe("₪2M to ₪3M"));
    // LOW 1.375 x 2.9 = 3.9875 -> 4.  HIGH 2.125 x 3.4 = 7.225 -> 7.
    it("₪1M to 2.5M", () => expect(shown(row, "1-2.5")).toBe("₪4M to ₪7M"));
    // LOW 3.125 x 2.9 = 9.0625 -> 9 (under 10, half millions).  HIGH 4.375 x 3.4 = 14.875 -> 15.
    it("₪2.5M to 5M", () => expect(shown(row, "2.5-5")).toBe("₪9M to ₪15M"));
    // LOW 6.25 x 2.9 = 18.125 -> 18.  HIGH 8.75 x 3.4 = 29.75 -> 30.
    it("₪5M to 10M", () => expect(shown(row, "5-10")).toBe("₪18M to ₪30M"));
    it("Over ₪10M", () => expect(shown(row, "over-10")).toBe("big"));
  });

  describe("a backup row, software, 5.0x to 7.0x", () => {
    const row = VERTICALS.get("backup-software")!;
    // LOW 1.375 x 5 = 6.875 -> 7.  HIGH 2.125 x 7 = 14.875 -> 15.
    it("₪1M to 2.5M", () => expect(shown(row, "1-2.5")).toBe("₪7M to ₪15M"));
  });

  it("dental and other practices have no profit multiple, so they are priced by hand", () => {
    const row = VERTICALS.get("healthcare-services")!;
    expect(row.margin).toBeUndefined();
    for (const p of ["under-1", "1-2.5", "2.5-5", "5-10", "over-10"] as ProfitCode[]) {
      expect(estimateRange(row, PROFIT_BAND[p]).outcome).toBe("by_hand");
    }
  });
});

describe("rounding", () => {
  it("under 10, to the nearest half million", () => {
    expect(roundEstimate(2.625)).toBe(2.5); // 5.25 halves -> 5 -> 2.5
    expect(roundEstimate(2.75)).toBe(3); // 5.5 halves -> 6 -> 3 (a half rounds up)
    expect(roundEstimate(9.74)).toBe(9.5); // 19.48 -> 19 -> 9.5
    expect(roundEstimate(9.76)).toBe(10); // 19.52 -> 20 -> 10
  });
  it("10 and up, to the nearest million", () => {
    expect(roundEstimate(10.49)).toBe(10);
    expect(roundEstimate(10.5)).toBe(11);
    expect(roundEstimate(44.1)).toBe(44);
  });
  it("prints one decimal only when there is one", () => {
    expect(rangeFigureText(6, 11)).toBe("₪6M to ₪11M");
    expect(rangeFigureText(2.5, 4.5)).toBe("₪2.5M to ₪4.5M");
  });
});

describe("no randomness", () => {
  it("the same row and band give the same range every time", () => {
    const row = VERTICALS.get("it-services")!;
    const first = estimateRange(row, PROFIT_BAND["2.5-5"]);
    for (let i = 0; i < 50; i++) expect(estimateRange(row, PROFIT_BAND["2.5-5"])).toEqual(first);
  });
});
