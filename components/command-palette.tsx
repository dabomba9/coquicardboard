"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type Item = { name: string; slug: string; tier_id: number; set: string | null };

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mj:open-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mj:open-search", onOpen);
    };
  }, []);

  // Lazy-load the catalog the first time it opens.
  useEffect(() => {
    if (open && items.length === 0) {
      fetch("/api/cards").then((r) => r.json()).then((d) => setItems(d.cards ?? [])).catch(() => {});
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
    // Reset query when the palette closes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) { setQ(""); setActive(0); }
  }, [open, items.length]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items.slice(0, 12);
    return items
      .filter((i) => `${i.name} ${i.set ?? ""}`.toLowerCase().includes(needle))
      .slice(0, 30);
  }, [q, items]);

  function go(i: Item) {
    setOpen(false);
    router.push(`/cards/${i.slug}`);
  }

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search size={16} className="text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Enter" && results[active]) go(results[active]);
            }}
            placeholder="Search cards…"
            className="h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto py-1">
          {results.map((i, idx) => (
            <li key={i.slug}>
              <button
                onMouseEnter={() => setActive(idx)}
                onClick={() => go(i)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${idx === active ? "bg-foreground/5" : ""}`}
              >
                <span className="truncate">{i.name}</span>
                <span className="shrink-0 text-xs text-muted">Tier {i.tier_id}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No cards found.</li>}
        </ul>
      </div>
    </div>
  );
}
