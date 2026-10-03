// @vitest-environment jsdom
/**
 * The homepage redesign (site/39): the menu, the hamburger sheet, and the
 * hand-off from the hero estimate card to the valuation tool.
 *
 * The look is checked in real browsers (Playwright, see the pull request).
 * These pin down the behaviour: which links the menu has and where they go,
 * that the sheet opens, closes and locks the page behind it, and that the
 * website rides to /valuation in history state, never in the address.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import Home from "../Home";
import HomeLegacy from "../HomeLegacy";

beforeAll(() => {
  // jsdom has no layout: no matchMedia, no scrolling.
  // Plain functions, not mocks, so restoreAllMocks between tests leaves them.
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  Element.prototype.scrollIntoView = () => {};
  window.scrollTo = (() => {}) as typeof window.scrollTo;
  HTMLMediaElement.prototype.pause = () => {};
});

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  // The sheet waits two frames before it scrolls; run them at once.
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
});

function desktopLinks() {
  const nav = screen.getByRole("navigation", { name: "Primary" });
  const links = nav.querySelector(".nav-links") as HTMLElement;
  return within(links).getAllByRole("link");
}

describe("menu", () => {
  it("has Why Gesher in the slot How it works had, then the three it kept", () => {
    render(<Home />);
    const links = desktopLinks().filter((a) => a.getAttribute("href")?.startsWith("#"));
    expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["Why Gesher", "#why"],
      ["Founders", "#founders"],
      ["Sectors", "#sectors"],
      ["Questions", "#faq"],
    ]);
    expect(desktopLinks().some((a) => a.textContent === "How it works")).toBe(false);
  });

  it("keeps Talk to us and the language switch", () => {
    render(<Home />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("button", { name: "Talk to us" })).toBeTruthy();
    expect(within(nav).getByRole("link", { name: "EN" }).getAttribute("href")).toBe("/");
    expect(within(nav).getByRole("link", { name: "עב" }).getAttribute("href")).toBe("/he/");
  });

  it("points every menu link at a section that exists on the page", () => {
    render(<Home />);
    for (const a of desktopLinks()) {
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("#")) continue;
      expect(document.getElementById(href.slice(1)), href).not.toBeNull();
    }
  });

  it("keeps the old #how anchor alive for links already out there", () => {
    render(<Home />);
    expect(document.getElementById("how")?.textContent).toContain("Three steps to a sale.");
  });
});

describe("hamburger", () => {
  function openSheet() {
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    return screen.getByRole("dialog", { name: "Menu" });
  }

  it("opens a sheet with the four links, the estimate, Talk to us and EN / עב, in that order", () => {
    render(<Home />);
    expect(screen.queryByRole("dialog")).toBeNull();
    const sheet = openSheet();
    expect(screen.getByRole("button", { name: "Menu" }).getAttribute("aria-expanded")).toBe("true");
    const order = Array.from(sheet.querySelectorAll(".nav-sheet-list a, .nav-sheet-actions a, .nav-sheet-actions button")).map(
      (el) => el.textContent
    );
    expect(order).toEqual(["Why Gesher", "Founders", "Sectors", "Questions", "Get your free estimate", "Talk to us", "EN", "עב"]);
  });

  it("shows the cross, and the cross closes it", () => {
    render(<Home />);
    openSheet();
    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Menu" }).getAttribute("aria-expanded")).toBe("false");
  });

  it("starts focus on the cross and hands it back to the hamburger on Esc", () => {
    render(<Home />);
    openSheet();
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Close menu");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Menu");
  });

  it("keeps Tab inside the sheet", () => {
    render(<Home />);
    const sheet = openSheet();
    const items = Array.from(sheet.querySelectorAll<HTMLElement>("a[href], button"));
    items[items.length - 1].focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it("locks the page behind it while open, and lets go when it closes", () => {
    render(<Home />);
    openSheet();
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.overflow).toBe("");
  });

  it("closes and jumps to the section when a link is tapped", () => {
    render(<Home />);
    const sheet = openSheet();
    act(() => {
      fireEvent.click(within(sheet).getByRole("link", { name: "Sectors" }));
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(window.location.hash).toBe("#sectors");
    expect(document.body.style.overflow).toBe("");
  });

  it("opens the valuation estimate from Get your free estimate", () => {
    render(<Home />);
    const sheet = openSheet();
    const estimate = within(sheet).getByRole("link", { name: /Get your free estimate/ });
    expect(estimate.getAttribute("href")).toBe("/valuation");
    act(() => {
      fireEvent.click(estimate);
    });
    expect(window.location.pathname).toBe("/valuation");
  });
});

describe("hero estimate card", () => {
  function card() {
    return screen.getByRole("form", { name: "Free business value estimate" });
  }

  it("has the 39 words: title, placeholder, button, trust line", () => {
    render(<Home />);
    const form = card();
    expect(within(form).getByRole("textbox", { name: "Your business website" }).getAttribute("placeholder")).toBe(
      "yourcompany.co.il"
    );
    expect(within(form).getByRole("button", { name: "Get estimate" })).toBeTruthy();
    expect(form.textContent).toContain("A few short questions. 100% confidential.");
  });

  it("hands the website to /valuation in history state, not in the address", () => {
    render(<Home />);
    const form = card();
    fireEvent.change(within(form).getByRole("textbox"), { target: { value: "  carmelprint.co.il " } });
    act(() => {
      fireEvent.click(within(form).getByRole("button", { name: "Get estimate" }));
    });
    expect(window.location.pathname).toBe("/valuation");
    expect(window.location.search).toBe("");
    expect((window.history.state as { site?: string } | null)?.site).toBe("carmelprint.co.il");
  });

  it("still opens the tool with an empty box, and hands over no website", () => {
    render(<Home />);
    act(() => {
      fireEvent.click(within(card()).getByRole("button", { name: "Get estimate" }));
    });
    expect(window.location.pathname).toBe("/valuation");
    expect((window.history.state as { site?: string } | null)?.site).toBeUndefined();
  });

  it("is where the band's Get your free estimate lands", () => {
    render(<Home />);
    const band = screen.getByRole("link", { name: "Get your free estimate" });
    expect(band.getAttribute("href")).toBe("#estimate");
    expect(document.getElementById("estimate")).toBe(card());
  });
});

describe("page", () => {
  it("is gone: the challenge, why this works and the old band", () => {
    render(<Home />);
    const text = document.body.textContent ?? "";
    for (const gone of [
      "You have one shot to get this right.",
      "One buyer sets the price.",
      "What sets us apart",
      "We tell you when to wait.",
      "When you're ready",
      "Enter your website for a free valuation",
      "How we sell your business.",
    ]) {
      expect(text, gone).not.toContain(gone);
    }
  });

  it("has no em-dash anywhere on the page", () => {
    render(<Home />);
    expect(document.body.textContent).not.toContain("—");
  });

  it("leaves /he/ on the frozen v4 page, words untouched", () => {
    render(<HomeLegacy />);
    expect(document.querySelector(".gesher-legacy")?.getAttribute("dir")).toBe("rtl");
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toBe("מפעל חייך. מגיע לו יותר.");
    expect(screen.getByRole("navigation", { name: "Primary" }).textContent).toContain("התהליך");
  });
});
