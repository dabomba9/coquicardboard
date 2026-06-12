"use client";

import { useState } from "react";
import { HoldingForm } from "@/components/holding-form";
import { deleteHolding } from "@/lib/actions/holdings";
import { Badge, Button, Panel } from "@/components/ui/primitives";
import { formatUsd, gradeLabel } from "@/lib/utils";
import type { Holding } from "@/lib/types";

export function HoldingsManager({
  cardId,
  cardSlug,
  holdings,
}: {
  cardId: string;
  cardSlug: string;
  holdings: Holding[];
}) {
  const [adding, setAdding] = useState(holdings.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {holdings.map((h) =>
          editingId === h.id ? (
            <Panel key={h.id} className="p-4">
              <HoldingForm cardId={cardId} cardSlug={cardSlug} holding={h} onDone={() => setEditingId(null)} />
            </Panel>
          ) : (
            <Panel key={h.id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="font-medium">{gradeLabel(h.condition_type, h.grading_company, h.grade)}</span>
              {h.quantity > 1 && <Badge className="text-muted">×{h.quantity}</Badge>}
              {h.for_trade && <Badge className="bg-accent/10 text-accent">For trade</Badge>}
              {!h.is_public && <Badge className="text-muted">Private</Badge>}
              <span className="text-sm text-muted">
                {h.purchase_price_cents != null ? `Paid ${formatUsd(h.purchase_price_cents)}` : ""}
                {h.acquired_at ? ` · ${h.acquired_at}` : ""}
              </span>
              <div className="ml-auto flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditingId(h.id)}>Edit</Button>
                <form action={deleteHolding.bind(null, h.id, cardSlug)}>
                  <Button size="sm" variant="ghost" type="submit" className="text-red-400 hover:bg-red-500/10">
                    Delete
                  </Button>
                </form>
              </div>
            </Panel>
          )
        )}
      </div>

      {adding ? (
        <Panel className="p-4">
          <div className="mb-3 text-sm font-medium">Add a copy</div>
          <HoldingForm cardId={cardId} cardSlug={cardSlug} onDone={() => setAdding(false)} />
        </Panel>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>+ Add another copy</Button>
      )}
    </div>
  );
}
