import Link from "next/link";

/** Shared wrapper for the long-form legal pages (terms, privacy). */
export function LegalDoc({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm text-muted hover:text-foreground">← Home</Link>
      <h1 className="mt-4 font-display text-2xl tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted">Last updated {updated}</p>
      <p className="mt-4 rounded-xl border border-border/50 bg-card/50 px-4 py-3 text-[13px] text-muted">
        This is a general-purpose template provided for transparency and is not legal advice. Coqui Cardboard is an
        independent, fan-made project; please review and adapt this document for your own circumstances.
      </p>
      <div className="legal mt-6">{children}</div>
    </article>
  );
}
