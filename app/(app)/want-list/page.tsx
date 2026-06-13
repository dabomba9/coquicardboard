import { getMyWantList, getTiers } from "@/lib/queries";
import { EmptyState } from "@/components/empty-state";
import { WantListGrid } from "@/components/want-list-grid";

export const dynamic = "force-dynamic";

export default async function WantListPage() {
  const [wants, tiers] = await Promise.all([getMyWantList(), getTiers()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-lg uppercase tracking-tight">Want List</h1>
      <p className="mt-1 text-sm text-muted">{wants.length} cards on your list.</p>

      {wants.length === 0 ? (
        <EmptyState
          title="Your want list is empty"
          body="Hunting a card? Open any card and add it to your want list to prioritize the chase."
        />
      ) : (
        <WantListGrid cards={wants} tiers={tiers.map((t) => ({ id: t.id, name: t.name }))} />
      )}
    </div>
  );
}
