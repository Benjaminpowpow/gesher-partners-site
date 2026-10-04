/**
 * The phone menu gets out of the way (Ben, Oct 4, after jfrog.com on a
 * phone). It slides up while he reads down the page and comes back the moment
 * he scrolls up, even a little. At the very top it always shows. It never
 * hides while the phone sheet is open or while focus is anywhere in the menu,
 * so a keyboard never lands on something off screen. On a desktop the menu
 * stays as it was, always there.
 *
 * This file only decides. The slide is a transform on the header in home.css
 * (data-hidden), so nothing under the header moves, and reduce motion turns
 * the slide into a plain show and hide.
 */
import { useEffect, type RefObject } from "react";

/** Where the menu is the hamburger, and may hide. The redesign folds at 900px. */
export const PHONE_MENU_QUERY = "(max-width: 900px)";

export interface ScrollStep {
  /** Where the page is now, and where it was at the last step. */
  y: number;
  lastY: number;
  /** How far the page can scroll. A bounce past either end is not a scroll. */
  maxY: number;
  /** The header's own height. Above it, the menu is still in its place. */
  headerHeight: number;
  /** Hidden at the last step. */
  hidden: boolean;
  /** The sheet is open, focus is in the menu, or this is not a phone. */
  locked: boolean;
}

/** Hidden or not after one scroll step. */
export function nextHidden(s: ScrollStep): boolean {
  if (s.locked) return false;
  // iPhones report fractions and bounce past both ends; neither is a scroll.
  const clamp = (v: number) => Math.round(Math.min(Math.max(v, 0), Math.max(s.maxY, 0)));
  const y = clamp(s.y);
  const lastY = clamp(s.lastY);
  if (y <= s.headerHeight) return false;
  if (y > lastY) return true;
  if (y < lastY) return false;
  return s.hidden;
}

/**
 * Wire nextHidden to the page. navRef is the menu's <nav>; its header (the
 * nearest .site-header) is what slides. sheetOpen is the phone sheet's state.
 */
export function useHideOnScroll(
  navRef: RefObject<HTMLElement | null>,
  sheetOpen: boolean,
  query: string = PHONE_MENU_QUERY,
): void {
  useEffect(() => {
    const header = navRef.current?.closest<HTMLElement>(".site-header");
    if (!header || typeof window.matchMedia !== "function") return;
    const phone = window.matchMedia(query);
    let lastY = window.scrollY;
    let hidden = false;
    let frame = 0;

    const set = (next: boolean) => {
      if (next === hidden) return;
      hidden = next;
      if (next) header.setAttribute("data-hidden", "");
      else header.removeAttribute("data-hidden");
    };
    const step = () => {
      frame = 0;
      const y = window.scrollY;
      set(
        nextHidden({
          y,
          lastY,
          maxY: document.documentElement.scrollHeight - window.innerHeight,
          headerHeight: header.offsetHeight,
          hidden,
          locked: !phone.matches || sheetOpen || header.contains(document.activeElement),
        }),
      );
      lastY = y;
    };
    // One decision per frame, however fast the scroll events come.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(step);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    header.addEventListener("focusin", step);
    phone.addEventListener("change", step);
    step();
    return () => {
      window.removeEventListener("scroll", onScroll);
      header.removeEventListener("focusin", step);
      phone.removeEventListener("change", step);
      cancelAnimationFrame(frame);
      header.removeAttribute("data-hidden");
    };
  }, [navRef, sheetOpen, query]);
}
