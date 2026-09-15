/**
 * The nine questions owners ask, in the order they appear on the homepage.
 *
 * One list, two readers. The page renders it as the accordion in the Questions
 * section (client/src/pages/Home.tsx), and the server builds the FAQPage schema
 * from it (server/_core/vite.ts). Keeping them on one list is the point: Google
 * treats a schema that does not match the visible page as a violation, and it is
 * the kind of thing that drifts the moment there are two copies.
 *
 * Wording is locked in the vault at
 * PROJECTS/israel-ai-investment-bank/site/17-homepage-final-copy.md.
 */
export type FaqItem = { q: string; a: string };

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: "How much is my business worth?",
    a: "It starts with profit, adjusted for your salary and one-time items. That number gets a multiple, set by the sector, how steady the earnings are, and who is buying. Different buyers price the same company differently. You get a written range in the first weeks, before any buyer is contacted.",
  },
  {
    q: "Is my business too small to sell?",
    a: "No. We work with businesses from 5 to 50M NIS in revenue. Big banks run a real process, but not for a deal this size. We bring that process to you. That is why we exist.",
  },
  {
    q: "A buyer already approached me. Do I still need an advisor?",
    a: "An offer tells you there is demand. It does not tell you the price. One buyer alone sets the terms. We prepare the business and bring other serious buyers to the same deadline. Now the first offer is the starting point, not the final price. Your buyer is welcome to take part.",
  },
  {
    q: "How do you get paid?",
    a: "Mostly a success fee, paid when the deal closes. A small commitment fee at the start covers the preparation work. That work is yours whether you sell or not.",
  },
  {
    q: "Will my employees, customers, or competitors find out?",
    a: "No. Buyers sign an NDA before they learn your company's name. You approve the buyer list before we contact anyone. Customer names and contracts go only to final-stage buyers, and only in stages.",
  },
  {
    q: "How long does it take to sell a business?",
    a: "Months, not weeks. Preparing the financials, the valuation and the buyer list takes a few weeks. The buyer process, from first approach to signed offers, is the longest part. Then due diligence and legal. You get a written update every week.",
  },
  {
    q: "Who buys businesses like mine?",
    a: "Strategic buyers, investment funds, holding groups, and sometimes a foreign buyer entering Israel. Each one values the same business differently. Beauty is in the eye of the beholder, and so is price. Our job is finding the buyer who sees the most in yours.",
  },
  {
    q: "Can I stay on after the sale?",
    a: "Often, yes. Most buyers want the owner to stay for a transition, and some want longer. Your role, pay and length of stay are negotiated with the price, along with any earn-out and protection for key people. We give these terms the same weight as the price.",
  },
  {
    q: "Do I have to sell?",
    a: "No. The valuation and the preparation stand on their own. If the business will be worth more after certain fixes, we say so and show the steps. Going to market is always your call.",
  },
];
