/**
 * Lockup — the brand mark, the wordmark, and the tagline under them.
 *
 * This used to live inside Home.tsx. The valuation page showed a cut-down
 * version of it (mark and wordmark, no tagline), so the two pages did not
 * match. Now there is one component and both pages call it.
 *
 * The markup carries the class names; the page supplies the CSS. home.css
 * styles these classes inside its .gesher scope, valuation.css styles them
 * inside .ve-topbar. Same shape, different sizes, one source of truth for what
 * the lockup is made of. Two numbers tune the mark against the wordmark, in
 * the page CSS: --mark-scale (how much larger the bridge is drawn) and
 * --mark-gap (the space between the bridge and "gesher"). Ben picked option B
 * on Oct 4: the bridge 22% larger, 5px from "gesher" (4px in the smaller
 * valuation header).
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
  // dir="ltr": the logo reads the same on every page (Ben, Oct 4). On a
  // Hebrew page the bridge still sits to the left of "gesher" and the tagline
  // still starts under the bridge; only where the logo sits in the header
  // follows the page.
  return (
    <span className="lockup" dir="ltr">
      <span className="lockup-row">
        {/* The mark can be drawn a touch larger than the wordmark's line
            (--mark-scale, set in home.css and valuation.css). Its file has
            empty room above and below the bridge, so the extra height hangs
            into that room: the row, and everything under it, keeps its
            height. */}
        <img
          className="brand-mark"
          src="/brand/gesher-mark.svg"
          alt=""
          style={{
            height: `calc(${markHeight}px * var(--mark-scale, 1))`,
            marginBlock: `calc(${markHeight}px * (1 - var(--mark-scale, 1)) / 2)`,
            display: "block",
          }}
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
