import Link from "next/link";
import type { Metadata } from "next";
import { GUIDES } from "@/data/guides";
import { Panel } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Guides",
  description: "Collecting guides from Coqui Cardboard — tiers, grading, and value.",
  alternates: { canonical: "/guides" },
  openGraph: {
    title: "Guides · Coqui Cardboard",
    description: "Collecting guides from Coqui Cardboard — tiers, grading, and value.",
    url: "/guides",
    type: "website",
  },
};

export default function GuidesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-lg uppercase tracking-tight">Guides</h1>
      <p className="mt-1 text-sm text-muted">Collecting guides for working through the hierarchy.</p>

      <div className="mt-6 space-y-3">
        {GUIDES.map((g) => (
          <Link key={g.slug} href={`/guides/${g.slug}`} className="group block">
            <Panel className="p-5 transition-transform group-hover:-translate-y-0.5">
              <div className="text-xs text-muted">{new Date(g.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</div>
              <h2 className="mt-1 text-lg font-semibold group-hover:text-accent">{g.title}</h2>
              <p className="mt-1 text-sm text-muted">{g.excerpt}</p>
            </Panel>
          </Link>
        ))}
      </div>
    </div>
  );
}
