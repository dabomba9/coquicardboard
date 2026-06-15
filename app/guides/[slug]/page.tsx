import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GUIDES, getGuide } from "@/data/guides";
import { JsonLd } from "@/components/json-ld";
import { articleJsonLd } from "@/lib/structured-data";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

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
      <div className="mt-10 border-t border-border pt-6">
        <Link href="/mj-hierarchy" className="text-sm text-accent hover:underline">Explore the MJ Hierarchy →</Link>
      </div>
    </article>
  );
}
