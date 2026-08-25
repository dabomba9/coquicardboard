import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGuide } from "@/data/guides";
import { getHierarchyCatalog } from "@/lib/queries";
import { CardThumb } from "@/components/card-thumb";
import { legendArtForCatalog } from "@/lib/legends";
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

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const listed = guide.cardList
    ? (await getHierarchyCatalog(guide.cardList.catalog)).filter(
        (c) => guide.cardList!.tier == null || c.tier_id === guide.cardList!.tier
      )
    : [];

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
        <Link href="/mj-hierarchy" className="text-sm text-accent hover:underline">Explore the MJ Hierarchy →</Link>
      </div>
    </article>
  );
}
