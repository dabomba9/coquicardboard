"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Search, Layers, LayoutGrid, Heart, Library, ChevronDown } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { SoundToggle } from "@/components/sound-toggle";
import { CoquiGlyph } from "@/components/coqui-glyph";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; accent?: boolean };
type Group = { label: string; items: Item[] };

const openSearch = () => window.dispatchEvent(new Event("mj:open-search"));

// Catalogs grouped by player so the bar stays compact.
const GROUPS: Group[] = [
  { label: "Jordan", items: [
    { href: "/mj-hierarchy", label: "MJ Hierarchy" },
    { href: "/vault", label: "Jordan Vault" },
  ] },
  { label: "Kobe", items: [
    { href: "/mamba-hierarchy", label: "Mamba Hierarchy" },
    { href: "/kobe-vault", label: "Kobe Vault" },
  ] },
];

const linkCls = (active: boolean, accent?: boolean) =>
  cn(
    "rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
    accent
      ? "text-[var(--gold)] hover:bg-[var(--gold)]/10"
      : active
        ? "bg-accent/12 text-accent"
        : "text-muted hover:bg-foreground/5 hover:text-foreground"
  );

// Desktop dropdown for a group of catalog links. Opens on hover + click; closes on
// outside-click, Escape, and navigation.
function NavMenu({ group, pathname }: { group: Group; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const groupActive = group.items.some((i) => i.href === pathname);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(linkCls(groupActive), "inline-flex items-center gap-1")}
      >
        {group.label}
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        // pt-1.5 (not mt) keeps a visual gap that's still inside the hover area, so
        // moving from the trigger to a link doesn't fire onMouseLeave + close first.
        <div className="absolute left-0 top-full z-20 pt-1.5">
        <div
          role="menu"
          className="min-w-44 rounded-2xl border border-border/45 bg-background/95 p-1.5 shadow-[0_12px_34px_-12px_rgba(0,0,0,0.40)] backdrop-blur-xl"
        >
          {group.items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={cn("block rounded-xl px-3 py-2 text-sm font-medium transition-colors", pathname === i.href ? "bg-accent/12 text-accent" : "text-muted hover:bg-foreground/5 hover:text-foreground")}
            >
              {i.label}
            </Link>
          ))}
        </div>
        </div>
      )}
    </div>
  );
}

