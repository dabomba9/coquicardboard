"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { addToWantList, removeFromWantList } from "@/lib/actions/holdings";
import { cn } from "@/lib/utils";

// One-tap want-list toggle for explorer grid tiles. The card page has the full
// WantButton; this is the same action sized for a tile corner, so a collector
// browsing a catalog can mark the chase without opening every card.
export function WantHeart({
  cardId,
  wanted,
  signedIn,
  className,
}: {
  cardId: string;
  wanted: boolean;
  signedIn: boolean;
  className?: string;
}) {
  const [on, setOn] = useState(wanted);
  const [pending, start] = useTransition();
  const router = useRouter();
  const label = !signedIn ? "Sign in to use your want list" : on ? "Remove from want list" : "Add to want list";

  function toggle(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (!signedIn) { router.push("/login"); return; }
    const next = !on;
    setOn(next); // optimistic
    start(async () => {
      try {
        await (next ? addToWantList(cardId) : removeFromWantList(cardId));
        toast.success(next ? "Added to your want list" : "Removed from your want list");
      } catch {
        setOn(!next);
        toast.error("Couldn't update your want list");
      }
    });
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={signedIn ? on : undefined}
      title={label}
      disabled={pending}
      onClick={toggle}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/85 backdrop-blur transition-opacity hover:text-accent",
        on ? "text-accent opacity-100" : "text-muted opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
        className
      )}
    >
      <Heart size={14} fill={on ? "currentColor" : "none"} />
    </button>
  );
}
