import { describe, it, expect } from "vitest";
import { lightScrub } from "../ResultPageRenderer";

/**
 * Tests for the v7 seller-only renderer backstop (lightScrub).
 *
 * v7 outputs clean three-card markdown (## Market / ## Value / ## Range and call)
 * with no trace, no sources, no confidence flags. So lightScrub only needs to
 * catch a stray internal block, sources list, or confidence flag if the model
 * ever slips. The heavy v6 scrubber is gone.
 */
describe("lightScrub (v7 seller-only backstop)", () => {
  it("passes clean three-card markdown through untouched", () => {
    const clean = `## Market

You: an Israeli importer of widgets.

## Value

Your customer book is deep.

## Range and call

# ₪5M to ₪8M

Book 30 minutes with Ofir Ben Haim.`;
    const result = lightScrub(clean);
    expect(result).toContain("## Market");
    expect(result).toContain("## Value");
    expect(result).toContain("## Range and call");
    expect(result).toContain("Book 30 minutes with Ofir Ben Haim.");
  });

  it("strips a stray ## Internal block", () => {
    const content = `## Market
Market content
## Internal: do not share
secret reasoning
## Value
Value content`;
    const result = lightScrub(content);
    expect(result).not.toContain("Internal:");
    expect(result).not.toContain("secret reasoning");
    expect(result).toContain("## Value");
  });

  it("strips a stray ## Sources block", () => {
    const content = `## Range and call
The range is solid.
## Sources
- https://example.com`;
    const result = lightScrub(content);
    expect(result).not.toContain("## Sources");
    expect(result).not.toContain("example.com");
    expect(result).toContain("The range is solid.");
  });

  it("strips stray confidence flags", () => {
    const content = `Your margin is strong [high]. Revenue is steady [medium]. Risk noted [confidence: low].`;
    const result = lightScrub(content);
    expect(result).not.toContain("[high]");
    expect(result).not.toContain("[medium]");
    expect(result).not.toContain("[confidence");
    expect(result).toContain("Your margin is strong");
  });
});
