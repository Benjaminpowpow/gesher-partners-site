// /he/valuation end to end, right to left, against the real server with the
// engine stood in by qa/mock-anthropic.mjs (sites are read for real).
// Phone: WebKit at 390. Desktop: Chromium at 1440. Every screen: no English
// left (allowed: company name, addresses, EN, the logo), no side scroll, no
// cut-off text, opens at the top. Screenshots go to $SHOTS.
//
//   BASE=http://127.0.0.1:4460 SHOTS=/tmp/shots node qa/valuation-he.mjs
import { mkdirSync } from "node:fs";
import { BASE, BROWSERS, SHOTS, englishLeft, fillFront, layoutChecks, settle } from "./lib.mjs";

mkdirSync(SHOTS, { recursive: true });

// Hebrew a test can expect, from site/39 (row 60 with Man Ltd's numbers).
const RANGE_HE = "12 עד 28 מיליון ש״ח";

const CONFIGS = [
  {
    name: "webkit-390",
    browser: "webkit",
    ctx: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
    priced: "manltd.co.il",
    byHand: "roltag.co.il",
  },
  {
    name: "chromium-1440",
    browser: "chromium",
    ctx: { viewport: { width: 1440, height: 900 } },
    priced: "eshet.co.il",
    byHand: "civileng.co.il",
  },
];

const results = [];
let ipNo = Math.floor(Math.random() * 200);
const nextIp = () => `10.9.${++ipNo}.1`;

function capital(domain) {
  const base = domain.split(".")[0];
  return base.charAt(0).toUpperCase() + base.slice(1);
}

async function check(page, cfg, screen, allow) {
  await settle(page);
  // Allowed Latin: the company and its initials, addresses, the EN toggle,
  // the logo lockup and its tagline (Ben: logos and the tagline stay), the
  // web-address placeholder (39 row 7). "Notifications alt+T" is the site-wide
  // toaster's screen-reader label (sonner), on every page: reported apart.
  const english = await englishLeft(page, [
    "Man Ltd", "ML", "EN", "gesher", "Your sell-side advisor", "office@gesherpartners.com", "yourcompany.co.il",
    "Notifications alt+T", ...allow,
  ]);
  const layout = await layoutChecks(page);
  const top = await page.evaluate(() => Math.round(window.scrollY));
  const dir = await page.evaluate(() => document.documentElement.dir + "/" + document.querySelector(".ve")?.getAttribute("dir"));
  await page.screenshot({ path: `${SHOTS}/he-${cfg.name}-${screen}.png`, fullPage: true });
  const problems = [];
  if (english.length) problems.push(`English: ${english.join(" | ")}`);
  if (layout.sideScroll) problems.push("side scroll");
  if (layout.clipped.length) problems.push(`clipped: ${layout.clipped.join(", ")}`);
  if (dir !== "rtl/rtl") problems.push(`dir ${dir}`);
  results.push({ config: cfg.name, screen, pass: problems.length === 0, problems, scrollY: top });
  return { top };
}

function note(cfg, screen, pass, problem) {
  results.push({ config: cfg.name, screen, pass, problems: pass ? [] : [problem] });
}

