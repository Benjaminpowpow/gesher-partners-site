// Site polish (PR 2, Oct 4): the phone menu that hides on scroll, the four
// small fixes, the Hebrew font. Against a local build (BASE); the live site
// (LIVE) is the "before" for the desktop menu and English fonts.
//
//   BASE=http://127.0.0.1:4462 SHOTS=/tmp/shots node qa/site-polish.mjs
import { mkdirSync } from "node:fs";
import { chromium, devices, webkit } from "playwright";
import { BASE, SHOTS } from "./lib.mjs";

const LIVE = process.env.LIVE || "https://gesherpartners.com";
mkdirSync(SHOTS, { recursive: true });
const results = [];
const note = (group, name, pass, detail = "") => results.push({ group, name, pass: !!pass, detail });
const PAGES = ["/", "/he/", "/privacy", "/terms"];
const instant = (y) => window.scrollTo({ top: y, left: 0, behavior: "instant" });

async function header(page) {
  return page.evaluate(() => {
    const h = document.querySelector(".site-header");
    const r = h.getBoundingClientRect();
    return { hidden: h.hasAttribute("data-hidden"), top: Math.round(r.top), bottom: Math.round(r.bottom), dur: getComputedStyle(h).transitionDuration };
  });
}
const shown = (h) => !h.hidden && h.top === 0;
const gone = (h) => h.hidden && h.bottom <= 0;

/** Where each section starts in the page, to prove nothing below the header moved. */
const sectionTops = (page) => page.evaluate(() => [...document.querySelectorAll("section[id]")].map((s) => Math.round(s.getBoundingClientRect().top + window.scrollY)));

// ── The phone menu ──────────────────────────────────────────────────────────
for (const [device, type] of [["iPhone 14", webkit], ["Pixel 7", chromium]]) {
  const browser = await type.launch();
  for (const path of PAGES) {
    const g = `menu ${device} ${path}`;
    const ctx = await browser.newContext({ ...devices[device] });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.__shift = 0;
      try {
        new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__shift += e.value; })).observe({ type: "layout-shift", buffered: false });
      } catch { /* WebKit has no layout-shift entries */ }
    });
    await page.goto(BASE + path, { waitUntil: "load" });
    await page.waitForSelector(".site-header");
    await page.waitForTimeout(800);
    note(g, "shown at the top", shown(await header(page)));
    const before = await sectionTops(page);
    await page.evaluate(() => { window.__shift = 0; });

    await page.evaluate(instant, 300);
    await page.waitForTimeout(80);
    await page.evaluate(instant, 700);
    await page.waitForTimeout(450);
    const down = await header(page);
    note(g, "scroll down hides it", gone(down), JSON.stringify(down));
    note(g, "nothing below moves", JSON.stringify(await sectionTops(page)) === JSON.stringify(before));

    await page.evaluate(instant, 690);
    await page.waitForTimeout(450);
    note(g, "a 10px scroll up shows it", shown(await header(page)));

    await page.evaluate(instant, 1100);
    await page.waitForTimeout(450);
    await page.evaluate(instant, 0);
    await page.waitForTimeout(450);
    note(g, "the very top shows it", shown(await header(page)));
    const shift = await page.evaluate(() => window.__shift);
    note(g, "no layout shift while scrolling", shift === 0 || shift === undefined, `CLS ${shift}`);

    // Focus in the menu: it comes back and stays.
    await page.evaluate(instant, 400);
    await page.waitForTimeout(60);
    await page.evaluate(instant, 900);
    await page.waitForTimeout(450);
    await page.focus(".nav-toggle");
    await page.waitForTimeout(450);
    note(g, "focus in the menu shows it", shown(await header(page)));
    await page.evaluate(instant, 1300);
    await page.waitForTimeout(450);
    note(g, "and it stays while focus is there", shown(await header(page)));
    await page.evaluate(() => document.activeElement.blur());

    // The sheet: open it, it fills the screen and the header never hides.
    await page.evaluate(instant, 1250);
    await page.waitForTimeout(450);
    await page.click(".nav-toggle");
    await page.waitForSelector(".nav-sheet, .nav-menu");
    await page.waitForTimeout(350);
    const sheet = await page.evaluate(() => {
      const s = document.querySelector(".nav-sheet, .nav-menu").getBoundingClientRect();
      return { top: Math.round(s.top), h: Math.round(s.height), vh: window.innerHeight };
    });
    note(g, "the open sheet covers the screen", sheet.top === 0 && sheet.h >= sheet.vh - 1, JSON.stringify(sheet));
    // The page behind may still move under the sheet (it did before too);
    // what counts is that the menu never takes the hidden state and the sheet
    // stays on the screen.
    await page.evaluate(instant, 1800);
    await page.waitForTimeout(450);
    const after = await page.evaluate(() => ({
      hidden: document.querySelector(".site-header").hasAttribute("data-hidden"),
      top: Math.round(document.querySelector(".nav-sheet, .nav-menu").getBoundingClientRect().top),
    }));
    note(g, "the open sheet never hides", !after.hidden && after.top === 0, JSON.stringify(after));

    // Closing the sheet leaves the page where it was (Chrome on Android used
    // to jump to the top, Oct 4).
    await page.locator(".nav-sheet-close, .nav-menu .nav-toggle").first().click();
    await page.waitForTimeout(500);
    const kept = await page.evaluate(() => Math.round(window.scrollY));
    await page.evaluate(instant, kept + 60);
    await page.waitForTimeout(80);
    await page.evaluate(instant, kept);
    await page.waitForTimeout(450);
    await page.click(".nav-toggle");
    await page.waitForSelector(".nav-sheet, .nav-menu");
    await page.waitForTimeout(300);
    await page.locator(".nav-sheet-close, .nav-menu .nav-toggle").first().click();
    await page.waitForTimeout(600);
    const y = await page.evaluate(() => Math.round(window.scrollY));
    note(g, "closing the sheet keeps his place", y === kept, `${kept} -> ${y}`);
    await page.click(".nav-toggle");
    await page.waitForSelector(".nav-sheet, .nav-menu");
    await page.waitForTimeout(300);

    // A menu link lands with its heading in view (the last link, then the first).
    if (path === "/" || path === "/he/") {
      for (const which of ["last", "first"]) {
        if (which === "first") {
          await page.click(".nav-toggle");
          await page.waitForSelector(".nav-sheet, .nav-menu");
          await page.waitForTimeout(300);
        }
        const items = page.locator(".nav-sheet-list li > a, .nav-menu-list li > :is(a, button)");
        await (which === "last" ? items.last() : items.first()).click();
        await page.waitForTimeout(1600);
        const land = await page.evaluate(() => {
          const h = document.querySelector(".site-header").getBoundingClientRect();
          const covered = h.bottom > 0 ? h.bottom : 0;
          const near = [...document.querySelectorAll("section[id]")]
            .map((s) => ({ s, top: s.getBoundingClientRect().top }))
            .filter((x) => x.top > -40 && x.top < 260)
            .sort((a, b) => Math.abs(a.top) - Math.abs(b.top))[0];
          const head = near?.s.querySelector("h2, h3, .eyebrow");
          const r = head?.getBoundingClientRect();
          return { id: near?.s.id, headTop: r && Math.round(r.top), covered: Math.round(covered), vh: window.innerHeight };
        });
        note(g, `menu link (${which}) lands with its heading visible`, land.headTop !== undefined && land.headTop >= land.covered - 1 && land.headTop < land.vh, JSON.stringify(land));
      }
    }
    await ctx.close();
  }
  await browser.close();
}

