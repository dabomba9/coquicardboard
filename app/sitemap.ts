import type { MetadataRoute } from "next";
import { getIndexableCardSlugs, getVaultSets, type IndexableCard } from "@/lib/queries";
import { CATALOGS } from "@/lib/catalogs";
import { isSetPageWorthy } from "@/lib/vault-sets";
import { GUIDES } from "@/data/guides";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Render at request time, not build: the card URLs come from Supabase via the
// service-role client, whose env isn't available during the Vercel build (it would
// throw "supabaseUrl is required" while prerendering). At runtime the env is present
// and the underlying reads are cached.
export const dynamic = "force-dynamic";

// The date the card-page TEMPLATE last changed meaningfully (2026-10-19: "About this
// card" text, per-set related cards). A card's lastmod is the later of this and its
// own updated_at, so a site-wide content change is announced to crawlers truthfully.
// Bump it when the card page changes again; don't bump it otherwise.
const CARD_PAGE_REVISED = "2026-10-19";

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
    { url: `${base}/sets`, changeFrequency: "weekly", priority: 0.7 },
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
  // cards stop inviting a recrawl every week — floored at CARD_PAGE_REVISED.
  const cardPages: MetadataRoute.Sitemap = cards.map((c) => ({
    url: `${base}/cards/${c.slug}`,
    lastModified: c.lastModified > CARD_PAGE_REVISED ? c.lastModified : CARD_PAGE_REVISED,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  // Vault set checklists that earn a page (3+ cards, at least one pictured).
  // Pricing isn't counted here — it would mean a price lookup per set; a set
  // with prices but no images still renders, it just isn't advertised.
  let setPages: MetadataRoute.Sitemap = [];
  try {
    for (const c of CATALOGS.filter((x) => x.kind === "vault")) {
      for (const s of await getVaultSets(c.slug)) {
        if (isSetPageWorthy(s)) setPages.push({ url: `${base}/sets/${c.slug}/${s.slug}`, lastModified: CARD_PAGE_REVISED, changeFrequency: "weekly", priority: 0.55 });
      }
    }
  } catch {
    setPages = [];
  }

  return [...staticPages, ...guidePages, ...setPages, ...cardPages];
}
