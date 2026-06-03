"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { refreshCardPrice } from "@/lib/actions/admin-prices";
import { Button } from "@/components/ui/primitives";

export function RefreshPriceButton({ cardId }: { cardId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await refreshCardPrice(cardId);
          if (res?.error) toast.error(res.error);
          else {
            toast.success(`eBay prices: ${res?.updated ?? 0} updated, ${res?.skipped ?? 0} skipped`);
            router.refresh();
          }
        })
      }
    >
      <RefreshCw size={14} className={pending ? "animate-spin" : ""} /> Refresh eBay
    </Button>
  );
}
