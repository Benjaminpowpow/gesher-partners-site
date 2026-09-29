/**
 * LegalPage. The frame the Privacy Policy and the Terms of Use share.
 *
 * The home page's nav and footer (SiteShell in Home.tsx), a Legal eyebrow, the
 * title, the "Last updated" line, then the text. Styles are .legal in home.css,
 * inside the .gesher scope, so these pages use the same type as the home page.
 *
 * The words live in the vault: PROJECTS/israel-ai-investment-bank/site/
 * 34-privacy-and-terms.md, approved by Ben 2026-09-29. Change the vault file
 * first, then bring the change here. English only for now.
 */
import { useEffect } from "react";
import { SiteShell } from "./Home";

export const LEGAL_EMAIL = "office@gesherpartners.com";

export function Mail() {
  return <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>;
}

export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  // The server sends every legal route the site-wide head, so set the tab title
  // here. Put the old one back on the way out.
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} | Gesher Partners`;
    return () => {
      document.title = prev;
    };
  }, [title]);

  return (
    <SiteShell>
      <main className="section legal">
        <div className="container">
          <div className="narrow">
            <p className="eyebrow">Legal</p>
            <h1 className="display">{title}</h1>
            <p className="legal-updated">Last updated: {updated}</p>
            {children}
          </div>
        </div>
      </main>
    </SiteShell>
  );
}
