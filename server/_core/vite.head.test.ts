/**
 * The per-language homepage head. Express serves the built index.html through
 * localizeHtml on Render, so this is what crawlers and link previews read.
 */
import { describe, expect, it } from "vitest";
import { homeLang, localizeHtml, valuationLang } from "./vite";
import { COPY_V_HE } from "../../client/src/pages/valuationCopy";

const TEMPLATE = `<!doctype html>
<html lang="en" dir="ltr">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
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

describe("valuationLang", () => {
  it("maps both valuation URLs", () => {
    expect(valuationLang("/valuation")).toBe("en");
    expect(valuationLang("/valuation/")).toBe("en");
    expect(valuationLang("/he/valuation")).toBe("he");
    expect(valuationLang("/he/valuation/")).toBe("he");
  });
  it("leaves every other route alone", () => {
    expect(valuationLang("/")).toBeNull();
    expect(valuationLang("/he/")).toBeNull();
    expect(valuationLang("/privacy")).toBeNull();
  });
});

describe("localizeHtml", () => {
  it("returns other routes byte for byte", () => {
    expect(localizeHtml(TEMPLATE, "/privacy?x=1")).toBe(TEMPLATE);
    expect(localizeHtml(TEMPLATE, "/terms")).toBe(TEMPLATE);
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
      expect(html).toContain("<title>מכירת עסק או חברה פרטית בישראל | Gesher Partners</title>");
      expect(html).toContain('<meta name="description" content="ליווי מקצועי במכירת עסק');
      expect(html).toContain('<meta property="og:title" content="מכירת עסק או חברה פרטית');
      expect(html).toContain('<meta property="og:url" content="https://gesherpartners.com/he/" />');
      expect(html).toContain('<meta property="og:locale" content="he_IL" />');
      expect(html).toContain('<link rel="canonical" href="https://gesherpartners.com/he/" />');
      expect(html).toContain('hreflang="x-default" href="https://gesherpartners.com/"');
      expect(html).toContain('"@type":"FAQPage","inLanguage":"he"');
      expect(html).toContain("כמה שווה העסק שלי?");
    }
  });

  it("gives /valuation its own title and canonical", () => {
    const html = localizeHtml(TEMPLATE, "/valuation?site=ash-electric.co.il");
    expect(html).toContain('<html lang="en" dir="ltr">');
    // site/35, head.title and head.description (Oct 1).
    expect(html).toContain("<title>Free business valuation estimate | Gesher Partners</title>");
    expect(html).toContain(
      "For owners planning to sell. Answer a few short questions and get an estimated value range for your business. Private and free.",
    );
    expect(html).toContain('<link rel="canonical" href="https://gesherpartners.com/valuation" />');
    expect(html).toContain('<meta property="og:url" content="https://gesherpartners.com/valuation" />');
    expect(html).toContain('hreflang="he" href="https://gesherpartners.com/he/valuation"');
    expect(html).toContain('hreflang="x-default" href="https://gesherpartners.com/valuation"');
    expect(html).toContain('<meta property="og:locale" content="en_US" />');
    // Pinch-zoom is allowed on the estimate (Lighthouse meta-viewport).
    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0" />');
    expect(html).not.toContain("maximum-scale");
    // No FAQ schema on the tool. Those nine questions live on the home page.
    expect(html).not.toContain('"@type":"FAQPage"');
    expect(html).not.toContain("noindex");
  });

  it("serves /he/valuation right to left, with its Hebrew title, and lets it be indexed", () => {
    for (const url of ["/he/valuation", "/he/valuation/"]) {
      const html = localizeHtml(TEMPLATE, url);
      // Pinch-zoom is allowed on the Hebrew estimate too.
      expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0" />');
      expect(html).toContain('<html lang="he" dir="rtl">');
      expect(html).toContain('<link rel="canonical" href="https://gesherpartners.com/he/valuation" />');
      expect(html).toContain('<meta property="og:locale" content="he_IL" />');
      expect(html).toContain(`<title>${COPY_V_HE.head.title}</title>`);
      expect(html).toContain(`<meta name="description" content="${COPY_V_HE.head.description}" />`);
      expect(html).not.toContain("noindex");
      expect(html).toContain('hreflang="x-default" href="https://gesherpartners.com/valuation"');
    }
  });

  it("puts nine questions in each FAQ schema, same order", () => {
    const count = (html: string) => (html.match(/"@type":"Question"/g) || []).length;
    expect(count(localizeHtml(TEMPLATE, "/"))).toBe(9);
    expect(count(localizeHtml(TEMPLATE, "/he/"))).toBe(9);
  });
});
