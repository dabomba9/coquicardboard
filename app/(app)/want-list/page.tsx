import Link from "next/link";
import { getMyWantList } from "@/lib/queries";
import { removeFromWantList } from "@/lib/actions/holdings";
import { CardThumb } from "@/components/card-thumb";
import { Button, Panel } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function WantListPage() {
  const wants = await getMyWantList();

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
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {wants.map((card) => (
            <div key={card.want_id} className="group">
              <Link href={`/cards/${card.slug}`}>
                <CardThumb card={card} className="transition-transform group-hover:-translate-y-1" />
              </Link>
              <form action={removeFromWantList.bind(null, card.id)} className="mt-1">
                <Button size="sm" variant="ghost" type="submit" className="w-full text-xs text-muted">
                  Remove
                </Button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
