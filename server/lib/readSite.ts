/**
 * Read the seller's website, server side, before the engine runs.
 *
 * Why this file exists. Until Sep 17 the engine had exactly one tool,
 * web_search, and a prompt telling it to "read their website". It could not.
 * It searched the company name and worked from whatever came back. For a
 * distinctive name that mostly landed on the right company. For a generic one
 * it did not: optima.org.il returned a US real estate firm, an Israeli
 * semiconductor company and several dental practices, so the engine correctly
 * refused to guess and marked the run unreadable. Every range the tool has ever
 * produced was built from search results about the company rather than from the
 * company's own words.
 *
 * So we fetch the page ourselves and hand the text to the engine with the
 * prompt. Two reasons for doing it here rather than giving the model a fetch
 * tool: it always happens, instead of happening when the model decides to, and
 * it costs nothing beyond the tokens.
 *
 * This never throws. A site that will not answer comes back with `read: null`
 * and a reason, and the engine is told to look the exact domain up instead.
 * Only a domain that does not exist at all ends the run before the engine.
 *
 * Sep 30, why the reasons and the fallbacks exist. Seven of nine runs on Sep 29
 * and 30 came back "unreadable" on real Israeli businesses. Three kinds:
 * - A site drawn in the browser (lakseng.co.il, built on Lovable). The HTML is
 *   an empty shell, 49 characters of text. The title and the description said
 *   exactly what they do, and we threw them away. Now kept as a thin read.
 * - A site the server failed to fetch (rebooks.org.il, working-rooms.co.il).
 *   Both answer fine from a Mac in Israel and from a US cloud box, so the cause
 *   was not visible, because this file never said why. Now it says, tries the
 *   www twin once, and the engine searches the domain instead of giving up.
 * - A site read fine where the engine still said unreadable. That is in the
 *   bundle and in exitBrief.ts, not here.
 */

// Long enough for a slow Israeli host on a cold cache, short enough that the
// seller is not left watching a spinner over it. The engine's own run is the
// slow part; this is meant to be invisible next to it.
const FETCH_TIMEOUT_MS = 12_000;

// The www twin is a second chance, not a second wait of the same length.
const TWIN_TIMEOUT_MS = 8_000;

// Under this much visible text the page is a shell drawn by JavaScript, or a
// gate, not a page of words.
const MIN_TEXT_CHARS = 200;

// A thin read is only worth handing over when the page head says something:
// "לקס הנדסה | פיקוח בנייה וניהול פרויקטים" is 40 characters and enough to know
// the business. A bare "Home" is not.
const MIN_THIN_CHARS = 30;

// Roughly 25k characters of text, which is about 8k tokens on a Hebrew page.
// Enough to carry what a company says about itself, capped so a sprawling site
// cannot quietly double the cost of a run.
const MAX_TEXT_CHARS = 25_000;

// A page that answers with a megabyte of markup is not a small business site,
// it is an application. Stop reading rather than parse it.
const MAX_BYTES = 3_000_000;

// Some hosts serve a stripped page, or nothing at all, to anything that does not
// look like a browser.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export interface SiteRead {
  /** The URL that actually answered, after redirects. */
  finalUrl: string;
  /**
   * The owner's own logo, as an absolute https URL, when the page offers one we
   * can put in an email. Taken from the HTML we already have, so it costs
   * nothing: apple-touch-icon first (usually a real 180px PNG), then og:image
   * (usually the brand image they chose for sharing), then a plain icon link.
   *
   * Raster only. Gmail does not render SVG and is unreliable with ICO, so an
   * .svg favicon is worse than no logo: it shows a broken image in a letter
   * whose whole job is to look like it was written for him.
   */
  logoUrl?: string;
  /** What the <title> said, when it said anything. */
  title?: string;
  /** The meta description, which is often the company's own one-liner. */
  description?: string;
  /** Visible text, collapsed and capped. */
  text: string;
  /** True when the text was cut at the cap. */
  truncated: boolean;
  /**
   * True when the page body had almost no words (a site drawn in the browser)
   * and `text` is only what its head says: title, description, keywords, the
   * structured-data description. Still the seller's own words, just few.
   */
  thin?: boolean;
  /**
   * The headcount the v8 recipe multiplies, read off the company's own LinkedIn
   * page when the site links to one. Already mapped to the lower third of the
   * band ("11-50" becomes 20), the same way the bundle tells the model to do it.
   * Undefined when the site has no LinkedIn link or the page gave no band.
   */
  headcount?: number;
  /** Where the headcount came from, for the prompt line and the log. */
  headcountSource?: string;
}

