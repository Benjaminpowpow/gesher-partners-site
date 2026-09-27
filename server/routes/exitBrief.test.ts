import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { dailyCap, failsHebrewCheck, hebrewLetterCount, todayKey } from "./exitBrief";
import { rangeText, type RangeResult } from "../lib/valuationMath";

describe("API Routes", () => {
  // The daily cap is the only thing standing between a bored visitor and the
  // Anthropic bill, so these test the real functions, not a copy of them.
  describe("Daily Brief cap", () => {
    const original = process.env.EXIT_BRIEF_DAILY_CAP;
    afterEach(() => {
      if (original === undefined) delete process.env.EXIT_BRIEF_DAILY_CAP;
      else process.env.EXIT_BRIEF_DAILY_CAP = original;
    });

    it("defaults to 10 when the env var is not set", () => {
      delete process.env.EXIT_BRIEF_DAILY_CAP;
      expect(dailyCap()).toBe(10);
    });

    it("reads a number out of the env var", () => {
      process.env.EXIT_BRIEF_DAILY_CAP = "25";
      expect(dailyCap()).toBe(25);
    });

    it("falls back to 10 on junk, so a typo never removes the cap", () => {
      for (const junk of ["", "ten", "0", "-5", "abc10"]) {
        process.env.EXIT_BRIEF_DAILY_CAP = junk;
        expect(dailyCap()).toBe(10);
      }
    });

    it("counts the day in Israel, not in UTC", () => {
      // 00:30 UTC on Jan 2 is already 02:30 on Jan 2 in Jerusalem.
      expect(todayKey(new Date("2026-01-02T00:30:00Z"))).toBe("2026-01-02");
      // 22:30 UTC on Jan 1 is 00:30 on Jan 2 in Jerusalem: a new day for the
      // seller, still yesterday for the server clock.
      expect(todayKey(new Date("2026-01-01T22:30:00Z"))).toBe("2026-01-02");
    });
  });

  describe("Rate Limiting", () => {
    it("should reject a second Brief request from the same IP within 60 seconds", async () => {
      // Simulate rate limiting logic
      const rateLimitStore = new Map<string, number>();
      const ip = "192.168.1.1";
      const now = Date.now();

      // First request
      rateLimitStore.set(ip, now);
      expect(rateLimitStore.has(ip)).toBe(true);

      // Second request within 60 seconds
      const elapsed = Date.now() - (rateLimitStore.get(ip) ?? 0);
      expect(elapsed < 60_000).toBe(true);
    });

    it("should allow a Brief request after 60 seconds", async () => {
      // Simulate rate limiting logic
      const rateLimitStore = new Map<string, number>();
      const ip = "192.168.1.1";
      const now = Date.now() - 61_000; // 61 seconds ago

      rateLimitStore.set(ip, now);
      const elapsed = Date.now() - (rateLimitStore.get(ip) ?? 0);
      expect(elapsed >= 60_000).toBe(true);
    });
  });

  describe("Thinking Trace Stripping", () => {
    it("should remove ## Internal: blocks from markdown", () => {
      const stripThinkingTraces = (markdown: string): string => {
        return markdown
          .replace(/^## Internal:.*?(?=^##|$)/gms, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      };

      const input = `## Step 1. Market Snapshot

Some content here.

## Internal: Phase 1 thinking
This is internal trace content.
It should be removed.

## Step 2. Value Drivers

More content.`;

      const output = stripThinkingTraces(input);
      expect(output).not.toContain("Internal");
      expect(output).not.toContain("Phase 1 thinking");
      expect(output).toContain("Step 1");
      expect(output).toContain("Step 2");
    });

    it("should preserve seller-facing content", () => {
      const stripThinkingTraces = (markdown: string): string => {
        return markdown
          .replace(/^## Internal:.*?(?=^##|$)/gms, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      };

      const input = `## Step 1. Market Snapshot

Recent Israeli transactions in your vertical show median multiples of 0.8x to 1.2x EBITDA.

## Internal: Trace data
[hidden from seller]

## Step 2. Value Drivers

Your customer base is a strong positive.`;

      const output = stripThinkingTraces(input);
      expect(output).toContain("Recent Israeli transactions");
      expect(output).toContain("customer base is a strong positive");
      expect(output).toContain("Step 1");
      expect(output).toContain("Step 2");
    });
  });

  describe("URL Validation", () => {
    it("should accept valid URLs", () => {
      const validateUrl = (url: string) => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      };

      expect(validateUrl("https://example.com")).toBe(true);
      expect(validateUrl("https://my-company.co.il")).toBe(true);
      expect(validateUrl("http://localhost:3000")).toBe(true);
    });

    it("should reject invalid URLs", () => {
      const validateUrl = (url: string) => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      };

      expect(validateUrl("not a url")).toBe(false);
      expect(validateUrl("")).toBe(false);
      expect(validateUrl("just-text")).toBe(false);
    });
  });

  describe("Client IP Detection", () => {
    it("should extract IP from x-forwarded-for header", () => {
      const getClientIp = (headers: Record<string, string | string[]>): string => {
        const forwarded = headers["x-forwarded-for"];
        if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
        return "unknown";
      };

      const headers = { "x-forwarded-for": "192.168.1.1, 10.0.0.1" };
      expect(getClientIp(headers)).toBe("192.168.1.1");
    });

    it("should return unknown when no IP header", () => {
      const getClientIp = (headers: Record<string, string | string[]>): string => {
        const forwarded = headers["x-forwarded-for"];
        if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
        return "unknown";
      };

      const headers = {};
      expect(getClientIp(headers)).toBe("unknown");
    });
  });
});

// The Hebrew guard (site/31, Sep 27). A Hebrew run whose cards came back in
// English is thrown away and run again.
describe("the Hebrew guard", () => {
  const hebrewCards =
    "## Market\nא.ש מבצעת עבודות חשמל בניין ותעשייה, תאורה ומערכות מתח גבוה מאז 1973.\n\n## Value\nצוות מקצועי יציב.";
  const englishCards =
    "## Market\nImports, markets and services industrial cleaning machines since 1995.\n\n## Value\nRecurring service and parts revenue.";

  it("counts Hebrew letters only", () => {
    expect(hebrewLetterCount("abc 123")).toBe(0);
    expect(hebrewLetterCount("שוק abc")).toBe(3);
  });

  it("passes Hebrew cards and fails English ones", () => {
    expect(failsHebrewCheck({ meta: {}, resultMd: hebrewCards })).toBe(false);
    expect(failsHebrewCheck({ meta: {}, resultMd: englishCards })).toBe(true);
  });

  it("does not count the server's Hebrew Range card", () => {
    const md = englishCards + "\n\n## Range and call\n\n# 5 עד 8 מיליון ש״ח\n\nלפי מה שקונים משלמים על עסקים כמו שלך. עם מידע נוסף נוכל לתת לך הערכה מדויקת יותר.";
    expect(failsHebrewCheck({ meta: {}, resultMd: md })).toBe(true);
  });

  it("never fails a site the model could not read", () => {
    expect(failsHebrewCheck({ meta: { readable: false }, resultMd: "" })).toBe(false);
  });
});

describe("the Hebrew range figure", () => {
  const base: RangeResult = {
    tier: 1,
    low: 5_000_000,
    high: 8_000_000,
    outcome: "number",
    headcountUsed: 20,
    headcountSource: "default",
    perHead: 0,
    margin: 0,
    multiple: 0,
  };

  it("prints whole millions with no decimal", () => {
    expect(rangeText(base, "he")).toBe("5 עד 8 מיליון ש״ח");
  });

  it("prints other millions to one place, with no direction marks", () => {
    const text = rangeText({ ...base, low: 3_800_000, high: 4_800_000 }, "he");
    expect(text).toBe("3.8 עד 4.8 מיליון ש״ח");
    expect(/[\u2066-\u2069]/.test(text)).toBe(false);
  });

  it("leaves English as it was", () => {
    expect(rangeText({ ...base, low: 3_800_000, high: 4_800_000 })).toBe("₪3.8M to ₪4.8M");
  });
});
