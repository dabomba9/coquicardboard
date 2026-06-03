import type { Holding } from "@/lib/types";

export type OwnedCardMeta = {
  id: string;
  name: string;
  slug: string;
  tier_id: number;
  set_name: string | null;
  print_run: number | null;
  serial_numbered: boolean;
  catalog_value_cents: number | null;
};

export type PriceHistoryRow = {
  card_id: string;
  grade_key: string;
  value_cents: number;
  recorded_on: string;
};

export function holdingGradeKey(h: Pick<Holding, "condition_type" | "grading_company" | "grade">): string {
  return h.condition_type === "graded" && h.grading_company && h.grade != null
    ? `${h.grading_company}${h.grade}`
    : "raw";
}

// Best current value (cents) for a holding: grade-matched price → raw → catalog.
export function holdingValue(
  h: Holding,
  priceMap: Map<string, number>,
  meta: Map<string, OwnedCardMeta>
): number {
  const gk = holdingGradeKey(h);
  const unit =
    priceMap.get(`${h.card_id}|${gk}`) ??
    priceMap.get(`${h.card_id}|raw`) ??
    meta.get(h.card_id)?.catalog_value_cents ??
    0;
  return unit * Math.max(h.quantity, 1);
}

export type GroupRow = { label: string; value: number; count: number };

// Aggregate collection value by a chosen dimension.
export function valueByGroup(
  holdings: Holding[],
  meta: Map<string, OwnedCardMeta>,
  priceMap: Map<string, number>,
  by: "tier" | "set" | "grade"
): GroupRow[] {
  const acc = new Map<string, { value: number; cards: Set<string> }>();
  for (const h of holdings) {
    const m = meta.get(h.card_id);
    if (!m) continue;
    const label =
      by === "tier" ? `Tier ${m.tier_id}` :
      by === "set" ? (m.set_name ?? "Unassigned") :
      h.condition_type === "graded" && h.grading_company && h.grade != null ? `${h.grading_company} ${h.grade}` : "Raw";
    const e = acc.get(label) ?? { value: 0, cards: new Set() };
    e.value += holdingValue(h, priceMap, meta);
    e.cards.add(h.card_id);
    acc.set(label, e);
  }
  return [...acc.entries()]
    .map(([label, e]) => ({ label, value: e.value, count: e.cards.size }))
    .sort((a, b) => b.value - a.value);
}

export type Mover = { cardId: string; name: string; slug: string; gradeKey: string; pct: number; end: number };

// % change over the available price_history window for each owned (card,grade).
export function biggestMovers(
  holdings: Holding[],
  meta: Map<string, OwnedCardMeta>,
  rows: PriceHistoryRow[],
  topN = 5
): { gainers: Mover[]; losers: Mover[] } {
  // series keyed card|grade → [{date,value}] sorted
  const series = new Map<string, { date: string; value: number }[]>();
  for (const r of rows) {
    const k = `${r.card_id}|${r.grade_key}`;
    (series.get(k) ?? series.set(k, []).get(k)!).push({ date: r.recorded_on, value: r.value_cents });
  }
  for (const arr of series.values()) arr.sort((a, b) => a.date.localeCompare(b.date));

  const seen = new Set<string>();
  const movers: Mover[] = [];
  for (const h of holdings) {
    const m = meta.get(h.card_id);
    if (!m) continue;
    const gk = holdingGradeKey(h);
    const key = `${h.card_id}|${gk}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const s = series.get(key) ?? series.get(`${h.card_id}|raw`);
    if (!s || s.length < 2) continue;
    const start = s[0].value, end = s[s.length - 1].value;
    if (start <= 0) continue;
    movers.push({ cardId: h.card_id, name: m.name, slug: m.slug, gradeKey: gk, pct: (end - start) / start, end });
  }
  const byPct = [...movers].sort((a, b) => b.pct - a.pct);
  return {
    gainers: byPct.slice(0, topN),
    losers: byPct.filter((x) => x.pct < 0).slice(-topN).reverse(),
  };
}

// Rarity highlights from owned cards.
export function rarityHighlights(holdings: Holding[], meta: Map<string, OwnedCardMeta>) {
  const ownedIds = [...new Set(holdings.map((h) => h.card_id))];
  const metas = ownedIds.map((id) => meta.get(id)).filter(Boolean) as OwnedCardMeta[];
  const serialOwned = metas.filter((m) => m.serial_numbered).length;
  const lowestPrints = metas
    .filter((m) => m.print_run != null)
    .sort((a, b) => (a.print_run! - b.print_run!))
    .slice(0, 5)
    .map((m) => ({ name: m.name, slug: m.slug, print_run: m.print_run! }));
  return { ownedCount: ownedIds.length, serialOwned, lowestPrints };
}
