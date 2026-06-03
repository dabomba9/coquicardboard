// Simple static guides. Add entries here; no CMS needed yet.
export type Guide = {
  slug: string;
  title: string;
  excerpt: string;
  date: string; // ISO
  body: string[]; // paragraphs
};

export const GUIDES: Guide[] = [
  {
    slug: "understanding-the-mj-hierarchy",
    title: "Understanding the Michael Jordan Hierarchy",
    excerpt:
      "What the four tiers mean, why a 378-card map helps, and how to use it to build a focused collection.",
    date: "2026-06-02",
    body: [
      "The Michael Jordan card universe is enormous and, for newcomers, bewildering. The hierarchy organizes ~378 of the most important MJ cards into four tiers — from the untouchable grails down to the foundational base — so you can see how everything fits together.",
      "Tier 1 (The Pinnacle) holds the rarest, most iconic cards: low-numbered parallels, 1/1-adjacent inserts, and the cards that define the hobby. Tier 2 covers high-end staples — tough inserts, premium parallels, and key autos. Tier 3 is collector favorites: recognizable, attainable, beloved. Tier 4 is the broad base of inserts, parallels, and base cards that anchor any collection.",
      "Using the tracker, mark each copy you own with its grade and condition, follow estimated and live (eBay asking) market value, and watch your completion climb tier by tier. Set a want list with target prices and you'll see when a card you're chasing is listed at or below your number.",
      "Tiering is editorial, not gospel — it's a map for prioritizing. Credit for the original Michael Jordan Hierarchy concept goes to Cajun Cardboard; this tracker is an independent tool for working through it.",
    ],
  },
  {
    slug: "raw-vs-graded",
    title: "Raw vs Graded: tracking copies the right way",
    excerpt: "Why you should log each physical copy separately — and how grade affects value.",
    date: "2026-06-02",
    body: [
      "A single card line can represent very different things: a raw copy, a PSA 10, a BGS 9.5. In the tracker, each physical copy is its own holding, so you can own the same card multiple times across grades and quantities.",
      "Grade dramatically changes value — a PSA 10 of a key insert can be worth many multiples of its raw counterpart. The tracker values each holding by its grade, falling back to raw, then to a catalog estimate, so your collection total reflects what you actually hold.",
      "When you record what you paid, the collection dashboard shows cost basis and unrealized gain/loss against current value. It's the honest way to see how your collection is doing.",
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
