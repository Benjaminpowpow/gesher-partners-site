import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { FAQ_ITEMS } from "@shared/faq";

/**
 * Per-language <head> for the bilingual homepage.
 *
 * Hebrew is the main site at the root (/), English is the mirror at /en/.
 * Only the two homepage routes are localized; every other route returns the
 * template unchanged, so the valuation tool and the legal pages are untouched.
 *
 * The Hebrew title/description/OG text below is SEO copy and is pending Ofir's
 * native review, same as the on-page Hebrew copy.
 */
const SITE = "https://gesherpartners.com";

const HREFLANG = [
  `<link rel="alternate" hreflang="he" href="${SITE}/" />`,
  `<link rel="alternate" hreflang="en" href="${SITE}/en/" />`,
  `<link rel="alternate" hreflang="x-default" href="${SITE}/" />`,
].join("\n    ");

// ENGLISH-ONLY (2026-06-04): the Hebrew site is parked. While this is true the
// root (/) serves the English head, the Hebrew rewrites below are skipped, and the
// hreflang alternates are dropped. A single-language site needs no alternates, and
// pointing hreflang at a hidden Hebrew page would send mixed signals to search and
// answer engines. To restore the bilingual site, set this to false. See also the
// App.tsx "/" route and Home.tsx SHOW_LANG_SWITCH.
const ENGLISH_ONLY: boolean = true;

/* ─── Homepage head (v4, 2026-09-15) ──────────────────────────────────────────
 * The homepage title, description and structured data. These go in here rather
 * than in client/index.html because index.html is the head for every route, and
 * a FAQPage block on the privacy page or the valuation tool would be a lie to
 * the crawlers. Express serves the HTML on Render, so this runs on the live
 * site. (It did not run on Manus, which is why the old note above says the
 * per-language head never took.)
 *
 * The nine questions come from shared/faq.ts, the same list the page renders,
 * so the schema and the visible page can never drift apart.
 * ──────────────────────────────────────────────────────────────────────────── */
const HOME_TITLE =
  "Gesher Partners | Sell-side M&amp;A advisor for private businesses in Israel";
const HOME_DESCRIPTION =
  "Gesher Partners advises owners of private and family businesses in Israel, 5 to 50M NIS in revenue, on the sale of their company. Structured process, competing buyers, documented valuation before any buyer is approached.";

const PROFESSIONAL_SERVICE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Gesher Partners",
  url: SITE,
  description:
    "Sell-side M&A advisor for private and family businesses in Israel with 5 to 50M NIS in revenue. A real auction with many buyers, run by advisors who have sold their own companies.",
  areaServed: "IL",
  founder: [
    { "@type": "Person", name: "Ofir Ben Haim" },
    { "@type": "Person", name: "Benjamin Aronson" },
  ],
  email: "hello@gesherpartners.com",
};

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

// JSON inside a <script> block has to be safe to drop into HTML. The only
// sequence that can break out is "</", so escape it.
function jsonLd(data: unknown): string {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}

export function localizeHtml(template: string, url: string): string {
  const reqPath = url.split("?")[0].split("#")[0];
  const isEnHome = reqPath === "/en" || reqPath === "/en/";
  const isHeHome = !ENGLISH_ONLY && reqPath === "/";
  const isRootHome = reqPath === "/"; // English root while ENGLISH_ONLY is true
  if (!isEnHome && !isHeHome && !isRootHome) return template;

  let html = template;

  if (isHeHome) {
    html = html
      .replace(/<html[^>]*>/, '<html lang="he" dir="rtl">')
      .replace(
        "<title>Sell-Side M&A for Israeli Family Businesses | Gesher Partners</title>",
        "<title>גשר פרטנרס. ליווי מכירת עסקים משפחתיים בישראל</title>"
      )
      .replace(
        'content="Sell-side M&A advisor for Israeli family businesses, NIS 5 to 50M in revenue. We run a real auction with serious buyers to get you the best price."',
        'content="ליווי לצד המוכר לעסקים משפחתיים בישראל, מחזור 5 עד 50 מיליון ש״ח. אנחנו מנהלים תהליך תחרותי אמיתי מול קונים רציניים כדי להשיג לך את המחיר הטוב ביותר."'
      )
      .replace(
        /content="Gesher Partners\. Sell-side M&A for Israeli family businesses"/g,
        'content="גשר פרטנרס. ליווי מכירת עסקים משפחתיים בישראל"'
      )
      .replace(
        /content="We help Israeli owners sell their life's work the right way\. A real auction, the right buyers, the best price\."/g,
        'content="אנחנו עוזרים לבעלים בישראל למכור את מפעל החיים שלהם בדרך הנכונה. תהליך תחרותי אמיתי, הקונים הנכונים, המחיר הטוב ביותר."'
      )
      .replace('content="https://gesherpartners.com"', `content="${SITE}/"`);
  }

  if (isEnHome) {
    html = html.replace('content="https://gesherpartners.com"', `content="${SITE}/en/"`);
  }

  // The v4 homepage title and description. English routes only, so the Hebrew
  // rewrite above keeps its own wording when the Hebrew site comes back.
  if (isEnHome || (isRootHome && !isHeHome)) {
    html = html
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${HOME_TITLE}</title>`)
      .replace(
        /<meta name="description" content="[^"]*"\s*\/>/,
        `<meta name="description" content="${HOME_DESCRIPTION}" />`
      );
  }

  const canonical = isEnHome ? `${SITE}/en/` : `${SITE}/`;
  const alternates = ENGLISH_ONLY ? "" : `\n    ${HREFLANG}`;
  const schema = `\n    ${jsonLd(PROFESSIONAL_SERVICE_SCHEMA)}\n    ${jsonLd(FAQ_SCHEMA)}`;
  return html.replace(
    "</head>",
    `<link rel="canonical" href="${canonical}" />${alternates}${schema}\n  </head>`
  );
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
  // language (Hebrew at /, English at /en/). Other routes pass through unchanged.
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
