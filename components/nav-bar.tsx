"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Search, Layers, LayoutGrid, Heart } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; accent?: boolean };

export function NavBar({ authed, admin }: { authed: boolean; admin: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links: Item[] = [
    { href: "/mj-hierarchy", label: "MJ Hierarchy" },
    { href: "/guides", label: "Guides" },
    ...(authed
      ? [
          { href: "/collection", label: "My Collection" },
          { href: "/analytics", label: "Insights" },
          { href: "/want-list", label: "Want List" },
        ]
      : []),
    ...(admin ? [{ href: "/admin/images", label: "Admin", accent: true }] : []),
  ];

  const linkCls = (l: Item) =>
    cn(
      "text-sm transition-colors",
      l.accent ? "text-amber-600 dark:text-amber-400 hover:opacity-80" : "text-muted hover:text-foreground",
      pathname === l.href && !l.accent && "text-foreground"
    );

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="font-semibold tracking-tight" onClick={() => setOpen(false)}>
          <span className="text-amber-500">Coqui</span> Cardboard
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 sm:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkCls(l)}>{l.label}</Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label="Search cards (⌘K)"
            onClick={() => window.dispatchEvent(new Event("mj:open-search"))}
            className="hidden h-9 items-center gap-2 rounded-md border border-border px-2.5 text-xs text-muted transition-colors hover:text-foreground sm:inline-flex"
          >
            <Search size={14} /> Search
            <kbd className="rounded border border-border px-1 py-0.5 text-[10px]">⌘K</kbd>
          </button>
          <ThemeToggle />
          <div className="hidden sm:flex sm:items-center sm:gap-2">
            {authed ? (
              <>
                <Link href="/settings" className="text-sm text-muted hover:text-foreground">Settings</Link>
                <form action={signOut}><Button variant="secondary" size="sm">Sign out</Button></form>
              </>
            ) : (
              <Link href="/login"><Button size="sm">Sign in</Button></Link>
            )}
          </div>
          {/* Mobile menu button */}
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted hover:text-foreground sm:hidden"
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background/95 backdrop-blur sm:hidden">
        {[
          { href: "/mj-hierarchy", label: "Cards", Icon: Layers, show: true },
          { href: "/collection", label: "Mine", Icon: LayoutGrid, show: authed },
          { href: "/want-list", label: "Want", Icon: Heart, show: authed },
        ].filter((x) => x.show).map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]",
              pathname === href ? "text-amber-500" : "text-muted"
            )}
          >
            <Icon size={18} />{label}
          </Link>
        ))}
        <button
          onClick={() => window.dispatchEvent(new Event("mj:open-search"))}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-muted"
          aria-label="Search"
        >
          <Search size={18} />Search
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-border bg-background px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={cn("rounded-md px-2 py-2", linkCls(l))}>
                {l.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-border pt-2">
              {authed ? (
                <>
                  <Link href="/settings" onClick={() => setOpen(false)} className="block rounded-md px-2 py-2 text-sm text-muted hover:text-foreground">Settings</Link>
                  <form action={signOut} className="px-2 pt-1"><Button variant="secondary" size="sm" className="w-full">Sign out</Button></form>
                </>
              ) : (
                <Link href="/login" onClick={() => setOpen(false)} className="block px-2"><Button size="sm" className="w-full">Sign in</Button></Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
