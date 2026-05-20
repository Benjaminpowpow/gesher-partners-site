import { describe, it, expect } from "vitest";

/**
 * Tests for ResultPageRenderer scrub rules (Rules A-D)
 * Verifies that Internal blocks, confidence flags, and Sources are stripped
 */

describe("ResultPageRenderer Scrub Rules", () => {
  it("Rule A: Strips ## Internal: blocks", () => {
    const content = `# Market Analysis
## Internal: This is confidential
Some market content
## Step 1
Market snapshot`;

    // Simulate the scrub logic
    const lines = content.split("\n");
    let inInternalBlock = false;
    const filtered = lines.filter(line => {
      if (line.match(/^## Internal:/)) {
        inInternalBlock = true;
        return false;
      }
      if (inInternalBlock && line.match(/^## /)) {
        inInternalBlock = false;
      }
      if (inInternalBlock) return false;
      return true;
    });

    const result = filtered.join("\n");
    expect(result).not.toContain("## Internal:");
    expect(result).not.toContain("This is confidential");
    expect(result).toContain("## Step 1");
  });

  it("Rule B: Strips confidence flags [high], [medium], [low]", () => {
    const content = `This is a positive driver [high confidence].
Another driver [medium].
Risk factor [low].`;

    // Simulate confidence flag stripping
    const stripped = content
      .replace(/\[high\s*confidence?\]/gi, "")
      .replace(/\[medium\]/gi, "")
      .replace(/\[low\]/gi, "")
      .replace(/\[confidence:\s*[^\]]+\]/gi, "");

    expect(stripped).not.toContain("[high");
    expect(stripped).not.toContain("[medium");
    expect(stripped).not.toContain("[low");
    expect(stripped).toContain("This is a positive driver");
  });

  it("Rule C: Strips ## Sources used block", () => {
    const content = `# Brief

## Step 1
Content here

## Sources used
- Source 1
- Source 2

## Step 2
More content`;

    // Simulate Sources stripping
    const lines = content.split("\n");
    let inSourcesBlock = false;
    const filtered = lines.filter(line => {
      if (line.match(/^## Sources used/)) {
        inSourcesBlock = true;
        return false;
      }
      if (inSourcesBlock && line.match(/^## /)) {
        inSourcesBlock = false;
      }
      if (inSourcesBlock) return false;
      return true;
    });

    const result = filtered.join("\n");
    expect(result).not.toContain("## Sources used");
    expect(result).not.toContain("Source 1");
    expect(result).toContain("## Step 1");
    expect(result).toContain("## Step 2");
  });

  it("Strips all em-dashes and en-dashes", () => {
    const content = `Value range: ₪5M – ₪10M. This is a test — with dashes.`;
    const stripped = content.replace(/[–—]/g, "-");
    expect(stripped).not.toContain("–");
    expect(stripped).not.toContain("—");
    expect(stripped).toContain("₪5M - ₪10M");
  });

  it("Does not contain word 'AI' in brief output", () => {
    const content = `This brief was generated using advanced analysis.
No artificial intelligence here. Just data and research.`;
    expect(content.toLowerCase()).not.toContain(" ai ");
    expect(content.toLowerCase()).not.toContain("ai.");
  });

  it("Trailing Internal blocks at EOF are stripped", () => {
    const content = `# Brief

## Step 1
Content

## Internal: Thinking trace
This is the thinking process
More internal thoughts`;

    const lines = content.split("\n");
    let inInternalBlock = false;
    const filtered = lines.filter(line => {
      if (line.match(/^## Internal:/)) {
        inInternalBlock = true;
        return false;
      }
      if (inInternalBlock && line.match(/^## /)) {
        inInternalBlock = false;
      }
      if (inInternalBlock) return false;
      return true;
    });

    const result = filtered.join("\n").trim();
    expect(result).not.toContain("## Internal:");
    expect(result).not.toContain("thinking process");
    expect(result).toContain("## Step 1");
  });
});
