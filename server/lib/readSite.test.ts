import { afterEach, describe, expect, it, vi } from "vitest";
import { noSiteBlock, readSite, siteReadBlock } from "./readSite";

// The Sep 30 failures, as fetch answers. Each test swaps in a fake fetch so
// nothing here touches the network.

function htmlResponse(body: string, url: string, status = 200): Response {
  const res = new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });
  Object.defineProperty(res, "url", { value: url });
  return res;
}

function dnsError(): Error {
  const err = new TypeError("fetch failed");
  (err as { cause?: unknown }).cause = { code: "ENOTFOUND" };
  return err;
}

// lakseng.co.il, trimmed: a Lovable site. All the words are in the head.
const SHELL = `<!doctype html><html lang="he"><head>
<title>לקס הנדסה | פיקוח בנייה וניהול פרויקטים</title>
<meta name="description" content="לקס הנדסה - חברת פיקוח בנייה וניהול פרויקטים מובילה. מקצוענות עד הסוף." />
<meta name="keywords" content="פיקוח בנייה, ניהול פרויקטים, תמא 38" />
<meta property="og:title" content="לקס הנדסה | פיקוח בנייה וניהול פרויקטים" />
<script type="module" src="/assets/index.js"></script>
</head><body><div id="root"></div></body></html>`;

const FULL = `<html><head><title>Acme</title></head><body><p>${"Acme makes steel doors for Israeli builders. ".repeat(10)}</p></body></html>`;

afterEach(() => vi.unstubAllGlobals());

describe("readSite", () => {
  it("keeps the page head of a site drawn in the browser, marked thin", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => htmlResponse(SHELL, "https://lakseng.co.il/")));
    const { read } = await readSite("https://lakseng.co.il");
    expect(read).not.toBeNull();
    expect(read!.thin).toBe(true);
    expect(read!.text).toContain("פיקוח בנייה וניהול פרויקטים");
    expect(read!.text).toContain("Keywords:");
    // og:title repeats the title, so it is said once.
    expect(read!.text.match(/לקס הנדסה \| פיקוח/g)?.length).toBe(1);
    expect(siteReadBlock(read!)).toContain("readable is true");
  });

  it("still gives up on a shell with nothing in its head", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => htmlResponse("<html><head><title>Home</title></head><body></body></html>", "https://x.co.il/")));
    const r = await readSite("https://x.co.il");
    expect(r.read).toBeNull();
    expect(r.noSuchHost).toBeFalsy();
    expect(r.why).toMatch(/no description/);
  });

  it("tries the www twin when the bare domain turns us away", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes("www.") ? htmlResponse(FULL, url) : htmlResponse("Forbidden", url, 403),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { read } = await readSite("https://acme.co.il");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(read?.finalUrl).toBe("https://www.acme.co.il/");
    expect(read?.thin).toBe(false);
  });

  it("says why when both addresses fail, and it is not a missing domain", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => htmlResponse("no", url, 403)));
    const r = await readSite("https://rebooks.org.il");
    expect(r.read).toBeNull();
    expect(r.noSuchHost).toBe(false);
    expect(r.why).toBe("HTTP 403; www twin: HTTP 403");
  });

  it("flags a domain that does not exist, so no engine run is paid for", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw dnsError(); }));
    const r = await readSite("https://no-such-business-qq17.co.il");
    expect(r.read).toBeNull();
    expect(r.noSuchHost).toBe(true);
  });
});

describe("noSiteBlock", () => {
  it("sends the engine to the exact domain and nowhere else", () => {
    const b = noSiteBlock("rebooks.org.il");
    expect(b).toContain("SITE TEXT: none");
    expect(b).toContain('search "rebooks.org.il"');
    expect(b).toContain("readable is false only when");
  });
});
