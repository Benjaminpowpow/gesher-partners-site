// Shared helpers for the qa/ Playwright checks. Test harness only, never
// shipped. See qa/README.md for how to run them.
import { tmpdir } from "node:os";
import { chromium, webkit } from "playwright";

export const BASE = process.env.BASE || "http://127.0.0.1:4460";
export const BROWSERS = { chromium, webkit };
export const SHOTS = process.env.SHOTS || `${tmpdir()}/gesher-qa-shots`;

/** Fill the valuation front door. profit "over-10" gives the no-number case. */
export async function fillFront(page, { url = "manltd.co.il", profit = "2.5-5" } = {}) {
  await page.fill("#ve-url", url);
  await page.selectOption("#ve-timeline", "within-1y");
  await page.locator(".ve-ticks button", { hasText: /^8$/ }).click();
  await page.selectOption("#ve-revenue", "5-10");
  await page.selectOption("#ve-profit", profit);
  await page.selectOption("#ve-staff", "11-50");
}

export async function settle(page, ms = 300) {
  await page.waitForTimeout(ms);
  await page.evaluate(() => document.fonts && document.fonts.ready);
}

/**
 * English left on a Hebrew screen: every visible text run with Latin letters,
 * plus the words a screen reader says (aria-label, aria-valuetext,
 * placeholder, alt, title). `allow` holds what may stay Latin: company names,
 * web and mail addresses, the EN toggle, the logo.
 */
export async function englishLeft(page, allow) {
  return page.evaluate((allow) => {
    const out = [];
    const ok = (s) => {
      let t = s;
      for (const a of allow) t = t.split(a).join(" ");
      return !/[A-Za-z]{2,}/.test(t);
    };
    const shown = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const s = n.nodeValue.trim();
      if (!s || !n.parentElement || !shown(n.parentElement)) continue;
      if (n.parentElement.closest("script, style, svg")) continue;
      if (!ok(s)) out.push(`text: "${s.slice(0, 60)}"`);
    }
    for (const el of document.querySelectorAll("[aria-label], [aria-valuetext], [placeholder], [alt], [title]")) {
      for (const attr of ["aria-label", "aria-valuetext", "placeholder", "alt", "title"]) {
        const v = el.getAttribute(attr);
        if (v && !ok(v)) out.push(`${attr}: "${v.slice(0, 60)}"`);
      }
    }
    return Array.from(new Set(out));
  }, allow);
}

/** Side scroll, and text cut off by its box or pushed off the screen. */
export async function layoutChecks(page) {
  const vw = page.viewportSize().width;
  return page.evaluate((vw) => {
    const out = { sideScroll: false, clipped: [] };
    out.sideScroll = document.scrollingElement.scrollWidth > vw + 1;
    const shown = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && !el.closest("[inert]");
    };
    for (const el of document.querySelectorAll("body *")) {
      if (!shown(el) || el.closest("svg")) continue;
      const cs = getComputedStyle(el);
      if ((cs.overflowX === "hidden" || cs.overflowX === "clip" || cs.textOverflow === "ellipsis") && el.scrollWidth > el.clientWidth + 1 && el.textContent.trim()) {
        out.clipped.push(`${el.tagName.toLowerCase()}.${el.className}`);
      }
      const r = el.getBoundingClientRect();
      if ((r.right > vw + 1 || r.left < -1) && cs.position !== "fixed" && el.textContent.trim()) {
        out.clipped.push(`off-screen ${el.tagName.toLowerCase()}.${el.className}`);
      }
    }
    out.clipped = Array.from(new Set(out.clipped)).slice(0, 10);
    return out;
  }, vw);
}
