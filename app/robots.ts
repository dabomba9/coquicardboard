import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep private/auth + per-user surfaces out of the index.
      disallow: ["/collection", "/want-list", "/analytics", "/settings", "/login", "/admin", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
