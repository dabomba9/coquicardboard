// Pure schema.org JSON-LD builders. Absolute URLs use NEXT_PUBLIC_SITE_URL.
// We don't sell cards, so a priced card is modeled as an AggregateOffer (a range
// across many marketplace sellers); unpriced cards carry no `offers` at all.

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export type JsonLdObject = Record<string, unknown>;

export function productJsonLd(p: {
  name: string;
  slug: string;
  description: string;
  image?: string | null;
  brand?: string | null;
  category?: string;
  pricesUsd?: number[];
  offerUrl?: string;
}): JsonLdObject {
  const data: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    category: p.category ?? "Sports Trading Card",
    url: `${BASE}/cards/${p.slug}`,
  };
  if (p.image) data.image = p.image;
  if (p.brand) data.brand = { "@type": "Brand", name: p.brand };

  const prices = (p.pricesUsd ?? []).filter((n) => Number.isFinite(n) && n > 0);
  if (prices.length) {
    data.offers = {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: Math.min(...prices).toFixed(2),
      highPrice: Math.max(...prices).toFixed(2),
      offerCount: prices.length,
      availability: "https://schema.org/InStock",
      ...(p.offerUrl ? { url: p.offerUrl } : {}),
    };
  }
  return data;
}

export function breadcrumbJsonLd(p: { name: string; slug: string; catalog: string }): JsonLdObject {
  const cat =
    p.catalog === "mj-vault" ? { name: "Jordan Vault", url: `${BASE}/vault` }
    : p.catalog === "kobe-vault" ? { name: "Kobe Vault", url: `${BASE}/kobe-vault` }
    : p.catalog === "clemente-vault" ? { name: "Clemente Vault", url: `${BASE}/clemente-vault` }
    : p.catalog === "killebrew-vault" ? { name: "Killebrew Vault", url: `${BASE}/killebrew-vault` }
    : p.catalog === "mamba-hierarchy" ? { name: "Mamba Hierarchy", url: `${BASE}/mamba-hierarchy` }
    : { name: "MJ Hierarchy", url: `${BASE}/mj-hierarchy` };
  const catName = cat.name;
  const catUrl = cat.url;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: catName, item: catUrl },
      { "@type": "ListItem", position: 3, name: p.name, item: `${BASE}/cards/${p.slug}` },
    ],
  };
}

export function websiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Coqui Cardboard",
    url: `${BASE}/`,
    // The vault page is a real server-rendered search results URL (?q=…).
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${BASE}/vault?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Coqui Cardboard",
    url: `${BASE}/`,
    logo: `${BASE}/icon.svg`,
  };
}

export function articleJsonLd(p: { title: string; description: string; slug: string; date: string }): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.title,
    description: p.description,
    datePublished: p.date,
    url: `${BASE}/guides/${p.slug}`,
    author: { "@type": "Organization", name: "Coqui Cardboard" },
  };
}
