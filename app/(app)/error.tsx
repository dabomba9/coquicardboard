"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/primitives";
import { Coqui } from "@/components/mascot/coqui";

export default function AppError({
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
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <Coqui pose="sleeping" size={88} bob={false} aria-label="Coqui is stumped" />
      <h1 className="mt-4 font-display text-lg uppercase tracking-tight text-accent">Couldn&apos;t load this page</h1>
      <p className="mt-2 text-sm text-muted">Please try again.</p>
      <div className="mt-6">
        <Button onClick={reset}>Retry</Button>
      </div>
    </div>
  );
}