export interface SiteReadResult {
  /** The page, or null when no version of it could be read. */
  read: SiteRead | null;
  /** Why `read` is null, in a few words, for the Render log. */
  why?: string;
  /**
   * The domain does not exist (DNS has no record for it or its www twin). No
   * business lives there, so the route answers unreadable without paying the
   * engine to look. Any other failure sends the engine to search instead.
   */
  noSuchHost?: boolean;
}

// The engine has to know how big the business is before it can price it, and
// with no numbers from the owner the only honest size signal is headcount. Until
// Sep 22 the model went looking for that itself, with its own search, at default
// randomness: the search finds the LinkedIn page's address but not the number on
// it, so one run priced Optima at 55M and the next refused. The page itself is
// public and says "11-50 עובדים", and most Israeli SMB sites link to it from the
// footer. So we fetch it here, once, and hand the model the number as a fact.
const LINKEDIN_TIMEOUT_MS = 6_000;

// LinkedIn's bands, mapped to the lower third, matching Step 3 of the bundle.
// Israeli company pages count leavers and contractors, so the middle overstates.
const LINKEDIN_BANDS: Array<[number, number, number]> = [
  [1, 10, 5],
  [11, 50, 20],
  [51, 200, 80],
  [201, 500, 250],
  [501, 1000, 600],
  [1001, 5000, 1200],
];

/** The first link to a LinkedIn company page in the HTML, if any. */
function findLinkedIn(html: string): string | undefined {
  const m = html.match(
    /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/company\/[A-Za-z0-9._%-]+\/?/i,
  );
  return m ? m[0] : undefined;
}

/**
 * A headcount the site states itself. "60 employees", "צוות של 60 עובדים",
 * "team of 40". The owner's own number beats LinkedIn, which counts leavers
 * and contractors. Bounded to a small-business range so a "3,000 clients"
 * style figure next to the wrong word cannot slip in.
 */
function findStatedHeadcount(text: string): number | undefined {
  const pats = [
    /(\d{1,4})[\s\u200e\u200f]*(?:employees|staff members|workers|עובדים|עובדות)\b/i,
    /(?:team of|staff of|צוות של|מונה)[\s\u200e\u200f]*(\d{1,4})/i,
  ];
  for (const re of pats) {
    const m = text.match(re);
    if (!m) continue;
    const n = Number(m[1]);
    if (n >= 2 && n <= 5000) return n;
  }
  return undefined;
}

/**
 * Fetch the LinkedIn company page and read the employee band off it.
 *
 * Never throws. Anything that is not a clean band comes back undefined and the
 * bundle's own rule takes over (no headcount, no number). LinkedIn sometimes
 * answers a server address with a 999; that lands here as undefined too, and
 * the console line says so, which is the signal to move this fetch behind the
 * model's own fetch tool if it happens on Render.
 */
