import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVaultSets, getRawPrices } from "@/lib/queries";
import { catalogMeta } from "@/lib/catalogs";
import { playerForCatalog } from "@/lib/image-search";
import { legendArtForCatalog } from "@/lib/legends";
import { formatCardNumber } from "@/lib/card-about";
import { isSetPageWorthy } from "@/lib/vault-sets";
import { CardThumb } from "@/components/card-thumb";
import { formatUsd } from "@/lib/utils";

// Checklist pages for vault sets: every card the vault holds from one set, with
// images and observed eBay prices. Request-time, like the vault pages (the catalog
// read needs the service-role env, which the build doesn't have).
export const dynamic = "force-dynamic";

type Params = Promise<{ catalog: string; set: string }>;

async function load(params: Params) {
  const { catalog, set } = await params;
  const meta = catalogMeta(catalog);
  if (!meta || meta.kind !== "vault") return null;
  const found = (await getVaultSets(catalog)).find((s) => s.slug === set);
  if (!found) return null;
  const prices = await getRawPrices(found.cards.map((c) => c.id));
  return { catalog, meta, set: found, prices, player: playerForCatalog(catalog) };
}

const yearSpan = (a: number | null, b: number | null) => (a == null ? null : a === b ? String(a) : `${a}–${b}`);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const d = await load(params);
  if (!d) return {};
  const { set, meta, player, prices } = d;
  const url = `/sets/${d.catalog}/${set.slug}`;
  const title = `${set.name} — ${player} checklist`;
  const description = `All ${set.cards.length} ${player} cards from ${set.name} in the ${meta.label}: a checklist with card images and eBay prices.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    // Same rule as card pages: nothing to show beyond a list of names → not indexed.
    ...(isSetPageWorthy(set, prices.size) ? {} : { robots: { index: false, follow: true } }),
    openGraph: { title: `${title} · Coqui Cardboard`, description, url, type: "website" },
  };
}

export default async function SetPage({ params }: { params: Params }) {
  const d = await load(params);
  if (!d) notFound();
  const { set, meta, player, prices, catalog } = d;
  const priced = set.cards.filter((c) => prices.has(c.id));
  const values = priced.map((c) => prices.get(c.id)!);
  const years = yearSpan(set.yearFrom, set.yearTo);
  const art = legendArtForCatalog(catalog);

  // A short summary from the checklist's own numbers.
  const summary = [
    `The ${meta.label} tracks ${set.cards.length} ${player} card${set.cards.length === 1 ? "" : "s"} from ${set.name}${years ? `, issued ${years}` : ""}.`,
    `${set.imaged} ${set.imaged === 1 ? "has" : "have"} a pictured scan.`,
    values.length
      ? `${values.length} currently ${values.length === 1 ? "has" : "have"} an eBay price, ranging from ${formatUsd(Math.min(...values))} to ${formatUsd(Math.max(...values))} raw.`
      : null,
  ].filter(Boolean).join(" ");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href={meta.href} className="text-[11px] uppercase tracking-wide text-muted hover:text-foreground">← {meta.label}</Link>
      <h1 className="mt-4 font-display text-lg leading-relaxed tracking-tight">{set.name} checklist</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{summary}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {set.cards.map((c) => (
          <Link key={c.id} href={`/cards/${c.slug}`} className="group">
            <CardThumb
              card={{ name: c.name ?? "", card_number: c.card_number, year: c.year, tier_id: 4, image_url: c.image_url, sets: { name: set.name } }}
              placeholderArt={art}
              className="transition-transform group-hover:-translate-y-1"
            />
            <div className="mt-1 text-xs leading-tight">
              <span className="font-data text-muted">{formatCardNumber(c.card_number)}</span>
              {prices.has(c.id) && <span className="ml-1.5 font-num">{formatUsd(prices.get(c.id)!)}</span>}
            </div>
            <div className="line-clamp-2 text-[11px] leading-tight text-muted group-hover:text-foreground">{c.name}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
