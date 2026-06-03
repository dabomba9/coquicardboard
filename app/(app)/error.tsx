"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/primitives";

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
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-xl font-semibold">Couldn&apos;t load this page</h1>
      <p className="mt-2 text-sm text-muted">Please try again.</p>
      <div className="mt-6">
        <Button onClick={reset}>Retry</Button>
      </div>
    </div>
  );
}
