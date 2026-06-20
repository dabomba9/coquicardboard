"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Search, Layers, LayoutGrid, Heart, Library } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { SoundToggle } from "@/components/sound-toggle";
import { CoquiGlyph } from "@/components/coqui-glyph";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; accent?: boolean; divider?: boolean };

const openSearch = () => window.dispatchEvent(new Event("mj:open-search"));

export function NavBar({ authed, admin }: { authed: boolean; admin: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links: Item[] = [
    { href: "/mj-hierarchy", label: "MJ Hierarchy" },
    { href: "/vault", label: "Jordan Vault" },
    { href: "/mamba-hierarchy", label: "Mamba Hierarchy", divider: true },
    { href: "/kobe-hierarchy", label: "Mamba Origins" },
    { href: "/kobe-vault", label: "Kobe Vault" },
    { href: "/guides", label: "Guides", divider: true },
    ...(authed
      ? [
          { href: "/collection", label: "My Collection", divider: true },
          { href: "/analytics", label: "Insights" },
          { href: "/want-list", label: "Want List" },
        ]
      : []),
    ...(admin ? [{ href: "/admin/images", label: "Admin", accent: true }] : []),
  ];

  const linkCls = (l: Item) => {
    const active = pathname === l.href;
    return cn(
      "rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
      l.accent
        ? "text-[var(--gold)] hover:bg-[var(--gold)]/10"
        : active
          ? "bg-accent/12 text-accent"
          : "text-muted hover:bg-foreground/5 hover:text-foreground"
    );
  };

  return (
    <header className="font-modern fixed inset-x-0 top-0 z-30 px-3 pt-3 sm:px-4">
      <nav className="mx-auto flex h-16 max-w-5xl items-center gap-3 rounded-full border border-border/45 bg-background/65 px-3 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.30)] backdrop-blur-xl sm:px-5">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight" onClick={() => setOpen(false)}>
          <CoquiGlyph size={22} className="text-accent" aria-label="" />
          <span><span className="text-accent">Coqui</span> Cardboard</span>
        </Link>

        {/* Desktop links */}
        <div className="ml-3 hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <span key={l.href} className="flex items-center gap-1">
              {l.divider && <span className="mx-1 h-5 w-px bg-border/40" aria-hidden="true" />}
              <Link href={l.href} className={linkCls(l)}>{l.label}</Link>
            </span>
          ))}
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {/* Prominent search pill (tablet+) */}
          <button
            type="button"
            aria-label="Search cards (⌘K)"
            onClick={openSearch}
            className="hidden h-9 w-44 items-center gap-2 rounded-full border border-border/60 bg-foreground/[0.03] px-3.5 text-sm text-muted transition-colors hover:border-border hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:inline-flex lg:w-56"
          >
            <Search size={15} />
            <span>Search cards…</span>
            <kbd className="ml-auto rounded-md border border-border/60 bg-foreground/5 px-1.5 py-0.5 text-[10px] font-medium leading-none">⌘K</kbd>
          </button>

          <SoundToggle />
          <ThemeToggle />

          <div className="hidden items-center gap-2 lg:flex">
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-foreground/5 hover:text-foreground lg:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer — floating panel below the pill */}
      {open && (
        <div className="mx-auto mt-2 max-w-5xl rounded-2xl border border-border/40 bg-background/90 px-4 py-3 shadow-[0_10px_34px_-12px_rgba(0,0,0,0.40)] backdrop-blur-xl lg:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={linkCls(l)}>
                {l.label}
              </Link>
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
      <div className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border/40 bg-background/80 backdrop-blur-xl lg:hidden">
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
