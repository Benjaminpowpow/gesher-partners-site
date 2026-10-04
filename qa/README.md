# qa/

Browser checks for the site, kept so later sessions can rerun them. Test
harness only. Nothing here ships, and Playwright is not a repo dependency.

## Set up once

1. Node 22 (no Node on Ben's Mac: unpack the darwin-arm64 tarball anywhere,
   put its `bin` on PATH, `corepack enable`, `pnpm install`).
2. Playwright outside the repo: `npm i playwright@1.63` in any folder, then
   `npx playwright install chromium webkit` with `PLAYWRIGHT_BROWSERS_PATH` set
   to where the browsers should live.
3. Link it in: `ln -s <that folder>/node_modules qa/node_modules`. The link is
   git-ignored.

## Run

Build (`pnpm build`), then start two things:

- the stand-in engine: `MOCK_PORT=4598 node qa/mock-anthropic.mjs`
- the site on it: `NODE_ENV=production PORT=4460 ANTHROPIC_API_KEY=mock
  ANTHROPIC_BASE_URL=http://127.0.0.1:4598 BRIEF_TOKEN_SECRET=<any long string>
  EXIT_BRIEF_DAILY_CAP=500 EXIT_BRIEF_PER_IP_DAILY=500 node dist/index.js`

Then, with `PLAYWRIGHT_BROWSERS_PATH` set and `BASE=http://127.0.0.1:4460`:

| Script | What it checks |
| --- | --- |
| `node_modules/.bin/tsx qa/check-hebrew-copy.mts <path to site/39>` | `COPY_V_HE` against the approved Hebrew in the vault, row by row. No browser. |
| `node qa/valuation-he.mjs` | `/he/valuation` end to end, WebKit 390 and Chromium 1440: every screen right to left, no English left, nothing cut off, opens at the top, the range in the Hebrew shape. |
| `node qa/valuation-en-same.mjs shoot main` (against a main build), `... shoot branch`, then `... compare` | English `/valuation` pixel for pixel against main. |
| `node qa/site-polish.mjs` | The phone menu on iPhone 14 (WebKit) and Pixel 7 (Chromium) on `/`, `/he/`, `/privacy`, `/terms`: hides on scroll down, back on a small scroll up, always at the top, never with the sheet open or focus in it, closing the sheet keeps his place, menu links land with the heading in view, no layout shift, reduce motion. Desktop 1440 menu against the live site. Tap targets and side scroll at 320, 390, 863, 1440. Pinch-zoom. The Hebrew font loaded (document.fonts), English faces unchanged against live. |
| `node qa/logo-shots.mjs` | The logo, live against this build: nav, phone sheet, footer, valuation header, English and Hebrew, 390 and 1440. One sheet per width. |
| `node qa/valuation-header.mjs` | The valuation page's top, live against this build, English and Hebrew at 320, 390 and 1440: the logo keeps its tagline on one line, "Talk to us" on one line, no side scroll against the device width, and the progress strip pinned with its label inside it. Writes two before/after sheets. |
| `node qa/logo-options.mjs` | The logo with other `--mark-scale` and `--mark-gap` values side by side, for choosing a size. |

`LIVE` (default `https://gesherpartners.com`) is the "before" for the scripts
that compare against the live site.

Lighthouse is not in the repo either. With it installed next to Playwright:
`npx lighthouse http://127.0.0.1:4460/ --only-categories=accessibility
--chrome-path=<Playwright's Chromium>` (add `--preset=desktop` for desktop).

Screenshots go to `$SHOTS` (default: `gesher-qa-shots` in the system temp
folder, never the repo).

The site caches one engine answer per site and language in memory, and lets
one visitor run once a minute. The scripts work around both; a fresh server
start clears the cache.
