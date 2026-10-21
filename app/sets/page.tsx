import type { Metadata } from "next";
import Link from "next/link";
import { getVaultSets } from "@/lib/queries";
import { CATALOGS } from "@/lib/catalogs";
import { isSetPageWorthy, setsByDecade } from "@/lib/vault-sets";
import { playerForCatalog } from "@/lib/image-search";

// Index of every vault set checklist: one page that links all of them, by vault
// and decade. Request-time like the set pages themselves (service-role read).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Set checklists — Jordan, Kobe, Clemente & Killebrew",
  description: "Every card set checklist in the Coqui Cardboard vaults, by player and decade: Michael Jordan, Kobe Bryant, Roberto Clemente and Harmon Killebrew.",
  alternates: { canonical: "/sets" },
};

export default async function SetsIndexPage() {
  const vaults = await Promise.all(
    CATALOGS.filter((c) => c.kind === "vault").map(async (c) => {
      const sets = (await getVaultSets(c.slug)).filter((s) => isSetPageWorthy(s));
      return { catalog: c, player: playerForCatalog(c.slug), sets, decades: setsByDecade(sets) };
    })
  );
  const total = vaults.reduce((n, v) => n + v.sets.length, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-lg uppercase tracking-tight">Set checklists</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
        {total} set checklists across the four vaults. Each one lists every card the vault tracks from that set, with
        images and eBay prices where we have them.
      </p>

      {/* Jump links */}
      <nav aria-label="Vaults" className="mt-4 flex flex-wrap gap-3 text-sm">
        {vaults.map((v) => (
          <a key={v.catalog.slug} href={`#${v.catalog.slug}`} className="text-accent hover:underline">
            {v.catalog.label} ({v.sets.length})
          </a>
        ))}
      </nav>

      {vaults.map((v) => (
        <section key={v.catalog.slug} id={v.catalog.slug} className="mt-10 scroll-mt-24">
          <h2 className="border-b border-border/50 pb-2 font-sans text-sm uppercase tracking-wide">
            {v.player} · <Link href={v.catalog.href} className="hover:underline">{v.catalog.label}</Link>
          </h2>
          {v.decades.map((d) => (
            <div key={d.decade} className="mt-4">
              <h3 className="font-sans text-[10px] uppercase tracking-wide text-muted">{d.decade}</h3>
              <ul className="mt-1.5 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {d.sets.map((s) => (
                  <li key={s.slug}>
                    <Link href={`/sets/${v.catalog.slug}/${s.slug}`} className="hover:text-accent hover:underline">{s.name}</Link>
                    <span className="ml-1.5 font-data text-xs text-muted">{s.cards.length}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
