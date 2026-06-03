"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { addHolding, updateHolding, type ActionState } from "@/lib/actions/holdings";
import { Button, Input, Label, Select } from "@/components/ui/primitives";
import type { Holding } from "@/lib/types";

export function HoldingForm({
  cardId,
  cardSlug,
  holding,
  onDone,
}: {
  cardId: string;
  cardSlug: string;
  holding?: Holding;
  onDone?: () => void;
}) {
  const editing = !!holding;
  const action = editing ? updateHolding : addHolding;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const res = await action(prev, fd);
      if (res?.ok) { toast.success(editing ? "Copy updated" : "Copy added"); onDone?.(); }
      else if (res?.error) toast.error(res.error);
      return res;
    },
    null
  );
  const [condition, setCondition] = useState<"raw" | "graded">(holding?.condition_type ?? "raw");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="card_id" value={cardId} />
      <input type="hidden" name="card_slug" value={cardSlug} />
      {editing && <input type="hidden" name="holding_id" value={holding!.id} />}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="condition_type">Condition</Label>
          <Select
            id="condition_type"
            name="condition_type"
            value={condition}
            onChange={(e) => setCondition(e.target.value as "raw" | "graded")}
          >
            <option value="raw">Raw</option>
            <option value="graded">Graded</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="quantity">Quantity</Label>
          <Input id="quantity" name="quantity" type="number" min={1} defaultValue={holding?.quantity ?? 1} />
        </div>
      </div>

      {condition === "graded" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="grading_company">Grader</Label>
            <Select id="grading_company" name="grading_company" defaultValue={holding?.grading_company ?? "PSA"}>
              <option value="PSA">PSA</option>
              <option value="BGS">BGS</option>
              <option value="SGC">SGC</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="grade">Grade</Label>
            <Input id="grade" name="grade" type="number" step="0.5" min={1} max={10} defaultValue={holding?.grade ?? 10} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="purchase_price">Paid (USD)</Label>
          <Input
            id="purchase_price"
            name="purchase_price"
            type="number"
            step="0.01"
            min={0}
            placeholder="0.00"
            defaultValue={holding?.purchase_price_cents != null ? holding.purchase_price_cents / 100 : ""}
          />
        </div>
        <div>
          <Label htmlFor="acquired_at">Acquired</Label>
          <Input id="acquired_at" name="acquired_at" type="date" defaultValue={holding?.acquired_at ?? ""} />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" placeholder="Optional" defaultValue={holding?.notes ?? ""} />
      </div>

      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="for_trade" defaultChecked={holding?.for_trade ?? false} /> For trade
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_public" defaultChecked={holding?.is_public ?? true} /> Show publicly
        </label>
      </div>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save copy" : "Add copy"}
        </Button>
        {editing && onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        )}
      </div>
    </form>
  );
}
