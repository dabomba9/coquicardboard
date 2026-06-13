"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { quickAddOwned } from "@/lib/actions/holdings";
import { playConfirm } from "@/lib/sfx";
import { Button } from "@/components/ui/primitives";

/** Adds one raw copy of a card to the signed-in user's collection (idempotent-ish
 *  quick-add). Doubles as "Add another copy" via the label prop. */
export function AddToCollectionButton({
  cardId,
  label = "Add to collection",
  variant = "primary",
}: {
  cardId: string;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant={variant}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await quickAddOwned(cardId);
          if (res?.error) { toast.error(res.error); return; }
          toast.success("Added to your collection");
          playConfirm();
          router.refresh();
        })
      }
    >
      <Plus size={16} /> {label}
    </Button>
  );
}