async function newPage(browser, cfg, ip) {
  const ctx = await browser.newContext({ ...cfg.ctx, extraHTTPHeaders: { "X-Forwarded-For": ip } });
  const page = await ctx.newPage();
  // The talk popup posts to /api/contact, which needs mail keys this box has
  // not got. Answer it like the live server does when the mail goes out.
  await page.route("**/api/contact", (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"success":true}' }));
  return { ctx, page };
}

for (const cfg of CONFIGS) {
  const browser = await BROWSERS[cfg.browser].launch();
  const allowPriced = [cfg.priced, capital(cfg.priced)];

  // ── The priced run: front door, errors, working, popup, result, thanks ──
  {
    const { ctx, page } = await newPage(browser, cfg, nextIp());
    await page.goto(`${BASE}/he/valuation`);
    const title = await page.title();
    note(cfg, "head title", title.startsWith("הערכת שווי עסק"), `title "${title}"`);
    await check(page, cfg, "1-front", []);

    // The talk popup from the top bar, before any run: empty, so it asks.
    await page.click(".ve-talk");
    await page.waitForSelector(".ve-modal");
    await page.click(".ve-modal button[type=submit]");
    await page.waitForTimeout(300);
    await check(page, cfg, "1b-talk-popup-error", []);
    await page.fill("#ve-t-name", "Ben");
    await page.fill("#ve-t-reach", "050-1234567");
    await page.click(".ve-modal button[type=submit]");
    await page.waitForSelector(".ve-modal .ve-btn.block:not([type=submit])");
    await page.waitForTimeout(400);
    await check(page, cfg, "1c-talk-sent", ["Ben"]);
    await page.click(".ve-modal .ve-btn.block");
    await page.waitForSelector(".ve-modal", { state: "detached" });

    await page.click(".ve-main button[type=submit]");
    await page.waitForTimeout(600);
    const errs = await page.locator(".ve-q-err:visible").count();
    note(cfg, "front errors show", errs >= 5, `${errs} red lines`);
    await check(page, cfg, "2-front-errors", []);

    // Hold the run four seconds so the working screen can be seen, even
    // when the server already has this site cached from an earlier pass.
    await page.route("**/api/valuation/estimate", async (r) => {
      await new Promise((ok) => setTimeout(ok, 4000));
      await r.continue();
    });
    await fillFront(page, { url: cfg.priced });
    await page.click(".ve-main button[type=submit]");
    await page.waitForSelector("#ve-h-working");
    await page.waitForTimeout(1500);
    const w = await check(page, cfg, "3-working", allowPriced);
    note(cfg, "working opens at top", w.top === 0, `scrollY ${w.top}`);

    await page.waitForSelector(".ve-gate", { timeout: 60000 });
    const r = await check(page, cfg, "4-locked-popup", allowPriced);
    note(cfg, "result opens at top", r.top === 0, `scrollY ${r.top}`);
    const leak = await page.content();
    note(cfg, "range not on the page while locked", !leak.includes(RANGE_HE) && !leak.includes("₪12M"), "range found while locked");

    await page.click(".ve-gate button[type=submit]");
    await page.waitForTimeout(300);
    const errAll = await page.locator(".ve-gate-err").innerText();
    await check(page, cfg, "5-popup-error-empty", allowPriced);
    await page.fill("#ve-g-name", "Ben");
    await page.fill("#ve-g-phone", "123");
    await page.click(".ve-gate button[type=submit]");
    await page.waitForTimeout(300);
    const errPhone = await page.locator(".ve-gate-err").innerText();
    await check(page, cfg, "6-popup-error-phone", allowPriced.concat(["Ben"]));
    note(cfg, "popup errors differ (all, then phone)", errAll && errPhone && errAll !== errPhone, `${errAll} / ${errPhone}`);

    await page.fill("#ve-g-phone", "050-1234567");
    await page.click(".ve-gate button[type=submit]");
    await page.waitForSelector(".ve-gate", { state: "detached" });
    const fig = (await page.locator(".ve-range-fig").innerText()).trim();
    note(cfg, "range in the Hebrew shape", fig === RANGE_HE, `figure "${fig}"`);
    await check(page, cfg, "7-open-result", allowPriced);

    await page.locator(".ve-cta-act button").first().click();
    await page.waitForSelector(".ve-call-done");
    await check(page, cfg, "8-thank-you", allowPriced);

    await ctx.close();
  }

  // ── By hand, then the server saying no (same visitor, a minute apart) ──
  {
    const ip = nextIp();
    const { ctx, page } = await newPage(browser, cfg, ip);
    await page.goto(`${BASE}/he/valuation`);
    await fillFront(page, { url: `${cfg.byHand}/holding` });
    await page.click(".ve-main button[type=submit]");
    await page.waitForSelector(".ve-byhand-lead", { timeout: 60000 });
    const allow = [cfg.byHand, capital(cfg.byHand)];
    await check(page, cfg, "11-by-hand", allow);
    await page.fill("#ve-i-name", "Ben");
    await page.fill("#ve-i-phone", "050-1234567");
    await page.locator(".ve-cta-act button").first().click();
    await page.waitForSelector(".ve-call-done");
    await check(page, cfg, "12-by-hand-thank-you", allow.concat(["Ben"]));

    await ctx.close();
  }

  // ── A site that does not exist, then the same visitor again at once ──
  // A made-up domain still counts as a run, so the second try inside the
  // minute is refused before anything is read.
  {
    const { ctx, page } = await newPage(browser, cfg, nextIp());
    const fake = (n) => `no-such-site-${Date.now()}-${n}.co.il`;
    await page.goto(`${BASE}/he/valuation`);
    await fillFront(page, { url: fake(1) });
    await page.click(".ve-main button[type=submit]");
    await page.waitForSelector("#ve-h-error", { timeout: 30000 });
    await check(page, cfg, "13-could-not-read", []);
    const unreadable = await page.locator("#ve-h-error").innerText();
    await page.evaluate((h) => sessionStorage.setItem("qa-first-heading", h), unreadable);
    await page.locator(".ve-error-actions .ve-btn-outline").click();
    await page.waitForSelector("#ve-url");
    await page.fill("#ve-url", fake(2));
    await page.click(".ve-main button[type=submit]");
    await page.waitForSelector("#ve-h-error", { timeout: 30000 });
    const first = await page.evaluate(() => sessionStorage.getItem("qa-first-heading"));
    const heading = await page.locator("#ve-h-error").innerText();
    await check(page, cfg, "14-refused-cooldown", []);
    note(cfg, "second try refused, not unreadable", heading !== first, `heading "${heading}"`);
    await ctx.close();
  }

  // ── Over ₪10M profit: no number (the priced site is cached by now) ──
  {
    const { ctx, page } = await newPage(browser, cfg, nextIp());
    await page.goto(`${BASE}/he/valuation`);
    await fillFront(page, { url: cfg.priced, profit: "over-10" });
    await page.click(".ve-main button[type=submit]");
    await page.waitForSelector(".ve-byhand-lead", { timeout: 60000 });
    await check(page, cfg, "15-over-10m", [cfg.priced, capital(cfg.priced)]);
    await ctx.close();
  }

  await browser.close();
}

const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.config}  ${r.screen}${r.problems.length ? "  " + r.problems.join("; ") : ""}`);
console.log(failed.length ? `\n${failed.length} FAIL` : `\nALL PASS (${results.length} checks)`);
process.exit(failed.length ? 1 : 0);
