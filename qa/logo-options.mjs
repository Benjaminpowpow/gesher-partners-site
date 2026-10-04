// The logo, today against two options, side by side: the nav, the phone menu
// sheet, the footer, the valuation header and /he/, at 390 and 1440. Each
// option only sets the two numbers the lockup reads (--mark-scale, --mark-gap),
// so what it shows is exactly what the CSS change would ship.
//
//   BASE=http://127.0.0.1:4462 SHOTS=/tmp/shots node qa/logo-options.mjs
// Writes logo-phone.png and logo-desktop.png to $SHOTS.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { BASE, SHOTS } from "./lib.mjs";
import { chromium } from "playwright";

mkdirSync(SHOTS, { recursive: true });

// home/legal gap, valuation gap. Today: 12 and 10, scale 1.
const OPTIONS = [
  { key: "today", label: "Today", scale: 1, home: 12, val: 10 },
  { key: "a", label: "Option A: mark +12%, gap 8", scale: 1.12, home: 8, val: 7 },
  { key: "b", label: "Option B: mark +22%, gap 5", scale: 1.22, home: 5, val: 4 },
];

const css = (o) => `.gesher, .ve { --mark-scale: ${o.scale}; } .gesher { --mark-gap: ${o.home}px; } .ve { --mark-gap: ${o.val}px; }`;

async function clipOf(page, selector, pad = 14) {
  const box = await page.locator(selector).first().boundingBox();
  return { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.width + pad * 2, height: box.height + pad * 2 };
}

async function shoot(width) {
  const phone = width < 900;
  const browser = await chromium.launch();
  const rows = {};
  for (const o of OPTIONS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const take = async (name, selector) => {
      await page.addStyleTag({ content: css(o) });
      await page.waitForTimeout(150);
      const buf = await page.screenshot({ clip: await clipOf(page, selector) });
      (rows[name] ||= {})[o.key] = buf.toString("base64");
    };
    await page.goto(`${BASE}/`);
    await page.evaluate(() => document.fonts.ready);
    await take("Nav", ".nav > .nav-lockup");
    if (phone) {
      await page.click(".nav-toggle");
      await page.waitForSelector(".nav-sheet-bar");
      await take("Menu sheet", ".nav-sheet-bar .nav-lockup");
      await page.keyboard.press("Escape");
    }
    await page.locator("footer .lockup").first().scrollIntoViewIfNeeded();
    await take("Footer", "footer .lockup");
    await page.goto(`${BASE}/privacy`);
    await page.evaluate(() => document.fonts.ready);
    await take("Privacy page nav", ".nav > .nav-lockup");
    await page.goto(`${BASE}/valuation`);
    await page.evaluate(() => document.fonts.ready);
    await take("Valuation header", ".ve-topbar .brand");
    await page.goto(`${BASE}/he/`);
    await page.evaluate(() => document.fonts.ready);
    await take("/he/ nav", ".nav-lockup");
    await ctx.close();
  }
  // One sheet: a row per place, a column per option.
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
  const head = OPTIONS.map((o) => `<th>${o.label}</th>`).join("");
  const body = Object.entries(rows)
    .map(([name, by]) => `<tr><td class="n">${name}</td>${OPTIONS.map((o) => `<td><img src="data:image/png;base64,${by[o.key]}"></td>`).join("")}</tr>`)
    .join("");
  await page.setContent(`<style>
    body{margin:0;padding:24px;background:#fff;font:15px/1.4 -apple-system,Helvetica,sans-serif;color:#16243B}
    h1{font-size:18px;margin:0 0 16px} table{border-collapse:collapse}
    th{text-align:left;padding:8px 12px;border-bottom:2px solid #16243B;font-weight:600}
    td{padding:10px 12px;border-bottom:1px solid #ddd;vertical-align:middle}
    td.n{font-weight:600;white-space:nowrap} img{display:block;zoom:0.5;outline:1px dashed #ccc}
  </style><h1>Logo at ${width}px wide (${phone ? "phone" : "desktop"})</h1><table><tr><th></th>${head}</tr>${body}</table>`);
  await page.waitForTimeout(300);
  const out = `${SHOTS}/logo-${phone ? "phone" : "desktop"}.png`;
  writeFileSync(out, await page.screenshot({ fullPage: true }));
  await browser.close();
  return out;
}

console.log(await shoot(390));
console.log(await shoot(1440));
