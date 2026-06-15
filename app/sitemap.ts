import type { MetadataRoute } from "next";
import { getHierarchyCatalog, getVaultSlugs } from "@/lib/queries";
import { GUIDES } from "@/data/guides";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Render at request time, not build: the card URLs come from Supabase via the
// service-role client, whose env isn't available during the Vercel build (it would
// throw "supabaseUrl is required" while prerendering). At runtime the env is present
// and the underlying reads are cached.
export const dynamic = "force-dynamic";

// Full sitemap: static pages + guides + every catalog card (~378 hierarchy +
// ~12k vault). Well under the 50k-URL single-sitemap limit. Uses the slim cached
// slug list for the vault (the full catalog is too big for the data cache).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Resilient: if the catalog reads fail (e.g. DB unreachable), still emit the
  // static + guide URLs rather than 500 the whole sitemap.
  let cardSlugs: string[] = [];
  try {
    const [hierarchy, vaultSlugs] = await Promise.all([getHierarchyCatalog(), getVaultSlugs()]);
    cardSlugs = [...hierarchy.map((c) => c.slug), ...vaultSlugs];
  } catch {
    cardSlugs = [];
  }

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/mj-hierarchy`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/vault`, changeFrequency: "weekly", priority: 0.8 },
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

  const cardPages: MetadataRoute.Sitemap = cardSlugs.map((slug) => ({
    url: `${base}/cards/${slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticPages, ...guidePages, ...cardPages];
}
