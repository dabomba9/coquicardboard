"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CardThumb } from "@/components/card-thumb";
import { Button, Input, Panel } from "@/components/ui/primitives";
import { setCardImage, clearCardImage, fetchCardImage } from "@/lib/actions/admin-images";

export type ManagerCard = {
  id: string;
  slug: string;
  name: string;
  tier_id: number;
  card_number: string | null;
  year: number | null;
  set_name: string | null;
  image_url: string | null;
};

export function ImageManager({ cards }: { cards: ManagerCard[] }) {
  const [q, setQ] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  // Local overlay of saved image_urls so the list reflects saves immediately.
  const [local, setLocal] = useState<Record<string, string | null>>({});

  const [bulk, setBulk] = useState<{ running: boolean; done: number; total: number } | null>(null);

  const current = (c: ManagerCard) => (c.id in local ? local[c.id] : c.image_url);

  const withImages = cards.filter((c) => current(c)).length;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return cards.filter((c) => {
      if (missingOnly && current(c)) return false;
      if (needle && !`${c.name} ${c.set_name ?? ""}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, q, missingOnly, local]);

  async function autoFetchVisible() {
    const targets = filtered.filter((c) => !current(c));
    if (targets.length === 0) return;
    setBulk({ running: true, done: 0, total: targets.length });
    for (let i = 0; i < targets.length; i++) {
      const res = await fetchCardImage(targets[i].id);
      if (res?.ok && res.imageUrl) setLocal((m) => ({ ...m, [targets[i].id]: res.imageUrl! }));
      setBulk({ running: i + 1 < targets.length, done: i + 1, total: targets.length });
    }
    setBulk((b) => (b ? { ...b, running: false } : null));
  }

  return (
    <div>
      <div className="sticky top-14 z-10 -mx-4 mb-5 flex flex-wrap items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cards…" className="h-9 max-w-xs" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={missingOnly} onChange={(e) => setMissingOnly(e.target.checked)} />
          Missing images only
        </label>
        <Button size="sm" variant="secondary" onClick={autoFetchVisible} disabled={bulk?.running}>
          {bulk?.running ? `Fetching ${bulk.done}/${bulk.total}…` : "Auto-fetch missing (visible)"}
        </Button>
        <span className="ml-auto text-sm text-muted">
          {withImages} / {cards.length} have images
        </span>
      </div>

      <div className="space-y-3">
        {filtered.map((c) => (
          <ImageRow
            key={c.id}
            card={c}
            value={current(c)}
            onSaved={(url) => setLocal((m) => ({ ...m, [c.id]: url }))}
          />
        ))}
        {filtered.length === 0 && <p className="py-10 text-center text-sm text-muted">No cards match.</p>}
      </div>
    </div>
  );
}

function ImageRow({
  card,
  value,
  onSaved,
}: {
  card: ManagerCard;
  value: string | null | undefined;
  onSaved: (url: string | null) => void;
}) {
  const [url, setUrl] = useState(value ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const query = encodeURIComponent(`${card.name} Michael Jordan`);
  const ebay = `https://www.ebay.com/sch/i.html?_nkw=${query}`;
  const google = `https://www.google.com/search?tbm=isch&q=${query}`;

  function save() {
    setError(null);
    start(async () => {
      const res = await setCardImage(card.id, url);
      if (res?.error) setError(res.error);
      else onSaved(url.trim());
    });
  }
  function clear() {
    start(async () => {
      const res = await clearCardImage(card.id);
      if (res?.error) setError(res.error);
      else { setUrl(""); onSaved(null); }
    });
  }
  function fetchImage() {
    setError(null);
    start(async () => {
      const res = await fetchCardImage(card.id);
      if (res?.error) setError(res.error);
      else if (res?.imageUrl) { setUrl(res.imageUrl); onSaved(res.imageUrl); }
    });
  }

  // Preview the typed URL if it looks like one, else the saved value.
  const previewUrl = /^https:\/\//.test(url) ? url : value ?? null;

  return (
    <Panel className="flex gap-4 p-4">
      <div className="w-16 shrink-0">
        <CardThumb card={{ ...card, image_url: previewUrl, sets: card.set_name ? { name: card.set_name } : null }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/cards/${card.slug}`} className="font-medium hover:underline">{card.name}</Link>
            <div className="text-xs text-muted">Tier {card.tier_id}{card.set_name ? ` · ${card.set_name}` : ""}</div>
          </div>
          <div className="shrink-0 text-xs">
            <span className="text-muted">Search: </span>
            <a href={ebay} target="_blank" rel="noreferrer" className="text-accent hover:underline">eBay</a>
            <span className="text-muted"> · </span>
            <a href={google} target="_blank" rel="noreferrer" className="text-accent hover:underline">Google</a>
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste https image URL…"
            className="h-9"
          />
          <Button size="sm" onClick={save} disabled={pending || !url.trim()}>
            {pending ? "…" : "Save"}
          </Button>
          <Button size="sm" variant="secondary" onClick={fetchImage} disabled={pending}>
            Fetch image
          </Button>
          {value && <Button size="sm" variant="ghost" onClick={clear} disabled={pending}>Clear</Button>}
        </div>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    </Panel>
  );
}
