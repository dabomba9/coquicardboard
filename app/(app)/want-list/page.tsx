import Link from "next/link";
import { getMyWantList, getTiers } from "@/lib/queries";
import { Panel } from "@/components/ui/primitives";
import { WantListGrid } from "@/components/want-list-grid";

export const dynamic = "force-dynamic";

export default async function WantListPage() {
  const [wants, tiers] = await Promise.all([getMyWantList(), getTiers()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Want List</h1>
      <p className="mt-1 text-sm text-muted">{wants.length} cards on your list.</p>

      {wants.length === 0 ? (
        <Panel className="mt-6 p-8 text-center text-sm text-muted">
          Nothing here yet. Open any card in the{" "}
          <Link href="/mj-hierarchy" className="text-accent hover:underline">hierarchy</Link>{" "}
          and add it to your want list.
        </Panel>
      ) : (
        <WantListGrid cards={wants} tiers={tiers.map((t) => ({ id: t.id, name: t.name }))} />
      )}
    </div>
  );
}
