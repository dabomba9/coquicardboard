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
    // Hand-picked cards, shown in this order (for vaults, where a tier filter
    // doesn't apply). Full DB slugs, e.g. vault cards carry their rc<tcdbId>- prefix.
    slugs?: string[];
  };
};

export const GUIDES: Guide[] = [
  {
    slug: "harmon-killebrew-topps-run",
    title: "Harmon Killebrew on Topps, 1955–1975: the flagship run and eight home-run leader cards",
    excerpt:
      "A Topps card almost every year for two decades, a gap in 1957 that tells you where he was, and the leader cards that track his power.",
    date: "2026-10-19",
    body: [
      "The Killebrew Vault holds 252 cards issued from 1955 to 1976. Topps accounts for 114 of them, with O-Pee-Chee, Post, Bazooka and Jay Publishing picture packs filling in most of the rest. The flagship run is the spine: a Topps base card in every year from the 1955 #124 rookie to the 1975 #640 — with one exception.",
      "That exception is 1957. There is no 1957 Topps Killebrew. His only 1957 card in the vault is a Chattanooga Lookouts team issue, because that is where he spent much of that season, in the minors. He is back in the Topps set in 1958 on #288 and never leaves it again. Counting both 1956 variants of #164, gray back and white back, the full flagship run is 21 cards across 20 years. One of them carries a note collectors care about: the 1963 #500 is marked as a short print.",
      "The more telling cards are the ones he shares. Killebrew led the American League in home runs six times, and Topps' American League Home Run Leaders cards in the vault include him for eight different seasons: 1961, 1962, 1963, 1964, 1966, 1967, 1969 and 1970. The 1969 season also produced the 1975 Topps #207, which pairs him with Willie McCovey as the two leagues' MVPs. Read in order, those leader cards are a box score of his peak, printed a year at a time.",
      "The vault also shows the franchise moving under him. The early picture packs are Washington Senators issues, from Jay Publishing in 1959 and 1960. From 1961 the team was the Minnesota Twins, and the card count climbs with it: 26 cards from 1962, 28 from 1968 and 26 from 1971, the three busiest years in the vault.",
      "A note on what this page doesn't show. Many of the oddball issues here — team picture packs, matchbooks, stamps and premiums — rarely trade, so they read “No recent sales yet” or show placeholder art. That reflects how seldom they change hands, not a gap that more searching would close.",
    ],
    cardList: {
      heading: "Every flagship Topps Killebrew, 1955–1975",
      catalog: "killebrew-vault",
      slugs: [
        "hk6565-1955-topps-124-harmon-killebrew-rc",
        "hk7981787-1956-topps-164-harmon-killebrew-var-var-white-back",
        "hk6823-1956-topps-164-harmon-killebrew-var-gray-back",
        "hk27321-1958-topps-288-harmon-killebrew",
        "hk8479-1959-topps-515-harmon-killebrew",
        "hk27810-1960-topps-210-harmon-killebrew",
        "hk9186-1961-topps-80-harmon-killebrew",
        "hk28321-1962-topps-70-harmon-killebrew",
        "hk10816-1963-topps-500-harmon-killebrew-sp",
        "hk11071-1964-topps-177-harmon-killebrew",
        "hk11883-1965-topps-400-harmon-killebrew",
        "hk29027-1966-topps-120-harmon-killebrew",
        "hk14073-1967-topps-460-harmon-killebrew",
        "hk29775-1968-topps-220-harmon-killebrew",
        "hk30583-1969-topps-375-harmon-killebrew",
        "hk14980-1970-topps-150-harmon-killebrew",
        "hk16106-1971-topps-550-harmon-killebrew",
        "hk16454-1972-topps-51-harmon-killebrew",
        "hk17376-1973-topps-170-harmon-killebrew",
        "hk31314-1974-topps-400-harmon-killebrew",
        "hk19138-1975-topps-640-harmon-killebrew",
      ],
    },
  },
  {
    slug: "roberto-clemente-topps-run",
    title: "Roberto Clemente on Topps, 1955–1973: every flagship card, and the years he was “Bob”",
    excerpt:
      "One Topps card a year for nineteen years — and on thirteen of them, the name on the front isn't the one he used.",
    date: "2026-10-18",
    body: [
      "The Clemente Vault holds 256 cards issued during his playing career, from the 1955 Topps rookie to the 1973 set that came out after his death. The backbone of that list is Topps: a flagship base card every single year, nineteen in a row, from 1955 #164 to 1973 #50. Two years come in variants that collectors treat as separate cards — the 1956 #33 with a gray or a white back, and the 1958 #52 with the team name in white or yellow letters — so the full run is 21 cards.",
      "Read the fronts in order and the name changes. The 1955 and 1956 cards say Roberto Clemente. From 1957 through 1969, every Topps flagship card calls him Bob. Roberto comes back in 1970, on #350, and stays for the last four cards. He was Roberto Clemente, from Carolina, Puerto Rico, and for thirteen years his own flagship card said otherwise.",
      "The vault makes it clear whose habit that was. Between 1957 and 1969, Topps cards in the vault say Bob 51 times and Roberto 19. Bazooka, Topps' own gum brand, says Bob on all 18 of its cards, and O-Pee-Chee, which printed Topps designs in Canada, on 7 of 8. The team and regional issues go the other way: every Jay Publishing picture pack, Kahn's Wieners card, Sportservice, KDKA and Dexter Press issue in those years calls him Roberto, and Post cereal does on 10 of its 12. The name on the card mostly depended on who printed it.",
      "The vault is not only Topps. Pittsburgh team issues, Jay Publishing picture packs, Kahn's Wieners, Post cereal panels, Bazooka boxes, Dexter Press and KDKA cards all show up, and the busiest years are late in his career: 32 cards from 1968, 27 from 1971, 26 from 1972. One set is closest to home. The 1972 Puerto Rican Winter League Stickers include nine Clemente panels, #198 through #206, issued for the league he played in during the winters.",
      "The 1972 Topps #309 is the last flagship card issued in his lifetime. He reached 3,000 hits on September 30, 1972, and died on December 31 of that year in a plane crash while delivering earthquake relief to Nicaragua. The 1973 Topps #50 that closes the run was printed after.",
      "A note on what this page doesn't show. The vault tracks every Clemente card from his playing days, but many of the oddball issues — team photo packs, publicity photos, tattoos and stickers — rarely trade, and some have no pictured copy anywhere we can source. Those cards read “No recent sales yet” or show placeholder art. That is a fact about how few of them survive and change hands, not a gap that more searching would close.",
    ],
    cardList: {
      heading: "Every flagship Topps Clemente, 1955–1973",
      catalog: "clemente-vault",
      slugs: [
        "rc6605-1955-topps-164-roberto-clemente-rc",
        "rc7851097-1956-topps-33-roberto-clemente-var-var-gray-back",
        "rc6682-1956-topps-33-roberto-clemente-var-var-white-back",
        "rc7077-1957-topps-76-bob-clemente",
        "rc27066-1958-topps-52-bob-clemente-var-var-team-name-in-white-letters",
        "rc27067-1958-topps-52-bob-clemente-var-var-team-name-in-yellow-letters",
        "rc8442-1959-topps-478-bob-clemente",
        "rc27926-1960-topps-326-bob-clemente",
        "rc9499-1961-topps-388-bob-clemente",
        "rc28260-1962-topps-10-bob-clemente",
        "rc10857-1963-topps-540-bob-clemente",
        "rc11334-1964-topps-440-bob-clemente",
        "rc11643-1965-topps-160-bob-clemente",
        "rc29210-1966-topps-300-bob-clemente",
        "rc14008-1967-topps-400-bob-clemente",
        "rc29704-1968-topps-150-bob-clemente",
        "rc30253-1969-topps-50-bob-clemente",
        "rc15182-1970-topps-350-roberto-clemente",
        "rc16187-1971-topps-630-roberto-clemente",
        "rc16713-1972-topps-309-roberto-clemente",
        "rc17252-1973-topps-50-roberto-clemente",
      ],
    },
  },
  {
    slug: "black-mamba-tier-kobe-grails",
    title: "The Black Mamba tier: Kobe Bryant's 16 grails, and why ten come from one season",
    excerpt:
      "The top of the Mamba Hierarchy is his rookie year plus a handful of modern autographs — and almost nothing in between.",
    date: "2026-10-18",
    body: [
      "The Mamba Hierarchy ranks 75 Kobe Bryant cards into three tiers: 16 in Black Mamba, 24 in Mamba Mentality and 35 in Foundation. There is no published Kobe hierarchy to follow, so this one is our own curation, weighed on the same things as the Michael Jordan Hierarchy: value, demand, scarcity and how the card looks. The tiers are a judgment call. The patterns inside them are not.",
      "Ten of the sixteen Black Mamba cards come from a single season, 1996–97, his rookie year. That list reads like a tour of the era's premium products: the Topps Chrome #138 and its Refractor, the Bowman's Best Atomic Refractor, the Finest Bronze Refractor, the Flair Showcase Legacy Collection Row 0, the SkyBox Premium Star Rubies, the Metal Precious Metal Gem, the SP, the SkyBox Z-Force Zebut Z-peat and the E-X2000 Star Date 2000.",
      "The other six jump forward. Five are autographs from 2003–04 to 2016–17, all serial numbered: the Upper Deck Exquisite Emblems of Endorsement at /15, the Exquisite Logoman dual autograph with Magic Johnson at 1/1, the Panini Immaculate Autographed Patches at /100, the Flawless Patch Autographs at /25 and the National Treasures Signatures at /35. The sixth, the 2012–13 Prizm Downtown Bound, is the only modern card in the tier without a signature.",
      "What is missing is the middle. No Black Mamba card comes from 1997–98 through 2002–03 — the seasons that include his first three championships. The same weighting holds across the whole hierarchy: 46 of its 75 cards are from 1996. The top of the Kobe market is his first season and the high-end autograph era that came later, not the years he was winning titles.",
      "That is the opposite of the Jordan picture. The top tier of the MJ Hierarchy is concentrated in 1996–98, near the end of his career, when serial numbering and short-print inserts took over. Kobe's rookie season landed in exactly that same window. His first cards were printed in the middle of the premium-insert era, and the hierarchy reflects it.",
    ],
    cardList: {
      heading: "All 16 Black Mamba cards",
      catalog: "mamba-hierarchy",
      tier: 1,
    },
  },
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