// Reduce motion: no slide, it just shows and hides.
{
  const browser = await webkit.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 14"], reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(BASE + "/");
  await page.waitForSelector(".site-header");
  note("menu reduce motion", "no slide under reduce motion", (await header(page)).dur === "0s");
  await page.evaluate(instant, 300);
  await page.waitForTimeout(60);
  await page.evaluate(instant, 800);
  await page.waitForTimeout(120);
  note("menu reduce motion", "still hides, at once", gone(await header(page)));
  await browser.close();
}

// Desktop: the menu never hides, and sits exactly where the live one does.
{
  const browser = await chromium.launch();
  const boxes = async (base) => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(base + "/", { waitUntil: "load" });
    await page.waitForSelector(".site-header");
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(instant, 400);
    await page.waitForTimeout(60);
    await page.evaluate(instant, 1200);
    await page.waitForTimeout(450);
    const h = await header(page);
    const links = await page.evaluate(() => [...document.querySelectorAll(".nav-links > *")].map((e) => { const r = e.getBoundingClientRect(); return [e.textContent.trim(), Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; }));
    await page.close();
    return { h, links };
  };
  const here = await boxes(BASE);
  const live = await boxes(LIVE);
  note("desktop 1440", "the menu never hides", shown(here.h), JSON.stringify(here.h));
  note("desktop 1440", "links, button and EN / עב exactly where the live ones are", JSON.stringify(here.links) === JSON.stringify(live.links), `${JSON.stringify(here.links)} vs ${JSON.stringify(live.links)}`);
  await browser.close();
}

