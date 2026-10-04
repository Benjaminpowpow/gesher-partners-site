// The logo, live site against this build, side by side: nav, phone menu
// sheet, footer, valuation header, and the same on the Hebrew pages, at 390
// and 1440. One sheet per width.
//
//   BASE=http://127.0.0.1:4462 SHOTS=/tmp/shots node qa/logo-shots.mjs
// Writes logo-390.png and logo-1440.png to $SHOTS.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { BASE, SHOTS } from "./lib.mjs";

const LIVE = process.env.LIVE || "https://gesherpartners.com";
mkdirSync(SHOTS, { recursive: true });
const SOURCES = [
  { key: "live", label: "Live today", base: LIVE },
  { key: "new", label: "This change", base: BASE },
];

async function clip(page, selector, pad = 14) {
  const box = await page.locator(selector).first().boundingBox();
  return { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.width + pad * 2, height: box.height + pad * 2 };
}

async function sheet(width) {
  const phone = width < 900;
  const browser = await chromium.launch();
  const rows = {};
  for (const src of SOURCES) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
    const take = async (name, selector) => {
      await page.waitForTimeout(200);
      (rows[name] ||= {})[src.key] = (await page.screenshot({ clip: await clip(page, selector) })).toString("base64");
    };
    for (const [prefix, home, tool] of [["", "/", "/valuation"], ["Hebrew ", "/he/", "/he/valuation"]]) {
      await page.goto(src.base + home, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      await take(`${prefix}nav`, ".nav > .nav-lockup");
      if (phone) {
        await page.click(".nav-toggle");
        await page.waitForSelector(".nav-sheet .nav-lockup, .nav-menu .nav-lockup, .nav-menu-bar a");
        await take(`${prefix}menu sheet`, ".nav-sheet-bar .nav-lockup, .nav-menu-bar a");
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      }
      await page.locator("footer .lockup").first().scrollIntoViewIfNeeded();
      await take(`${prefix}footer`, "footer .lockup");
      await page.goto(src.base + tool, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      await take(`${prefix}valuation header`, ".ve-topbar .brand");
    }
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
  const head = SOURCES.map((s) => `<th>${s.label}</th>`).join("");
  const body = Object.entries(rows)
    .map(([name, by]) => `<tr><td class="n">${name}</td>${SOURCES.map((s) => `<td><img src="data:image/png;base64,${by[s.key]}"></td>`).join("")}</tr>`)
    .join("");
  await page.setContent(`<style>
    body{margin:0;padding:24px;background:#fff;font:15px/1.4 -apple-system,Helvetica,sans-serif;color:#16243B}
    h1{font-size:18px;margin:0 0 16px} table{border-collapse:collapse}
    th{text-align:left;padding:8px 12px;border-bottom:2px solid #16243B;font-weight:600}
    td{padding:10px 12px;border-bottom:1px solid #ddd;vertical-align:middle}
    td.n{font-weight:600;white-space:nowrap} img{display:block;zoom:0.5;outline:1px dashed #ccc}
  </style><h1>Logo at ${width}px wide</h1><table><tr><th></th>${head}</tr>${body}</table>`);
  await page.waitForTimeout(300);
  const out = `${SHOTS}/logo-${width}.png`;
  writeFileSync(out, await page.screenshot({ fullPage: true }));
  await browser.close();
  return out;
}

console.log(await sheet(390));
console.log(await sheet(1440));
