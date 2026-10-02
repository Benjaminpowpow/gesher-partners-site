/**
 * The shape check on the engine's two cards (Ben, Oct 2). The fixtures are the
 * real cards from the live test on eshet.co.il and manltd.co.il, as Ben's lead
 * emails showed them.
 */
import { describe, expect, it } from "vitest";
import { briefProblems, tidyBrief, trimMarket, wordCount, MARKET_MAX_WORDS } from "./briefShape";

const ESHET = `## Market

Eshet Eilon manufactures sorting and conveying systems for fruit and vegetable packinghouses, established in 1935, serving producers and packinghouses across Israel and globally. Buyers of businesses like yours are larger Israeli industrial groups, global agricultural-equipment makers, and funds backing founder-run shops. What transfers is your installed base, your R&D capability, and your relationships with packinghouses that depend on your machines.

## Value

positive: **Global installed base.** Your machines run in packinghouses across the US, Mexico, Kenya, and the Philippines, not just Israel.

positive: **R&D and innovation.** You work with the Volcani Institute and continuously develop new sorting systems, including AI-powered chick sorting.

watch: **Concentrated customer base.** Your testimonials show a handful of large producers (Del Monte, Christopher Ranch, Avocado Gal) who likely represent a significant share of revenue.`;

const MANLTD = `## Market

Man Ltd imports and services industrial cleaning machines, since 1995, serving factories, warehouses, supermarkets, event halls, and cleaning companies across Israel. Buyers of businesses like yours are larger Israeli equipment distributors rolling up the market, the foreign brands you represent (they often buy their Israeli distributor), and funds backing founder-run shops. Your service network and spare-parts inventory transfer in a sale.

## Value

positive: **25 years and a national service footprint.** You have built a trusted brand with a professional service team and spare-parts warehouse across the country.

positive: **Recurring revenue from service and parts.** Your customers depend on you for repairs, maintenance, and replacement parts, not just the machine sale.

watch: **Dependence on foreign brands.** The manufacturers you represent could decide to sell direct or appoint a larger distributor, which would shrink your margin.`;

const SHORT = `## Market
Roltag: label printer since 1969, serving pharma and food. Larger printing groups buy shops like this for the client book.

## Value
positive: **Sticky customers.** Pharma clients reorder for years.
positive: **Specialty work.** Multi-layer labels set it apart.
watch: **Few buyers.** The price comes from a real process.`;

describe("counting words the way a reader sees them", () => {
  it("ignores the tag and the bold marks", () => {
    expect(wordCount("positive: **Sticky customers.** Pharma clients reorder for years.")).toBe(7);
  });
  it("Eshet's Market card was 60 words, Man Ltd's 61", () => {
    expect(wordCount(ESHET.split("## Value")[0].replace("## Market", ""))).toBe(60);
    expect(wordCount(MANLTD.split("## Value")[0].replace("## Market", ""))).toBe(61);
  });
});

describe("the checks", () => {
  it("a card that keeps the rules has no problems", () => {
    expect(briefProblems(SHORT)).toEqual([]);
  });

  it("Eshet's cards: Market too long, and the watch is 25 words and guesses", () => {
    const problems = briefProblems(tidyBrief(ESHET));
    expect(problems).toHaveLength(3);
    expect(problems[0]).toBe("Market is 60 words. The limit is 40.");
    expect(problems.some((p) => p.includes('"Concentrated customer base."') && p.includes("25 words"))).toBe(true);
    expect(problems.some((p) => p.includes("guesses") && p.includes("likely"))).toBe(true);
  });

  it("Man Ltd's cards: Market too long, all three points over 20 words; its watch does not guess", () => {
    // Counted by hand: 7 + 17 = 24, 6 + 16 = 22, 4 + 19 = 23.
    const problems = briefProblems(tidyBrief(MANLTD));
    expect(problems).toEqual([
      "Market is 61 words. The limit is 40.",
      'Value point "25 years and a national service footprint." is 24 words. The limit is 20, label included.',
      'Value point "Recurring revenue from service and parts." is 22 words. The limit is 20, label included.',
      'Value point "Dependence on foreign brands." is 23 words. The limit is 20, label included.',
    ]);
  });

  it("a watch that names an industry risk plainly is fine", () => {
    const md = SHORT.replace(
      "watch: **Few buyers.** The price comes from a real process.",
      "watch: **Owner-led.** Common in this industry: buyers check the business runs without the founder.",
    );
    expect(briefProblems(md)).toEqual([]);
  });

  it("missing or extra tags are a problem the retry can fix", () => {
    const md = SHORT.replace("watch: **Few buyers.**", "**Few buyers.**");
    expect(briefProblems(md)).toContain("Value must be exactly two positive: lines and one watch: line.");
  });
});

describe("tidying", () => {
  it("cuts each Value point to its label and first sentence, and keeps the tags", () => {
    const md = SHORT.replace(
      "positive: **Sticky customers.** Pharma clients reorder for years.",
      "positive: **Sticky customers.** Pharma clients reorder for years. They rarely switch printers.",
    );
    const tidy = tidyBrief(md);
    expect(tidy).toContain("positive: **Sticky customers.** Pharma clients reorder for years.");
    expect(tidy).not.toContain("rarely switch");
    expect(tidy).toContain("watch: **Few buyers.**");
  });

  it("keeps a Value line the engine forgot to tag, so the card is never empty", () => {
    const tidy = tidyBrief(SHORT.replace("watch: **Few buyers.**", "**Few buyers.**"));
    expect(tidy).toContain("**Few buyers.** The price comes from a real process.");
  });

  it("cuts Market to whole sentences that fit in 40 words, the first always kept", () => {
    const trimmed = trimMarket(tidyBrief(ESHET));
    const market = trimmed.split("## Value")[0].replace("## Market", "");
    expect(wordCount(market)).toBeLessThanOrEqual(MARKET_MAX_WORDS);
    expect(market).toContain("Eshet Eilon manufactures sorting and conveying systems");
    expect(market.trim().endsWith(".")).toBe(true);
    expect(trimmed).toContain("## Value");
  });

  it("leaves a short Market alone", () => {
    expect(trimMarket(SHORT)).toBe(SHORT);
  });
});
