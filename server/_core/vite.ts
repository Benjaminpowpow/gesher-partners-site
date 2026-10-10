import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { FAQ_ITEMS, FAQ_ITEMS_HE, type FaqItem } from "@shared/faq";
import { COPY_V, COPY_V_HE } from "../../client/src/pages/valuationCopy";

/* ─── Homepage head, per language ─────────────────────────────────────────────
 * English lives at the root (/), Hebrew under /he/. Decided 2026-09-16: English
 * stays where it is live and indexed; Hebrew is the twin. The old /en/ URLs
 * 301 to the root (see index.ts).
 *
 * Since 2026-09-22 the valuation tool has its own pair too, /valuation and
 * /he/valuation, with its own title and description. Before that /valuation
 * served the home page's title, so a man who landed on the tool off an ad saw
 * "Sell-side M&A advisor" in his browser tab. The legal pages and everything
 * else still return the template unchanged.
 *
 * The title, description, Open Graph text, canonical, hreflang twins and the
 * two schema blocks go in here rather than in client/index.html, because
 * index.html is the head for every route, and a FAQPage block on the privacy
 * page would be a lie to the crawlers. Express serves the HTML on Render, so
 * this runs on the live site and is what crawlers and link previews (WhatsApp,
 * LinkedIn) read. React only keeps <html lang/dir> in sync after that.
 *
 * The nine questions come from shared/faq.ts, the same lists the page renders,
 * so the schema and the visible page can never drift apart. The Hebrew wording
 * is verbatim from the vault files site/23-hebrew-copy-ben-picks.md and
 * site/40-homepage-hebrew-worksheet.md (section L1). Change it there first,
 * then here.
 * ──────────────────────────────────────────────────────────────────────────── */
const SITE = "https://gesherpartners.com";

type Lang = "en" | "he";

const HOME_URL: Record<Lang, string> = {
  en: `${SITE}/`,
  he: `${SITE}/he/`,
};

const VALUATION_URL: Record<Lang, string> = {
  en: `${SITE}/valuation`,
  he: `${SITE}/he/valuation`,
};

/** The three alternate links for one pair of pages. x-default is English. */
function hreflangFor(urls: Record<Lang, string>): string {
  return [
    `<link rel="alternate" hreflang="en" href="${urls.en}" />`,
    `<link rel="alternate" hreflang="he" href="${urls.he}" />`,
    `<link rel="alternate" hreflang="x-default" href="${urls.en}" />`,
  ].join("\n    ");
}

const HREFLANG = hreflangFor(HOME_URL);

type HomeHead = {
  title: string; // already HTML-escaped, goes straight into <title>
  description: string;
  ogLocale: string;
  serviceDescription: string;
  faq: FaqItem[];
};

const HOME_HEAD: Record<Lang, HomeHead> = {
  en: {
    title: "Gesher Partners | Sell-side M&amp;A advisor for private businesses in Israel",
    // site/43 (Oct 10): no revenue range on the public page, in either
    // language.
    description:
      "Gesher Partners advises owners of private and family businesses in Israel on the sale of their company. Structured process, competing buyers, documented valuation before any buyer is approached.",
    ogLocale: "en_US",
    serviceDescription:
      "Sell-side M&A advisor for private and family businesses in Israel. A real competitive process with many buyers, run by advisors who have sold their own companies.",
    faq: FAQ_ITEMS,
  },
  he: {
    // site/40 L1 (Ben, Oct 4): built on the words Israeli owners type into
    // Google (מכירת עסק, מכירת חברה פרטית, כמה שווה העסק שלי). site/43 line
    // 52 (Oct 10): no revenue range, and the tool's new name.
    title: "מכירת עסק או חברה פרטית בישראל | Gesher Partners",
    description:
      "ליווי מקצועי במכירת עסק או חברה פרטית בישראל. יותר קונים מתחרים על העסק שלך, ומחיר טוב יותר. כמה שווה העסק שלך? הערכת שווי ראשוני ללא עלות.",
    ogLocale: "he_IL",
    // The schema carries the same Hebrew as the meta description. Same facts,
    // one source.
    serviceDescription:
      "ליווי מקצועי במכירת עסק או חברה פרטית בישראל. יותר קונים מתחרים על העסק שלך, ומחיר טוב יותר. כמה שווה העסק שלך? הערכת שווי ראשוני ללא עלות.",
    faq: FAQ_ITEMS_HE,
  },
};

function professionalServiceSchema(lang: Lang) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Gesher Partners",
    url: HOME_URL[lang],
    inLanguage: lang,
    description: HOME_HEAD[lang].serviceDescription,
    areaServed: "IL",
    founder: [
      { "@type": "Person", name: "Ofir Ben Haim" },
      { "@type": "Person", name: "Benjamin Aronson" },
    ],
    email: "office@gesherpartners.com",
  };
}

function faqSchema(lang: Lang) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: lang,
    mainEntity: HOME_HEAD[lang].faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

// JSON inside a <script> block has to be safe to drop into HTML. The only
// sequence that can break out is "</", so escape it.
function jsonLd(data: unknown): string {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}

// Which homepage a request path is, if any. "/he" and "/he/" both render the
// Hebrew page; the canonical below names "/he/" so search engines see one URL.
export function homeLang(reqPath: string): Lang | null {
  if (reqPath === "/") return "en";
  if (reqPath === "/he" || reqPath === "/he/") return "he";
  return null;
}

