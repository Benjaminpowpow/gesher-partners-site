// The valuation page's top: the logo with its tagline at every width, and the
// progress strip pinned while the form scrolls (Oct 4). English and Hebrew,
// 320 (Chromium), 390 (WebKit) and 1440 (Chromium). Screenshots of the live
// site (before) and this build (after) side by side, one sheet per check.
//
//   BASE=http://127.0.0.1:4462 SHOTS=/tmp/shots node qa/valuation-header.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, devices, webkit } from "playwright";
import { BASE, SHOTS } from "./lib.mjs";

const LIVE = process.env.LIVE || "https://gesherpartners.com";
mkdirSync(SHOTS, { recursive: true });
const results = [];
const note = (g, name, pass, detail = "") => results.push({ g, name, pass: !!pass, detail });
const shots = { header: [], scrolled: [] };

const SIZES = [
  ["320", chromium, { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
  ["390", webkit, { ...devices["iPhone 14"] }],
  ["1440", chromium, { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }],
];

for (const [label, type, opts] of SIZES) {
  const browser = await type.launch();
  for (const path of ["/valuation", "/he/valuation"]) {
    for (const [side, base] of [["before", LIVE], ["after", BASE]]) {
      const page = await browser.newPage(opts);
      await page.goto(base + path, { waitUntil: "load" });
      await page.waitForSelector(".ve-topbar");
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      const vw = page.viewportSize().width;
      const head = await page.screenshot({ clip: { x: 0, y: 0, width: vw, height: Math.min(150, 900) } });
      shots.header.push({ key: `${label} ${path}`, side, b64: head.toString("base64"), w: vw });
      if (side === "after") {
        const g = `${label} ${path}`;
        // Against the device width: a phone browser widens its own view to fit
        // anything too wide, which would hide the overflow.
        const m = await page.evaluate((vw) => {
          const lh = (el) => parseFloat(getComputedStyle(el).lineHeight) || el.getBoundingClientRect().height;
          const tag = document.querySelector(".ve-topbar .lockup-tag");
          const talk = document.querySelector(".ve-talk span");
          return {
            tagShown: getComputedStyle(tag).display !== "none" && tag.getBoundingClientRect().height > 0,
            tagLines: Math.round(tag.getBoundingClientRect().height / lh(tag)),
            talkLines: Math.round(talk.getBoundingClientRect().height / lh(talk)),
            sideScroll: document.scrollingElement.scrollWidth > vw || window.innerWidth > vw,
          };
        }, vw);
        note(g, "tagline shown, on one line", m.tagShown && m.tagLines === 1, JSON.stringify(m));
        note(g, "Talk to us on one line, no side scroll", m.talkLines === 1 && !m.sideScroll, JSON.stringify(m));
      }
      // Scrolled into the form: the strip stays on top and reads clearly.
      await page.evaluate(() => window.scrollTo({ top: 700, behavior: "instant" }));
      await page.waitForTimeout(300);
      const scrolled = await page.screenshot({ clip: { x: 0, y: 0, width: page.viewportSize().width, height: 260 } });
      shots.scrolled.push({ key: `${label} ${path}`, side, b64: scrolled.toString("base64"), w: page.viewportSize().width });
      if (side === "after") {
        const g = `${label} ${path}`;
        const s = await page.evaluate(() => {
          const wrap = document.querySelector(".ve-progress-wrap").getBoundingClientRect();
          const lab = document.querySelector(".ve-progress-label").getBoundingClientRect();
          const bg = getComputedStyle(document.querySelector(".ve-progress-wrap")).backgroundColor;
          return { top: Math.round(wrap.top), h: Math.round(wrap.height), labelInside: lab.top >= wrap.top - 0.5 && lab.bottom <= wrap.bottom + 0.5, bg };
        });
        note(g, "strip pinned at the top, label inside it, solid back", s.top === 0 && s.labelInside && s.bg !== "rgba(0, 0, 0, 0)" && s.h <= 32, JSON.stringify(s));
      }
      await page.close();
    }
  }
  await browser.close();
}

// One sheet per check: before | after, a row per width and language.
const browser = await chromium.launch();
for (const [name, list] of Object.entries(shots)) {
  const keys = [...new Set(list.map((s) => s.key))];
  const cell = (k, side) => {
    const s = list.find((x) => x.key === k && x.side === side);
    const w = Math.min(s.w, 640);
    return `<td><img style="width:${w}px" src="data:image/png;base64,${s.b64}"></td>`;
  };
  const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
  await page.setContent(`<style>body{margin:0;padding:20px;font:14px -apple-system,Helvetica,sans-serif;color:#16243B;background:#fff}
    th{text-align:left;padding:6px 10px;border-bottom:2px solid #16243B} td{padding:8px 10px;border-bottom:1px solid #ddd;vertical-align:top}
    td.n{font-weight:600;white-space:nowrap} img{display:block;border:1px solid #ccc}</style>
    <h2 style="margin:0 0 12px">Valuation ${name === "header" ? "header" : "page scrolled into the form"}: live today vs this change</h2>
    <table><tr><th></th><th>Live today</th><th>This change</th></tr>
    ${keys.map((k) => `<tr><td class="n">${k}</td>${cell(k, "before")}${cell(k, "after")}</tr>`).join("")}</table>`);
  await page.waitForTimeout(300);
  writeFileSync(`${SHOTS}/valuation-${name}.png`, await page.screenshot({ fullPage: true }));
  await page.close();
}
await browser.close();

for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.g}  ${r.name}${r.pass ? "" : "  " + r.detail}`);
const failed = results.filter((r) => !r.pass).length;
console.log(failed ? `\n${failed} FAIL of ${results.length}` : `\nALL PASS (${results.length} checks)`);
process.exit(failed ? 1 : 0);
