// English /valuation must not change. Runs the same English flow against
// main and against the branch, both on qa/mock-anthropic.mjs, then compares
// each screen pixel for pixel. Phone: WebKit at 390. Desktop: Chromium at
// 1440. The two sides can run one after the other on the same port:
//
//   BASE=<main server>   SHOTS=/tmp/shots node qa/valuation-en-same.mjs shoot main
//   BASE=<branch server> SHOTS=/tmp/shots node qa/valuation-en-same.mjs shoot branch
//   SHOTS=/tmp/shots node qa/valuation-en-same.mjs compare
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { BASE, BROWSERS, SHOTS, fillFront, settle } from "./lib.mjs";

const [mode, side] = process.argv.slice(2);
mkdirSync(SHOTS, { recursive: true });

const CONFIGS = [
  { name: "webkit-390", browser: "webkit", ctx: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
  { name: "chromium-1440", browser: "chromium", ctx: { viewport: { width: 1440, height: 900 } } },
];

let ipNo = Math.floor(Math.random() * 200);

/** The English screens, in order, as PNG buffers keyed by screen name. */
async function walk(browser, cfg, base, tag) {
  const shots = {};
  const shot = async (page, name) => {
    await settle(page, 500);
    // The caret blinks; park focus so it never lands in a screenshot.
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    shots[name] = await page.screenshot({ path: `${SHOTS}/en-${cfg.name}-${name}-${tag}.png`, fullPage: true, animations: "disabled", caret: "hide" });
  };
  const ctx = await browser.newContext({ ...cfg.ctx, extraHTTPHeaders: { "X-Forwarded-For": `10.8.${++ipNo}.1` } });
  let page = await ctx.newPage();
  await page.goto(`${base}/valuation`);
  await shot(page, "1-front");
  await page.click(".ve-main button[type=submit]");
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, "2-front-errors");
  await fillFront(page, { url: "manltd.co.il" });
  await page.click(".ve-main button[type=submit]");
  await page.waitForSelector(".ve-gate", { timeout: 60000 });
  await shot(page, "3-locked-popup");
  await page.fill("#ve-g-name", "Ben");
  await page.fill("#ve-g-phone", "050-1234567");
  await page.click(".ve-gate button[type=submit]");
  await page.waitForSelector(".ve-gate", { state: "detached" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, "4-open-result");
  await ctx.close();
  // A second visitor: one visitor gets one fresh run a minute.
  const ctx2 = await browser.newContext({ ...cfg.ctx, extraHTTPHeaders: { "X-Forwarded-For": `10.8.${++ipNo}.1` } });
  page = await ctx2.newPage();
  await page.goto(`${base}/valuation`);
  await fillFront(page, { url: "roltag.co.il/holding" });
  await page.click(".ve-main button[type=submit]");
  await page.waitForSelector(".ve-byhand-lead", { timeout: 60000 });
  await shot(page, "5-by-hand");
  const head = await page.evaluate(() => ({ title: document.title, lang: document.documentElement.lang, dir: document.documentElement.dir }));
  await ctx2.close();
  return { shots, head };
}

if (mode === "shoot") {
  const heads = {};
  for (const cfg of CONFIGS) {
    const browser = await BROWSERS[cfg.browser].launch();
    heads[cfg.name] = (await walk(browser, cfg, BASE, side)).head;
    await browser.close();
  }
  writeFileSync(`${SHOTS}/en-head-${side}.json`, JSON.stringify(heads));
  console.log(`shot ${side}`);
  process.exit(0);
}

const results = [];
const SCREENS = ["1-front", "2-front-errors", "3-locked-popup", "4-open-result", "5-by-hand"];
for (const cfg of CONFIGS) {
  for (const name of SCREENS) {
    const a = readFileSync(`${SHOTS}/en-${cfg.name}-${name}-main.png`);
    const b = readFileSync(`${SHOTS}/en-${cfg.name}-${name}-branch.png`);
    results.push({ cfg: cfg.name, name, same: Buffer.compare(a, b) === 0 });
  }
}
const ha = readFileSync(`${SHOTS}/en-head-main.json`, "utf8");
const hb = readFileSync(`${SHOTS}/en-head-branch.json`, "utf8");
results.push({ cfg: "both", name: "title, lang, dir", same: ha === hb });
for (const r of results) console.log(`${r.same ? "PASS" : "FAIL"}  ${r.cfg}  ${r.name}${r.same ? "" : "  differs from main"}`);
const failed = results.filter((r) => !r.same).length;
console.log(failed ? `\n${failed} FAIL` : `\nALL PASS (${results.length} checks)`);
process.exit(failed ? 1 : 0);
