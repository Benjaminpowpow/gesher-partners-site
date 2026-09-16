/**
 * Lockup — the brand mark, the wordmark, and the tagline under them.
 *
 * This used to live inside Home.tsx. The valuation page showed a cut-down
 * version of it (mark and wordmark, no tagline), so the two pages did not
 * match. Now there is one component and both pages call it.
 *
 * The markup carries the class names; the page supplies the CSS. home.css
 * styles these classes inside its .gesher scope, valuation.css styles them
 * inside .v-topbar. Same shape, different sizes, one source of truth for what
 * the lockup is made of.
 *
 * The tagline is a prop because Home reads it from its own copy table (English
 * and Hebrew both show the English line today) and the valuation page has no
 * copy table.
 */

export const LOCKUP_TAGLINE = "Your sell-side advisor";

export function Lockup({
  markHeight = 34,
  tagline = LOCKUP_TAGLINE,
}: {
  markHeight?: number;
  tagline?: string;
}) {
  return (
    <span className="lockup">
      <span className="lockup-row">
        <img
          className="brand-mark"
          src="/brand/gesher-mark.svg"
          alt=""
          style={{ height: markHeight, display: "block" }}
        />
        <img
          className="wordmark"
          src="/brand/gesher-wordmark.svg"
          alt="gesher"
          style={{ height: markHeight * 0.85 }}
        />
      </span>
      <span className="lockup-tag">{tagline}</span>
    </span>
  );
}

export default Lockup;
