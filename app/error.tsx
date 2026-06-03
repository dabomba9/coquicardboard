"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/primitives";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">
        An unexpected error occurred. This is often a transient hiccup (e.g. the
        database connection) — try again.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/"><Button variant="secondary">Go home</Button></Link>
      </div>
    </div>
  );
}
