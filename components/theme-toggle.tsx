"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // Standard next-themes guard: only reveal the theme-dependent icon after mount
  // to avoid a hydration mismatch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  // Until mounted, server and client agree on a neutral label (resolvedTheme is
  // unknown on the server) — prevents the aria-label hydration mismatch.
  const label = mounted ? `Switch to ${isDark ? "light" : "dark"} mode` : "Toggle theme";
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      {/* Avoid hydration mismatch: render a neutral icon until mounted. */}
      {mounted ? (isDark ? <Sun size={16} /> : <Moon size={16} />) : <Sun size={16} className="opacity-0" />}
    </button>
  );
}
