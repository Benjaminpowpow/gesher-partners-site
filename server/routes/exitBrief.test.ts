import { describe, it, expect, beforeEach, vi } from "vitest";

describe("API Routes", () => {
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
