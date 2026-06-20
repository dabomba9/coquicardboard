"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { playSelect } from "@/lib/sfx";
import { cn } from "@/lib/utils";

type Item = { name: string; slug: string; tier_id: number | null; catalog: string; set: string | null };

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

  // Focus on open; reset query on close.
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) { setQ(""); setActive(0); }
  }, [open]);

  // Server-side search across both catalogs (debounced) while the palette is open.
  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/cards?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => setItems(d.cards ?? []))
        .catch(() => {});
    }, q.trim() ? 180 : 0);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [open, q]);

  const results = items;

  function go(i: Item) {
    playSelect();
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
        className="font-modern w-full max-w-xl overflow-hidden rounded-2xl border border-border/50 bg-background/90 shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border/50 px-3">
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
          <kbd className="rounded-md border border-border/60 bg-foreground/5 px-1.5 py-0.5 text-[11px] leading-none text-muted">esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {results.map((i, idx) => (
            <li key={i.slug}>
              <button
                onMouseEnter={() => setActive(idx)}
                onClick={() => go(i)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  idx === active ? "bg-accent/12 text-accent" : "hover:bg-foreground/5"
                )}
              >
                <span className="truncate">{i.name}</span>
                <span className={cn("shrink-0 text-xs", idx === active ? "text-accent" : "text-muted")}>
                  {i.catalog === "mj-vault" ? "Vault"
                    : i.catalog === "kobe-vault" ? "Kobe Vault"
                    : i.catalog === "kobe-hierarchy" ? "Mamba"
                    : i.tier_id ? `Tier ${i.tier_id}` : ""}
                </span>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No cards found.</li>}
        </ul>
      </div>
    </div>
  );
}
