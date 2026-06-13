import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { getAllCards } from "@/lib/queries";
import { ImageManager, type ManagerCard } from "@/components/image-manager";

export const dynamic = "force-dynamic";

export default async function AdminImagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) notFound();

  const cards = await getAllCards();
  const managerCards: ManagerCard[] = cards.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    tier_id: c.tier_id,
    card_number: c.card_number,
    year: c.year,
    set_name: c.sets?.name ?? null,
    image_url: c.image_url,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-lg uppercase tracking-tight">Image Manager</h1>
      <p className="mt-1 text-sm text-muted">
        Admin tool — assign an image URL to each card. Use the search links to find a card photo,
        copy its image address, paste, and save.
      </p>
      <ImageManager cards={managerCards} />
    </div>
  );
}
