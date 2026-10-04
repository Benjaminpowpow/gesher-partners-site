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

Screenshots go to `$SHOTS` (default: `gesher-qa-shots` in the system temp
folder, never the repo).

The site caches one engine answer per site and language in memory, and lets
one visitor run once a minute. The scripts work around both; a fresh server
start clears the cache.