export function NavBar({ authed, admin }: { authed: boolean; admin: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // The compact (grouped) nav fits tablets for visitors, so reveal it at `md`;
  // signed-in users have extra app links, so keep their full bar at `lg`. (Literal
  // class strings so Tailwind generates both breakpoints.)
  const showFlex = authed ? "lg:flex" : "md:flex";
  const showInline = authed ? "lg:inline-flex" : "md:inline-flex";
  const hideAbove = authed ? "lg:hidden" : "md:hidden";

  const authedLinks: Item[] = authed
    ? [
        { href: "/collection", label: "My Collection" },
        { href: "/analytics", label: "Insights" },
        { href: "/want-list", label: "Want List" },
      ]
    : [];
  const adminLinks: Item[] = admin ? [{ href: "/admin/images", label: "Admin", accent: true }] : [];

  return (
    <header className="font-modern fixed inset-x-0 top-0 z-30 px-3 pt-3 sm:px-4">
      <nav className="mx-auto flex h-16 max-w-5xl items-center gap-3 rounded-full border border-border/45 bg-background/65 px-3 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.30)] backdrop-blur-xl sm:px-5">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight" onClick={() => setOpen(false)}>
          <CoquiGlyph size={22} className="text-accent" aria-label="" />
          <span><span className="text-accent">Coqui</span> Cardboard</span>
        </Link>

        {/* Desktop nav — grouped dropdowns + a couple standalone links */}
        <div className={cn("ml-3 hidden items-center gap-1", showFlex)}>
          {GROUPS.map((g) => <NavMenu key={g.label} group={g} pathname={pathname} />)}
          <Link href="/guides" className={linkCls(pathname === "/guides")}>Guides</Link>
          {(authedLinks.length > 0 || adminLinks.length > 0) && <span className="mx-1 h-5 w-px bg-border/40" aria-hidden="true" />}
          {[...authedLinks, ...adminLinks].map((l) => (
            <Link key={l.href} href={l.href} className={linkCls(pathname === l.href, l.accent)}>{l.label}</Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {/* Prominent search pill (desktop) */}
          <button
            type="button"
            aria-label="Search cards (⌘K)"
            onClick={openSearch}
            className={cn("hidden h-9 w-44 items-center gap-2 rounded-full border border-border/60 bg-foreground/[0.03] px-3.5 text-sm text-muted transition-colors hover:border-border hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-56", showInline)}
          >
            <Search size={15} />
            <span>Search cards…</span>
            <kbd className="ml-auto rounded-md border border-border/60 bg-foreground/5 px-1.5 py-0.5 text-[10px] font-medium leading-none">⌘K</kbd>
          </button>

          <SoundToggle />
          <ThemeToggle />

          <div className={cn("hidden items-center gap-2", showFlex)}>
            {authed ? (
              <>
                <Link href="/settings" className="rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted transition-colors hover:bg-foreground/5 hover:text-foreground">Settings</Link>
                <form action={signOut}>
                  <button className="rounded-full border border-border/60 px-4 py-1.5 text-sm font-medium whitespace-nowrap text-foreground transition-colors hover:bg-foreground/5">Sign out</button>
                </form>
              </>
            ) : (
              <Link href="/login" className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-black transition hover:brightness-105">Sign in</Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={cn("inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-foreground/5 hover:text-foreground", hideAbove)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer — grouped vertically */}
      {open && (
        <div className={cn("mx-auto mt-2 max-w-5xl rounded-2xl border border-border/40 bg-background/90 px-4 py-3 shadow-[0_10px_34px_-12px_rgba(0,0,0,0.40)] backdrop-blur-xl", hideAbove)}>
          <div className="flex flex-col gap-1">
            {GROUPS.map((g) => (
              <div key={g.label} className="mb-1">
                <div className="px-3 pb-1 pt-2 font-sans text-[10px] uppercase tracking-wide text-muted">{g.label}</div>
                {g.items.map((i) => (
                  <Link key={i.href} href={i.href} onClick={() => setOpen(false)} className={linkCls(pathname === i.href)}>{i.label}</Link>
                ))}
              </div>
            ))}
            <Link href="/guides" onClick={() => setOpen(false)} className={linkCls(pathname === "/guides")}>Guides</Link>
            {[...authedLinks, ...adminLinks].map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={linkCls(pathname === l.href, l.accent)}>{l.label}</Link>
            ))}
            <div className="mt-2 border-t border-border/40 pt-3">
              {authed ? (
                <div className="flex flex-col gap-2">
                  <Link href="/settings" onClick={() => setOpen(false)} className="rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:bg-foreground/5 hover:text-foreground">Settings</Link>
                  <form action={signOut}>
                    <button className="w-full rounded-full border border-border/60 px-4 py-2 text-sm font-medium hover:bg-foreground/5">Sign out</button>
                  </form>
                </div>
              ) : (
                <Link href="/login" onClick={() => setOpen(false)} className="block rounded-full bg-accent px-4 py-2 text-center text-sm font-semibold text-black hover:brightness-105">Sign in</Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav (glassy) */}
      <div className={cn("fixed inset-x-0 bottom-0 z-30 flex border-t border-border/40 bg-background/80 backdrop-blur-xl", hideAbove)}>
        {[
          { href: "/mj-hierarchy", label: "Cards", Icon: Layers, show: true },
          { href: "/vault", label: "Vault", Icon: Library, show: true },
          { href: "/collection", label: "Mine", Icon: LayoutGrid, show: authed },
          { href: "/want-list", label: "Want", Icon: Heart, show: authed },
        ].filter((x) => x.show).map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              pathname === href ? "text-accent" : "text-muted"
            )}
          >
            <Icon size={18} />{label}
          </Link>
        ))}
        <button
          onClick={openSearch}
          className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          aria-label="Search"
        >
          <Search size={18} />Search
        </button>
      </div>
    </header>
  );
}
