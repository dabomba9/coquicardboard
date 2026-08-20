import type { MetadataRoute } from "next";
import { getIndexableCardSlugs, type IndexableCard } from "@/lib/queries";
import { GUIDES } from "@/data/guides";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Render at request time, not build: the card URLs come from Supabase via the
// service-role client, whose env isn't available during the Vercel build (it would
// throw "supabaseUrl is required" while prerendering). At runtime the env is present
// and the underlying reads are cached.
export const dynamic = "force-dynamic";

// Static pages + guides + every card WORTH indexing — one with an image or a real
// eBay price. The other ~19k render a name over a placeholder; submitting them
// spends crawl budget on near-duplicates and drags on the pages that can rank.
// They stay crawlable via the catalog grids and carry noindex,follow.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Resilient: if the catalog reads fail (e.g. DB unreachable), still emit the
  // static + guide URLs rather than 500 the whole sitemap.
  let cards: IndexableCard[] = [];
  try {
    cards = await getIndexableCardSlugs();
  } catch {
    cards = [];
  }

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/mj-hierarchy`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/mamba-hierarchy`, changeFrequency: "weekly", priority: 0.88 },
    { url: `${base}/kobe-hierarchy`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${base}/vault`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/kobe-vault`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/clemente-vault`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/killebrew-vault`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/guides`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const guidePages: MetadataRoute.Sitemap = GUIDES.map((g) => ({
    url: `${base}/guides/${g.slug}`,
    lastModified: g.date,
    changeFrequency: "yearly",
    priority: 0.5,
  }));

  // lastModified comes from cards.updated_at (trigger-maintained), so unchanged
  // cards stop inviting a recrawl every week.
  const cardPages: MetadataRoute.Sitemap = cards.map((c) => ({
    url: `${base}/cards/${c.slug}`,
    lastModified: c.lastModified,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticPages, ...guidePages, ...cardPages];
}