/* ─── The valuation tool's head ───────────────────────────────────────────────
 * Its own title and description, because the tool is what an ad points at and
 * "Free business valuation" is the promise in the tab.
 *
 * Both come from the page's own copy table, valuationCopy.ts. Both pages are indexed and both sit in sitemap.xml as a pair.
 * ──────────────────────────────────────────────────────────────────────────── */
const VALUATION_HEAD: Record<Lang, { title: string; description: string; ogLocale: string }> = {
  // site/35, head.title and head.description, from the page's own copy table.
  en: {
    title: COPY_V.head.title,
    description: COPY_V.head.description,
    ogLocale: "en_US",
  },
  // site/39 rows 107 and 108, from the same table.
  he: {
    title: COPY_V_HE.head.title,
    description: COPY_V_HE.head.description,
    ogLocale: "he_IL",
  },
};

/** A viewport that does not stop pinch-zoom (Lighthouse's meta-viewport). */
export const ZOOMABLE_VIEWPORT = "width=device-width, initial-scale=1.0";

/** Which valuation page a request path is, if any. */
export function valuationLang(reqPath: string): Lang | null {
  if (reqPath === "/valuation" || reqPath === "/valuation/") return "en";
  if (reqPath === "/he/valuation" || reqPath === "/he/valuation/") return "he";
  return null;
}

/** The valuation pages: title, description, canonical, og, hreflang. */
function localizeValuation(template: string, lang: Lang): string {
  const head = VALUATION_HEAD[lang];
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${head.title}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/>/,
      `<meta name="description" content="${head.description}" />`
    )
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/,
      `<meta property="og:title" content="${head.title}" />`
    )
    .replace(/<meta property="og:description" content="[^"]*"\s*\/>/,
      `<meta property="og:description" content="${head.description}" />`
    )
    .replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/,
      `<meta name="twitter:title" content="${head.title}" />`
    )
    .replace(/<meta name="twitter:description" content="[^"]*"\s*\/>/,
      `<meta name="twitter:description" content="${head.description}" />`
    )
    // og:url is the only tag in index.html carrying the bare site URL.
    .replace('content="https://gesherpartners.com"', `content="${VALUATION_URL[lang]}"`);

  if (lang === "he") {
    html = html.replace(/<html[^>]*>/, '<html lang="he" dir="rtl">');
  }
  // The estimate lets a reader pinch to zoom, in both languages: its owners
  // are 55 and up. Since Oct 4 index.html no longer caps the zoom anywhere,
  // so this only guards against the cap coming back.
  html = html.replace(
    /<meta name="viewport" content="[^"]*"\s*\/>/,
    `<meta name="viewport" content="${ZOOMABLE_VIEWPORT}" />`,
  );

  const extra = [
    `<meta property="og:locale" content="${head.ogLocale}" />`,
    `<link rel="canonical" href="${VALUATION_URL[lang]}" />`,
    hreflangFor(VALUATION_URL),
  ].join("\n    ");
  return html.replace("</head>", `${extra}\n  </head>`);
}

export function localizeHtml(template: string, url: string): string {
  const reqPath = url.split("?")[0].split("#")[0];
  const lang = homeLang(reqPath);
  if (!lang) {
    const vLang = valuationLang(reqPath);
    return vLang ? localizeValuation(template, vLang) : template;
  }

  const head = HOME_HEAD[lang];
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${head.title}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/>/,
      `<meta name="description" content="${head.description}" />`
    )
    // og:url is the only tag in index.html carrying the bare site URL.
    .replace('content="https://gesherpartners.com"', `content="${HOME_URL[lang]}"`);

  if (lang === "he") {
    // The Hebrew page: right-to-left document, and the share preview in
    // Hebrew too. The English preview text in index.html is left as it is.
    html = html
      .replace(/<html[^>]*>/, '<html lang="he" dir="rtl">')
      .replace(
        /<meta property="og:title" content="[^"]*"\s*\/>/,
        `<meta property="og:title" content="${head.title}" />`
      )
      .replace(
        /<meta property="og:description" content="[^"]*"\s*\/>/,
        `<meta property="og:description" content="${head.description}" />`
      )
      .replace(
        /<meta name="twitter:title" content="[^"]*"\s*\/>/,
        `<meta name="twitter:title" content="${head.title}" />`
      )
      .replace(
        /<meta name="twitter:description" content="[^"]*"\s*\/>/,
        `<meta name="twitter:description" content="${head.description}" />`
      );
  }

  const extra = [
    `<meta property="og:locale" content="${head.ogLocale}" />`,
    `<link rel="canonical" href="${HOME_URL[lang]}" />`,
    HREFLANG,
    jsonLd(professionalServiceSchema(lang)),
    jsonLd(faqSchema(lang)),
  ].join("\n    ");
  return html.replace("</head>", `${extra}\n  </head>`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(localizeHtml(page, url));
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // index: false matters. By default express.static answers "/" with
  // index.html straight off disk, so the request never reached the handler
  // below and the head was served raw: no canonical link, no title rewrite, no
  // schema. Found on 2026-09-15 while porting the v4 homepage. With this off,
  // "/" falls through and every HTML response goes through localizeHtml.
  app.use(express.static(distPath, { index: false }));

  // fall through to index.html for client routes, localizing the <head> per
  // language (English at /, Hebrew at /he/). Other routes pass through unchanged.
  const indexPath = path.resolve(distPath, "index.html");
  app.use("*", async (req, res) => {
    try {
      const file = await fs.promises.readFile(indexPath, "utf-8");
      res.status(200).set({ "Content-Type": "text/html" }).end(localizeHtml(file, req.originalUrl));
    } catch {
      res.sendFile(indexPath);
    }
  });
}
