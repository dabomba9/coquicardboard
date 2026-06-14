import type { MetadataRoute } from "next";
import { getHierarchyCatalog, getVaultSlugs } from "@/lib/queries";
import { GUIDES } from "@/data/guides";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Full sitemap: static pages + guides + every catalog card (~378 hierarchy +
// ~12k vault). Well under the 50k-URL single-sitemap limit. Uses the slim cached
// slug list for the vault (the full catalog is too big for the data cache).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [hierarchy, vaultSlugs] = await Promise.all([getHierarchyCatalog(), getVaultSlugs()]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/mj-hierarchy`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/vault`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/guides`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const guidePages: MetadataRoute.Sitemap = GUIDES.map((g) => ({
    url: `${base}/guides/${g.slug}`,
    lastModified: g.date,
    changeFrequency: "yearly",
    priority: 0.5,
  }));

  const slugs = [...hierarchy.map((c) => c.slug), ...vaultSlugs];
  const cardPages: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${base}/cards/${slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticPages, ...guidePages, ...cardPages];
}
