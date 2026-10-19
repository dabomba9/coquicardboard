import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGuide, type Guide } from "@/data/guides";
import { getHierarchyCatalog } from "@/lib/queries";
import { CardThumb } from "@/components/card-thumb";
import { legendArtForCatalog } from "@/lib/legends";
import { catalogMeta } from "@/lib/catalogs";
import { JsonLd } from "@/components/json-ld";
import { articleJsonLd } from "@/lib/structured-data";

// Request-time, not build-time: a guide's card block reads the catalog through the
// service-role client, whose env is absent during a Vercel build — prerendering it
// would throw "supabaseUrl is required" (same reason app/sitemap.ts is dynamic).
// getHierarchyCatalog is cached for an hour, so the cost is a cache hit.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) return {};
  return {
    title: g.title,
    description: g.excerpt,
    alternates: { canonical: `/guides/${slug}` },
    openGraph: {
      title: `${g.title} · Coqui Cardboard`,
      description: g.excerpt,
      url: `/guides/${slug}`,
      type: "article",
      publishedTime: g.date,
    },
  };
}

// `slugs` (hand-picked, in the guide's order) wins over `tier`; neither = whole catalog.
function pickCards<T extends { slug: string; tier_id: number | null }>(
  cards: T[],
  list: NonNullable<Guide["cardList"]>
): T[] {
  if (list.slugs) {
    const bySlug = new Map(cards.map((c) => [c.slug, c]));
    return list.slugs.map((s) => bySlug.get(s)).filter((c): c is T => !!c);
  }
  return cards.filter((c) => list.tier == null || c.tier_id === list.tier);
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const listed = guide.cardList ? pickCards(await getHierarchyCatalog(guide.cardList.catalog), guide.cardList) : [];
  // The footer points at the catalog the guide is about; guides with no card block
  // are the original MJ explainers.
  const explore = catalogMeta(guide.cardList?.catalog) ?? catalogMeta("mj-hierarchy")!;

  return (
    <article className="mx-auto max-w-2xl px-4 py-10">
      <JsonLd data={articleJsonLd({ title: guide.title, description: guide.excerpt, slug: guide.slug, date: guide.date })} />
      <Link href="/guides" className="text-sm text-muted hover:text-foreground">← Guides</Link>
      <h1 className="mt-4 font-display text-2xl tracking-tight">{guide.title}</h1>
      <div className="mt-1 text-sm text-muted">
        {new Date(guide.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
      </div>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed">
        {guide.body.map((p, i) => <p key={i}>{p}</p>)}
      </div>
      {guide.cardList && listed.length > 0 && (
        <section className="mt-10">
          <h2 className="border-b border-border/50 pb-2 font-sans text-sm uppercase tracking-wide">
            {guide.cardList.heading}
            <span className="ml-2 font-data text-muted">{listed.length}</span>
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {listed.map((c) => (
              <Link key={c.id} href={`/cards/${c.slug}`} className="group">
                <CardThumb
                  card={c}
                  placeholderArt={legendArtForCatalog(guide.cardList!.catalog)}
                  className="transition-transform group-hover:-translate-y-1"
                />
                <div className="mt-1 line-clamp-2 text-xs leading-tight text-muted group-hover:text-foreground">
                  {c.name}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 border-t border-border pt-6">
        <Link href={explore.href} className="text-sm text-accent hover:underline">Explore the {explore.label} →</Link>
      </div>
    </article>
  );
}