// ── The four fixes ──────────────────────────────────────────────────────────
for (const [label, type, ctxOpts] of [
  ["320", chromium, { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
  ["390", webkit, { ...devices["iPhone 14"] }],
  ["863", chromium, { ...devices["Pixel 7 landscape"] }],
  ["1440", chromium, { viewport: { width: 1440, height: 900 } }],
]) {
  const browser = await type.launch();
  for (const path of ["/", "/he/"]) {
    const g = `fixes ${label} ${path}`;
    const page = await browser.newPage(ctxOpts);
    await page.goto(BASE + path, { waitUntil: "load" });
    await page.waitForTimeout(500);
    const vw = page.viewportSize().width;
    const m = await page.evaluate(() => {
      const box = (el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, right: Math.round(r.right), t: el.textContent.trim() }; };
      return {
        scrollW: document.scrollingElement.scrollWidth,
        proof: [...document.querySelectorAll(".proof-cell, .proof-n")].map(box).map((b) => b.right),
        mail: [...document.querySelectorAll(".contact-mail a")].map(box),
        footer: [...document.querySelectorAll(".footer-links a")].map(box),
        viewport: document.querySelector('meta[name="viewport"]').content,
      };
    });
    note(g, "1. no side scroll, the numbers row fits", m.scrollW <= vw && m.proof.every((r) => r <= vw), `scrollWidth ${m.scrollW}, widest ${Math.max(...m.proof)}`);
    if (vw <= 900) {
      const small = [...m.mail, ...m.footer].filter((b) => b.w < 44 || b.h < 44);
      note(g, "2 and 3. office@ and every footer link at least 44 by 44", small.length === 0, JSON.stringify(small));
    }
    note(g, "4. pinch-zoom allowed", !/maximum-scale|user-scalable=no/.test(m.viewport), m.viewport);
    await page.screenshot({ path: `${SHOTS}/fix-${label}-${path === "/" ? "en" : "he"}.png`, fullPage: true });
    await page.close();
  }
  await browser.close();
}

// ── The Hebrew font ─────────────────────────────────────────────────────────
{
  const browser = await chromium.launch();
  for (const width of [375, 1280]) {
    for (const path of ["/he/", "/he/valuation"]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(BASE + path, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(600);
      const f = await page.evaluate(() => {
        const loaded = [...document.fonts].filter((x) => x.status === "loaded").map((x) => `${x.family.replace(/"/g, "")} ${x.weight}`);
        const h = document.querySelector("h1, h2");
        const body = document.querySelector(".lede, .why-para, .ve-front .ve-contact-note, .ve p:not(.ve-eyebrow)");
        return {
          plex: loaded.filter((x) => x.startsWith("IBM Plex Sans Hebrew")),
          old: loaded.filter((x) => /Heebo|Frank Ruhl/.test(x)),
          h: h && [getComputedStyle(h).fontFamily.split(",")[0], getComputedStyle(h).fontWeight],
          body: body && [getComputedStyle(body).fontFamily.split(",")[0], getComputedStyle(body).fontWeight],
          sheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href).filter((h) => h.includes("fonts.googleapis")),
        };
      });
      const g = `font ${width} ${path}`;
      note(g, "IBM Plex Sans Hebrew loaded (document.fonts)", f.plex.length > 0, f.plex.join(", "));
      note(g, "no Heebo or Frank Ruhl requested or loaded", f.old.length === 0 && !f.sheets.some((s) => /Heebo|Frank/.test(s)));
      note(g, "headline in Plex 600, body in Plex 400", /IBM Plex Sans Hebrew/.test(f.h?.[0] ?? "") && f.h?.[1] === "600" && /IBM Plex Sans Hebrew/.test(f.body?.[0] ?? "") && f.body?.[1] === "400", JSON.stringify({ h: f.h, body: f.body }));
      await page.screenshot({ path: `${SHOTS}/font-${width}-${path === "/he/" ? "he-home" : "he-valuation"}.png`, fullPage: false });
      await page.close();
    }
  }
  // English: the same faces as live, on the same elements.
  const faces = async (base) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(base + "/", { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const out = await page.evaluate(() => [...document.querySelectorAll("h1, h2, h3, p, a, button, label, .eyebrow")].slice(0, 400).map((e) => { const s = getComputedStyle(e); return `${s.fontFamily}|${s.fontWeight}|${s.fontSize}|${s.lineHeight}`; }).join("\n"));
    if (base === BASE) await page.screenshot({ path: `${SHOTS}/font-1280-en-home.png` });
    await page.close();
    return out;
  };
  note("font 1280 /", "English: every face, weight, size and line height as on the live site", (await faces(BASE)) === (await faces(LIVE)));
  await browser.close();
}

for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.group}  ${r.name}${r.pass || !r.detail ? "" : "  " + r.detail}`);
const failed = results.filter((r) => !r.pass).length;
console.log(failed ? `\n${failed} FAIL of ${results.length}` : `\nALL PASS (${results.length} checks)`);
process.exit(failed ? 1 : 0);
