"use client";

import { useTransition } from "react";
import { addToWantList, removeFromWantList } from "@/lib/actions/holdings";
import { Button } from "@/components/ui/primitives";

export function WantButton({ cardId, wanted }: { cardId: string; wanted: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() => start(() => (wanted ? removeFromWantList(cardId) : addToWantList(cardId)))}
    >
      {wanted ? "On want list ✓" : "Add to want list"}
    </Button>
  );
}