async function readLinkedInHeadcount(
  url: string,
): Promise<{ headcount: number; source: string } | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LINKEDIN_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": UA, "Accept-Language": "he,en;q=0.8", Accept: "text/html" },
    });
    if (!res.ok) {
      console.warn(`[exit-brief] linkedin ${url}: HTTP ${res.status}`);
      return undefined;
    }
    const html = await res.text();
    if (!html || html.length > MAX_BYTES) return undefined;
    const text = htmlToText(html);
    // "11-50 employees" or "11-50 עובדים". The dash varies by locale.
    // Hebrew pages wrap the numbers in invisible direction marks, so those are
    // allowed wherever a space is.
    const band = text.match(/(\d{1,3}(?:,\d{3})*)[\s\u200e\u200f]*[-–][\s\u200e\u200f]*(\d{1,3}(?:,\d{3})*)[\s\u200e\u200f]*(?:employees|עובדים)/i);
    if (band) {
      const low = Number(band[1].replace(/,/g, ""));
      const high = Number(band[2].replace(/,/g, ""));
      const known = LINKEDIN_BANDS.find(([a, b]) => a === low && b === high);
      const headcount = known ? known[2] : Math.round(low + (high - low) / 3);
      return { headcount, source: `LinkedIn ${low}-${high}` };
    }
    // "10,001+ employees", the open-ended top band. Far above the gate anyway.
    const open = text.match(/(\d{1,3}(?:,\d{3})*)\+[\s\u200e\u200f]*(?:employees|עובדים)/i);
    if (open) {
      const low = Number(open[1].replace(/,/g, ""));
      return { headcount: low, source: `LinkedIn ${low}+` };
    }
    console.warn(`[exit-brief] linkedin ${url}: page read, no employee band on it`);
    return undefined;
  } catch {
    console.warn(`[exit-brief] linkedin ${url}: fetch failed or timed out`);
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Turn a page of HTML into the words a person would see.
 *
 * Deliberately simple. No DOM, no parser dependency. Script, style, noscript
 * and svg go first, because their contents are not words and would otherwise
 * drown the real text. Then tags become spaces and entities become characters.
 */
function htmlToText(html: string): string {
  let s = html;
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  s = s.replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, " ");
  // Block-level ends become line breaks so headings do not fuse into the
  // paragraph after them.
  s = s.replace(/<\/(p|div|section|article|li|h[1-6]|tr|br)\s*>/gi, "\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  // Collapse runs of space, keep paragraph breaks.
  s = s.replace(/[ \t ]+/g, " ");
  s = s.replace(/\s*\n\s*/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

function decodeEntities(s: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    shy: "",
    rlm: "",
    lrm: "",
  };
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeChar(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => named[String(name).toLowerCase()] ?? m);
}

function safeChar(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

/**
 * Find the owner's logo in their own HTML.
 *
 * Order matters. apple-touch-icon is the one a company actually art-directs,
 * and it is a PNG by definition. og:image is next: it is the picture they chose
 * to represent themselves when a link is shared, which is exactly this job. A
 * bare icon link is last and is usually a 32px favicon.
 */
function findLogo(html: string, base: string): string | undefined {
  const candidates: (string | undefined)[] = [
    firstMatch(html, /<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*href=["']([^"']+)["']/i),
    firstMatch(html, /<link[^>]+href=["']([^"']+)["'][^>]*rel=["'][^"']*apple-touch-icon[^"']*["']/i),
    firstMatch(html, /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i),
    firstMatch(html, /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i),
    firstMatch(html, /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i),
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    let abs: URL;
    try {
      abs = new URL(raw, base);
    } catch {
      continue;
    }
    if (abs.protocol !== "https:") continue; // an http image is blocked or warned on
    // Raster only, and judged on the path so a query string cannot fool it.
    if (!/\.(png|jpe?g|webp)$/i.test(abs.pathname)) continue;
    return abs.toString();
  }
  return undefined;
}

function firstMatch(html: string, re: RegExp): string | undefined {
  const m = html.match(re);
  if (!m || !m[1]) return undefined;
  const v = decodeEntities(m[1]).replace(/\s+/g, " ").trim();
  return v || undefined;
}

type FetchOutcome =
  | { ok: true; raw: string; finalUrl: string }
  | { ok: false; why: string; noSuchHost: boolean; timedOut: boolean };

/**
 * One fetch of one URL. Never throws; a failure comes back with its reason.
 */
async function fetchPage(url: string, timeoutMs: number): Promise<FetchOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        // Israeli sites serve Hebrew either way, but asking for both means a
        // bilingual site hands us the page an owner would actually see.
        "Accept-Language": "he,en;q=0.8",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return { ok: false, why: `HTTP ${res.status}`, noSuchHost: false, timedOut: false };

    const type = res.headers.get("content-type") ?? "";
    if (type && !/text\/html|application\/xhtml|text\/plain/i.test(type)) {
      return { ok: false, why: `content-type ${type}`, noSuchHost: false, timedOut: false };
    }

    const raw = await res.text();
    if (!raw) return { ok: false, why: "empty body", noSuchHost: false, timedOut: false };
    if (raw.length > MAX_BYTES) {
      return { ok: false, why: `body too big (${raw.length} chars)`, noSuchHost: false, timedOut: false };
    }
    return { ok: true, raw, finalUrl: res.url || url };
  } catch (err) {
    // Node's fetch hides the real reason one level down, in `cause`.
    const e = err as { name?: string; message?: string; cause?: { code?: string; message?: string } };
    const code = e.cause?.code ?? "";
    const timedOut = e.name === "AbortError";
    return {
      ok: false,
      why: timedOut ? `timed out after ${timeoutMs}ms` : code || e.cause?.message || e.message || "fetch failed",
      noSuchHost: code === "ENOTFOUND",
      timedOut,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** The same address with "www." added, or taken off. */
function wwwTwin(url: URL): string {
  const twin = new URL(url.toString());
  twin.hostname = twin.hostname.startsWith("www.")
    ? twin.hostname.slice(4)
    : `www.${twin.hostname}`;
  return twin.toString();
}

/**
 * What the page head says about the business, for a site whose body is drawn
 * in the browser. Title, the descriptions, keywords, and any description in
 * the structured data. Each said once.
 */
function headText(raw: string, title?: string, description?: string): string {
  const lines: string[] = [];
  const add = (label: string, v?: string) => {
    const s = (v ?? "").trim();
    if (s && !lines.some((l) => l.endsWith(s))) lines.push(`${label}: ${s}`);
  };
  add("Title", title);
  add("Description", description);
  add("og:title", firstMatch(raw, /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["']/i));
  add("og:description", firstMatch(raw, /<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i));
  add("Keywords", firstMatch(raw, /<meta[^>]+name=["']keywords["'][^>]*content=["']([^"']*)["']/i));
  for (const block of raw.match(/<script[^>]+application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi) ?? []) {
    const m = block.match(/"description"\s*:\s*"([^"]{20,600})"/);
    if (m) add("Structured data", m[1]);
  }
  return lines.join("\n");
}

/**
 * Fetch the seller's page and return its readable text, or the reason it could
 * not be read.
 *
 * Only http and https, and only after a redirect chain that node follows for
 * us. The URL comes from a stranger typing into a box on the home page, so a
 * javascript: or file: URL must not reach fetch.
 */
export async function readSite(rawUrl: string): Promise<SiteReadResult> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { read: null, why: "not a URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { read: null, why: `protocol ${parsed.protocol}` };
  }

  // The address as typed, then once more with or without "www.". Some Israeli
  // hosts only answer on one of the two. A timeout is not retried: the twin
  // almost always sits on the same slow server, and the seller is waiting.
  let page = await fetchPage(parsed.toString(), FETCH_TIMEOUT_MS);
  if (!page.ok && !page.timedOut) {
    const first = page;
    const twin = await fetchPage(wwwTwin(parsed), TWIN_TIMEOUT_MS);
    page = twin.ok
      ? twin
      : {
          ok: false,
          why: `${first.why}; www twin: ${twin.why}`,
          noSuchHost: first.noSuchHost && twin.noSuchHost,
          timedOut: false,
        };
  }
  if (!page.ok) return { read: null, why: page.why, noSuchHost: page.noSuchHost };

  try {
    const { raw, finalUrl } = page;
    const title = firstMatch(raw, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const description =
      firstMatch(raw, /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) ??
      firstMatch(raw, /<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
    const logoUrl = findLogo(raw, finalUrl);

    let full = htmlToText(raw);
    let thin = false;
    // A page with almost no words is a shell drawn by JavaScript. Until Sep 30
    // this returned null and the run died, even when the title and description
    // said plainly what the business does. Hand over what the head says, marked
    // thin, and the engine fills the rest from a search of the exact domain.
    if (full.length < MIN_TEXT_CHARS) {
      const head = headText(raw, title, description);
      if (head.replace(/^[^:]+: /gm, "").length < MIN_THIN_CHARS) {
        return { read: null, why: `page has ${full.length} chars of text and no description` };
      }
      // The head alone. The few body words of a shell are the title again and
      // a "Made with" badge.
      full = head;
      thin = true;
    }

    // The LinkedIn link comes out of the page we just read, so this cannot start
    // any earlier. It is one more small fetch, about a second, capped at six.
    // Headcount, in order of trust: the site states it, then the LinkedIn page
    // the site links to. Neither: undefined, and the range math falls back to
    // the vertical's default. The model never picks a size.
    const stated = findStatedHeadcount(full);
    const linkedIn = stated ? undefined : findLinkedIn(raw);
    const size = stated
      ? { headcount: stated, source: "site" }
      : linkedIn
        ? await readLinkedInHeadcount(linkedIn)
        : undefined;
    if (linkedIn && !size) console.warn(`[exit-brief] linkedin link found, no headcount: ${linkedIn}`);

    const truncated = full.length > MAX_TEXT_CHARS;
    return {
      read: {
        finalUrl,
        logoUrl,
        title,
        description,
        text: truncated ? full.slice(0, MAX_TEXT_CHARS) : full,
        truncated,
        thin,
        headcount: size?.headcount,
        headcountSource: size?.source,
      },
    };
  } catch (err) {
    // A regex or decode surprise on a strange page. Same as a failed fetch.
    return { read: null, why: `could not parse the page: ${(err as Error).message}` };
  }
}

/**
 * The block that goes into the prompt.
 *
 * Fenced and labelled, so the engine can tell the company's own words from the
 * instructions around them and from anything a search turns up later.
 */
export function siteReadBlock(read: SiteRead): string {
  const head: string[] = [`Fetched: ${read.finalUrl}`];
  if (read.title) head.push(`Page title: ${read.title}`);
  if (read.description) head.push(`Meta description: ${read.description}`);
  if (read.truncated) head.push("(text truncated at 25,000 characters)");
  const lines = [
    "SITE TEXT. This is the page at the domain the seller gave, fetched for you.",
    "It is the seller's own words. Treat it as the reading of the site that Step 1 asks for.",
    ...(read.thin
      ? [
          "This site is drawn in the browser, so only its page head could be read: the lines below.",
          "That is enough to know the business. Spend your searches on this exact domain to learn the rest.",
          "readable is true.",
        ]
      : []),
    head.join("\n"),
    "---",
    read.text,
    "---",
  ];
  // v2: the headcount stays on the server. The model never sees a size and
  // never prices anything; valuationMath.ts does that from SiteRead.headcount.
  return lines.join("\n");
}

/**
 * The block that goes into the prompt when the page would not load for us.
 *
 * Until Sep 30 this case ended the run before the engine, and the owner got
 * "we could not read your site" about a site that opens fine in his browser.
 * Now the engine looks the exact domain up. Search engines read pages drawn in
 * the browser and reach hosts that turn a server away. A same-name company on
 * another domain is still not him, so only results that are his domain count.
 */
export function noSiteBlock(domain: string): string {
  return [
    "SITE TEXT: none. The page did not load for our reader. That is our problem, not a sign the business is unreal.",
    `Spend your searches on the exact domain ${domain} (search "${domain}" and the company name it shows).`,
    `Use only results that are pages on ${domain}, or that name ${domain} as the company's own site.`,
    "If they tell you what the business does, readable is true and you write Market and Value from them.",
    `readable is false only when neither search shows anything about ${domain} itself.`,
  ].join("\n");
}
