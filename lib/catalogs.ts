// Every catalog in `cards.catalog`, in display order. There is no catalogs table —
// the slug is free text (migration 0006) — so this is the one place that names
// them. Newer multi-catalog surfaces (profile, want list, collection) read it;
// older hard-coded lists (nav, footer, sitemap…) predate it.

export type CatalogMeta = {
  slug: string;
  label: string;
  kind: "hierarchy" | "vault";
  href: string;
};

export const CATALOGS: CatalogMeta[] = [
  { slug: "mj-hierarchy", label: "MJ Hierarchy", kind: "hierarchy", href: "/mj-hierarchy" },
  { slug: "mamba-hierarchy", label: "Mamba Hierarchy", kind: "hierarchy", href: "/mamba-hierarchy" },
  { slug: "kobe-hierarchy", label: "Mamba Origins", kind: "hierarchy", href: "/mamba-origins" },
  { slug: "mj-vault", label: "Jordan Vault", kind: "vault", href: "/vault" },
  { slug: "kobe-vault", label: "Kobe Vault", kind: "vault", href: "/kobe-vault" },
  { slug: "clemente-vault", label: "Clemente Vault", kind: "vault", href: "/clemente-vault" },
  { slug: "killebrew-vault", label: "Killebrew Vault", kind: "vault", href: "/killebrew-vault" },
];

const BY_SLUG = new Map(CATALOGS.map((c, i) => [c.slug, { ...c, order: i }]));

export function catalogMeta(slug: string | null | undefined): CatalogMeta | undefined {
  return slug ? BY_SLUG.get(slug) : undefined;
}

/** Display name; an unknown slug falls back to itself rather than vanishing. */
export function catalogLabel(slug: string | null | undefined): string {
  return catalogMeta(slug)?.label ?? slug ?? "Other";
}

/** Sort key: registry order, unknown catalogs last. */
export function catalogOrder(slug: string | null | undefined): number {
  return (slug ? BY_SLUG.get(slug)?.order : undefined) ?? CATALOGS.length;
}
