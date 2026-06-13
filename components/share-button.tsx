"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/primitives";

/** Native share where supported, else copy the page URL to the clipboard. */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch { /* cancelled */ return; }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy the link");
    }
  }

  return (
    <Button variant="secondary" onClick={share} aria-label="Share this card">
      {copied ? <Check size={16} /> : <Share2 size={16} />} Share
    </Button>
  );
}
