/**
 * The phone menu's hide and show rules (Ben, Oct 4). Pure, so it runs in node.
 * The header is 86px tall on a phone and the page scrolls 4000px.
 */
import { describe, expect, it } from "vitest";
import { nextHidden, type ScrollStep } from "./useHideOnScroll";

const base: ScrollStep = { y: 0, lastY: 0, maxY: 4000, headerHeight: 86, hidden: false, locked: false };
const step = (s: Partial<ScrollStep>) => nextHidden({ ...base, ...s });

describe("the phone menu on scroll", () => {
  it("hides as he scrolls down, past the menu's own height", () => {
    expect(step({ lastY: 300, y: 340 })).toBe(true);
  });

  it("comes back on a small scroll up", () => {
    expect(step({ lastY: 1200, y: 1199, hidden: true })).toBe(false);
    expect(step({ lastY: 1200, y: 1190, hidden: true })).toBe(false);
  });

  it("always shows at the very top, and while the menu is still in its place", () => {
    expect(step({ lastY: 0, y: 0, hidden: true })).toBe(false);
    expect(step({ lastY: 40, y: 80 })).toBe(false);
    expect(step({ lastY: 86, y: 86, hidden: true })).toBe(false);
  });

  it("never hides while the sheet is open or focus is in the menu", () => {
    expect(step({ lastY: 300, y: 600, locked: true })).toBe(false);
    expect(step({ lastY: 300, y: 600, hidden: true, locked: true })).toBe(false);
  });

  it("keeps its state when the page has not moved", () => {
    expect(step({ lastY: 900, y: 900, hidden: true })).toBe(true);
    expect(step({ lastY: 900, y: 900, hidden: false })).toBe(false);
  });

  it("ignores the bounce past the bottom of the page", () => {
    // At the bottom (4000), the rubber band reads 4040 then 4000: not a scroll up.
    expect(step({ lastY: 4040, y: 4000, hidden: true })).toBe(true);
    // And the bounce past the top is the top.
    expect(step({ lastY: 200, y: -30, hidden: true })).toBe(false);
  });

  it("ignores fractions of a pixel", () => {
    expect(step({ lastY: 900.2, y: 900.4, hidden: false })).toBe(false);
    expect(step({ lastY: 900.4, y: 900.2, hidden: true })).toBe(true);
  });
});
