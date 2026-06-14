"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

// Wraps a card thumbnail; if an image exists, clicking opens a fullscreen zoom.
export function CardLightbox({
  imageUrl,
  alt,
  children,
}: {
  imageUrl: string | null;
  alt: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // No URL, or the image 404s — just render the thumbnail (which has its own
  // placeholder fallback); never open a broken full-size view.
  if (!imageUrl || failed) return <>{children}</>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Zoom image"
        className="block w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        {children}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setOpen(false)}
        >
          <div className="relative h-[85vh] w-[85vw]">
            <Image src={imageUrl} alt={alt} fill className="object-contain" unoptimized onError={() => { setFailed(true); setOpen(false); }} />
          </div>
        </div>
      )}
    </>
  );
}
