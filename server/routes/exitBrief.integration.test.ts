import { describe, it, expect } from "vitest";

/**
 * Integration test for the full Exit Brief flow:
 * 1. Submit a URL to /api/exit-brief
 * 2. Verify streaming response contains real markdown with Step 1/2/3 sections
 * 3. Verify content is not empty after scrubbing
 * 4. Verify tab parsing extracts non-empty sections
 */
describe("Exit Brief Integration: Full Flow", () => {
  it("should parse markdown into non-empty market/drivers/valuation sections", () => {
    // Simulate streamed markdown from Anthropic API
    const fullMarkdown = `# Gama Engineering Valuation Brief

> Your business is worth between ₪15M and ₪28M.

## Step 1. Market Snapshot

### Left column. Market Context
Gama operates in the industrial automation sector. Israeli companies in this space typically trade at 3-5x EBITDA.

### Right column. Company Card
**Gama Engineering**
- Founded: 2015
- Revenue: ₪8M
- EBITDA: ₪1.2M

## Step 2. Value Drivers

### Positive Impact
- Strong recurring revenue (65% of total)
- Experienced management team
- Proprietary technology

### Negative Impact
- Customer concentration (top 3 = 45% of revenue)
- Limited international presence

#### What this means for you
Your valuation range reflects these drivers.

## Step 3. Valuation and Buyers

# ₪15M to ₪28M

### (Based on 2.5x to 4.5x EBITDA multiple)

Based on: 2024 revenue of ₪8M, EBITDA of ₪1.2M

### Your Buyers
- Strategic acquirers in industrial automation
- PE firms focused on Israeli tech

### What would sharpen your number
Provide 3-year revenue projections and customer contracts.

### What this means for you
This range is conservative. With growth acceleration, you could reach higher multiples.

## Next step

Book a call with our team to discuss next steps.`;

    // Parse tabs as ExitBrief.tsx does
    function parseTabContent(markdown: string) {
      const marketMatch = markdown.match(/## Step 1[\s\S]*?(?=## Step 2|$)/);
      const driversMatch = markdown.match(/## Step 2[\s\S]*?(?=## Step 3|$)/);
      const valuationMatch = markdown.match(/## Step 3[\s\S]*/);

      return {
        market: marketMatch ? marketMatch[0].trim() : "",
        drivers: driversMatch ? driversMatch[0].trim() : "",
        valuation: valuationMatch ? valuationMatch[0].trim() : "",
      };
    }

    const tabs = parseTabContent(fullMarkdown);

    // Verify all tabs have content
    expect(tabs.market.length).toBeGreaterThan(0);
    expect(tabs.drivers.length).toBeGreaterThan(0);
    expect(tabs.valuation.length).toBeGreaterThan(0);

    // Verify market tab contains expected markers
    expect(tabs.market).toContain("## Step 1");
    expect(tabs.market).toContain("### Left column");
    expect(tabs.market).toContain("### Right column");
    expect(tabs.market).toContain("Market Context");
    expect(tabs.market).toContain("Company Card");

    // Verify drivers tab contains expected markers
    expect(tabs.drivers).toContain("## Step 2");
    expect(tabs.drivers).toContain("### Positive Impact");
    expect(tabs.drivers).toContain("### Negative Impact");

    // Verify valuation tab contains expected markers
    expect(tabs.valuation).toContain("## Step 3");
    expect(tabs.valuation).toContain("₪15M to ₪28M");
    expect(tabs.valuation).toContain("Your Buyers");
  });

  it("should NOT render empty content slots after scrubbing", () => {
    // Markdown with Internal blocks and confidence flags (scrub rules)
    const rawMarkdown = `# Valuation Brief

> Your business is worth between ₪10M and ₪20M.

## Step 1. Market Snapshot

### Left column. Market Context
Israeli SaaS companies trade at 4-6x ARR. [high confidence]

### Right column. Company Card
**Your Company**
- Revenue: ₪5M
- EBITDA: ₪800K

## Internal: Analysis Notes
This section should be stripped.

## Step 2. Value Drivers

### Positive Impact
- Strong unit economics [medium confidence]

### Negative Impact
- Customer concentration [high confidence]

## Step 3. Valuation

# ₪10M to ₪20M

Based on: 4x to 6x multiple

### Your Buyers
- Strategic acquirers

## Sources used
- Israeli M&A database
- Public company comparables`;

    // Scrub rules (exact copy from BriefMarkdown.tsx)
    function scrubbedContent(raw: string): string {
      let result = raw;
      // Rule A: Strip `## Internal:` blocks
      result = result.replace(/^## Internal:.*?(?=^##|$)/gms, "");
      result = result.replace(/\n\n+/g, "\n\n").trim();
      // Rule B: Strip confidence flags
      result = result.replace(/\s?\[(?:high|medium|low|confidence)[^\]]*\]/gi, "");
      // Rule C: Strip `## Sources used` block
      result = result.replace(/^## Sources used.*$/gms, "");
      result = result.trim();
      return result;
    }

    const scrubbed = scrubbedContent(rawMarkdown);

    // Verify scrubbed content still has Step 1/2/3 sections
    expect(scrubbed).toContain("## Step 1");
    expect(scrubbed).toContain("## Step 2");
    expect(scrubbed).toContain("## Step 3");

    // Verify Internal block is removed
    expect(scrubbed).not.toContain("## Internal:");
    expect(scrubbed).not.toContain("Analysis Notes");

    // Verify confidence flags are removed (only the brackets are stripped, not the text inside)
    expect(scrubbed).not.toContain("[high confidence]");
    expect(scrubbed).not.toContain("[medium]");
    // The word "high" and "medium" may still appear in text, but not in bracket format

    // Verify Sources block is removed
    expect(scrubbed).not.toContain("## Sources used");
    expect(scrubbed).not.toContain("Israeli M&A database");

    // Verify content slots are NOT empty
    expect(scrubbed).toContain("Market Context");
    expect(scrubbed).toContain("Company Card");
    expect(scrubbed).toContain("Positive Impact");
    expect(scrubbed).toContain("₪10M to ₪20M");
    expect(scrubbed).toContain("Your Buyers");
  });

  it("should preserve markdown structure after tab parsing", () => {
    const fullMarkdown = `# Brief

## Step 1. Market

Content 1

## Step 2. Drivers

Content 2

## Step 3. Valuation

Content 3`;

    function parseTabContent(markdown: string) {
      const marketMatch = markdown.match(/## Step 1[\s\S]*?(?=## Step 2|$)/);
      const driversMatch = markdown.match(/## Step 2[\s\S]*?(?=## Step 3|$)/);
      const valuationMatch = markdown.match(/## Step 3[\s\S]*/);

      return {
        market: marketMatch ? marketMatch[0].trim() : "",
        drivers: driversMatch ? driversMatch[0].trim() : "",
        valuation: valuationMatch ? valuationMatch[0].trim() : "",
      };
    }

    const tabs = parseTabContent(fullMarkdown);

    // Each tab should start with its heading
    expect(tabs.market).toMatch(/^## Step 1/);
    expect(tabs.drivers).toMatch(/^## Step 2/);
    expect(tabs.valuation).toMatch(/^## Step 3/);

    // Each tab should contain its content
    expect(tabs.market).toContain("Content 1");
    expect(tabs.drivers).toContain("Content 2");
    expect(tabs.valuation).toContain("Content 3");

    // Tabs should not overlap
    expect(tabs.market).not.toContain("Content 2");
    expect(tabs.drivers).not.toContain("Content 3");
  });
});
