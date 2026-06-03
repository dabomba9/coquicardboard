import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GUIDES, getGuide } from "@/data/guides";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = getGuide(slug);
  return g ? { title: g.title, description: g.excerpt } : {};
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  return (
    <article className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/guides" className="text-sm text-muted hover:text-foreground">← Guides</Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">{guide.title}</h1>
      <div className="mt-1 text-sm text-muted">
        {new Date(guide.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
      </div>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed">
        {guide.body.map((p, i) => <p key={i}>{p}</p>)}
      </div>
      <div className="mt-10 border-t border-border pt-6">
        <Link href="/mj-hierarchy" className="text-sm text-amber-500 hover:underline">Explore the MJ Hierarchy →</Link>
      </div>
    </article>
  );
}
