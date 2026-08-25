// Simple static guides. Add entries here; no CMS needed yet.
export type Guide = {
  slug: string;
  title: string;
  excerpt: string;
  date: string; // ISO
  body: string[]; // paragraphs
  // Optional live card block, resolved from the catalog at request time rather than
  // frozen into the prose — so a guide about a tier can't drift out of date as cards
  // are added or re-imaged, and every entry becomes a real link into a card page.
  cardList?: {
    heading: string;
    catalog: string;
    tier?: number;
  };
};

export const GUIDES: Guide[] = [
  {
    slug: "every-tier-1-jordan-card",
    title: "Every Tier 1 Michael Jordan card, and what Tier 1 actually means",
    excerpt:
      "All 27 cards in the top tier — and why 25 of them come from just three years.",
    date: "2026-08-25",
    body: [
      "Tier 1 — The Pinnacle — holds 27 cards. Look at when they were printed and something jumps out: 25 of the 27 are from 1996, 1997 or 1998, and 15 are from 1997 alone. The top of the Michael Jordan card world is not spread across his career. It is concentrated almost entirely in a three-year window near the end of it.",
      "That window is the premium insert era. Serial numbering went mainstream, manufacturers started printing deliberately tiny parallel runs, and the chase card was invented more or less as we know it today. Twenty-three of these 27 cards carry a stated print run, from /150 down to the 1998 NBA Hoops Starting Five #23 at /5. Scarcity stopped being an accident of survival and became a number printed on the card.",
      "Only two cards escape that window, and they are the two rookies: the 1984 Star #101 and the 1986 Fleer #57. Neither is serial numbered. They earn their place a different way — they are the beginning, and there is only one of those. Two more cards sit in the era but carry no print run at all, the 1997 Ultra Stars Gold #1 and the 1997 E-X2001 Jambalaya #6, both rare through production reality rather than a stamped number.",
      "You can also see how sets cluster. The 1997 Flair Showcase Legacy Collection contributes four cards — Rows 0 through 3, the full ladder — and the 1996 edition contributes three more. Across the whole tier, 27 cards come from 17 distinct sets, so roughly a third arrive in groups rather than alone. When a set shows up more than once here, it is usually because the set itself was built as a tiered chase.",
      "One honest note about value. Ten of these 27 currently show a live eBay asking price; the rest read \u201cNo recent sales yet.\u201d That is not a gap in the tracker so much as a fact about the cards. Pricing here only counts listings that actually match the card, and it will not value a numbered parallel using comps from its base version. For a card with a print run of 5, there is frequently nothing on the market to match against at all. An empty price is usually telling you something true about scarcity.",
      "The practical way to use this tier: treat it as a map of what the ceiling looks like, not a shopping list. Most collections will never hold a PMG. But knowing that the peak is a 1996\u201398 phenomenon tells you where to look when you want a card that feels like the top of the hobby, and the tiers below fill in the attainable version of the same story.",
    ],
    cardList: {
      heading: "All 27 Tier 1 cards",
      catalog: "mj-hierarchy",
      tier: 1,
    },
  },
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
