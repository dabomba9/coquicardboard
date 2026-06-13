"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isMuted, setMuted, playSelect } from "@/lib/sfx";

// Single nav control to opt into retro sound effects (default OFF). Persists via
// localStorage inside lib/sfx. Mounted-guard mirrors ThemeToggle to avoid a
// hydration mismatch (server can't know the persisted preference).
export function SoundToggle() {
  const [mounted, setMounted] = useState(false);
  const [muted, setLocalMuted] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setLocalMuted(isMuted());
  }, []);

  function toggle() {
    const next = !muted;
    setMuted(next);
    setLocalMuted(next);
    if (!next) playSelect(); // little confirmation blip when un-muting
  }

  const label = mounted ? (muted ? "Enable sound effects" : "Mute sound effects") : "Toggle sound";
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={mounted ? !muted : undefined}
      onClick={toggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      {/* Neutral icon until mounted to avoid hydration mismatch. */}
      {mounted ? (muted ? <VolumeX size={16} /> : <Volume2 size={16} />) : <VolumeX size={16} className="opacity-0" />}
    </button>
  );
}
