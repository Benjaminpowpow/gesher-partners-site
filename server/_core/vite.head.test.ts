/**
 * The per-language homepage head. Express serves the built index.html through
 * localizeHtml on Render, so this is what crawlers and link previews read.
 */
import { describe, expect, it } from "vitest";
import { homeLang, localizeHtml } from "./vite";

const TEMPLATE = `<!doctype html>
<html lang="en" dir="ltr">
  <head>
    <title>Old title</title>
    <meta name="description" content="Old description" />
    <meta property="og:title" content="Old og title" />
    <meta property="og:description" content="Old og description" />
    <meta property="og:url" content="https://gesherpartners.com" />
    <meta name="twitter:title" content="Old tw title" />
    <meta name="twitter:description" content="Old tw description" />
  </head>
  <body></body>
</html>`;

describe("homeLang", () => {
  it("maps the root to English and /he to Hebrew", () => {
    expect(homeLang("/")).toBe("en");
    expect(homeLang("/he")).toBe("he");
    expect(homeLang("/he/")).toBe("he");
  });
  it("leaves every other route alone", () => {
    expect(homeLang("/valuation")).toBeNull();
    expect(homeLang("/en")).toBeNull();
    expect(homeLang("/he/valuation")).toBeNull();
  });
});

describe("localizeHtml", () => {
  it("returns other routes byte for byte", () => {
    expect(localizeHtml(TEMPLATE, "/valuation")).toBe(TEMPLATE);
    expect(localizeHtml(TEMPLATE, "/privacy?x=1")).toBe(TEMPLATE);
  });

  it("serves the English head at the root", () => {
    const html = localizeHtml(TEMPLATE, "/");
    expect(html).toContain('<html lang="en" dir="ltr">');
    expect(html).toContain("<title>Gesher Partners | Sell-side M&amp;A advisor for private businesses in Israel</title>");
    expect(html).toContain('<link rel="canonical" href="https://gesherpartners.com/" />');
    expect(html).toContain('hreflang="en" href="https://gesherpartners.com/"');
    expect(html).toContain('hreflang="he" href="https://gesherpartners.com/he/"');
    expect(html).toContain('hreflang="x-default" href="https://gesherpartners.com/"');
    expect(html).toContain('<meta property="og:url" content="https://gesherpartners.com/" />');
    expect(html).toContain('"@type":"FAQPage","inLanguage":"en"');
    expect(html).toContain('"@type":"ProfessionalService"');
    // English share preview text is left as index.html has it.
    expect(html).toContain('og:title" content="Old og title"');
  });

  it("serves the Hebrew head at /he/ and /he", () => {
    for (const url of ["/he/", "/he", "/he/?utm=x"]) {
      const html = localizeHtml(TEMPLATE, url);
      expect(html).toContain('<html lang="he" dir="rtl">');
      expect(html).toContain("<title>Gesher Partners | ליווי במכירת עסקים פרטיים בישראל</title>");
      expect(html).toContain('<meta name="description" content="Gesher Partners מייעצת');
      expect(html).toContain('<meta property="og:title" content="Gesher Partners | ליווי');
      expect(html).toContain('<meta property="og:url" content="https://gesherpartners.com/he/" />');
      expect(html).toContain('<meta property="og:locale" content="he_IL" />');
      expect(html).toContain('<link rel="canonical" href="https://gesherpartners.com/he/" />');
      expect(html).toContain('hreflang="x-default" href="https://gesherpartners.com/"');
      expect(html).toContain('"@type":"FAQPage","inLanguage":"he"');
      expect(html).toContain("כמה העסק שלי שווה?");
    }
  });

  it("puts nine questions in each FAQ schema, same order", () => {
    const count = (html: string) => (html.match(/"@type":"Question"/g) || []).length;
    expect(count(localizeHtml(TEMPLATE, "/"))).toBe(9);
    expect(count(localizeHtml(TEMPLATE, "/he/"))).toBe(9);
  });
});
