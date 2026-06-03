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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!imageUrl) return <>{children}</>;

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
            <Image src={imageUrl} alt={alt} fill className="object-contain" unoptimized />
          </div>
        </div>
      )}
    </>
  );
}
