import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

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

export function localizeHtml(template: string, url: string): string {
  const reqPath = url.split("?")[0].split("#")[0];
  const isEnHome = reqPath === "/en" || reqPath === "/en/";
  const isHeHome = reqPath === "/";
  if (!isEnHome && !isHeHome) return template;

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

  const canonical = isEnHome ? `${SITE}/en/` : `${SITE}/`;
  return html.replace(
    "</head>",
    `<link rel="canonical" href="${canonical}" />\n    ${HREFLANG}\n  </head>`
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

  app.use(express.static(distPath));

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
