"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { ebayConfigured, searchEbayListings } from "@/lib/ebay";
import { buildQuery } from "@/lib/image-search";
import { priceFromListings } from "@/lib/ebay-match";

export type RefreshState = { error?: string; updated?: number; skipped?: number } | null;

const grades = (tier: number): { key: string; suffix: string }[] => [
  { key: "raw", suffix: "" },
  { key: "PSA10", suffix: "PSA 10" },
  { key: "PSA9", suffix: "PSA 9" },
  ...(tier <= 2 ? [{ key: "BGS9.5", suffix: "BGS 9.5" }] : []),
];

// Admin: refresh one card's eBay asking prices (+ today's history point).
export async function refreshCardPrice(cardId: string): Promise<RefreshState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) return { error: "Not authorized." };
  if (!ebayConfigured()) return { error: "eBay not configured." };

  const admin = createAdminClient();
  const { data: card } = await admin
    .from("cards").select("name, tier_id, slug").eq("id", cardId).single();
  if (!card) return { error: "Card not found." };

  const today = new Date().toISOString().slice(0, 10);
  const base = buildQuery(card.name);
  let updated = 0, skipped = 0;

  for (const g of grades(card.tier_id)) {
    try {
      const listings = await searchEbayListings(g.suffix ? `${base} ${g.suffix}` : base);
      const result = priceFromListings(listings, card.name, g.key, 3);
      if (!result) { skipped++; continue; }
      await admin.from("card_prices").upsert(
        { card_id: cardId, grade_key: g.key, median_cents: result.medianCents, last_sale_cents: result.medianCents,
          currency: "USD", sample_size: result.count, source: "ebay (asking)", as_of: new Date().toISOString() },
        { onConflict: "card_id,grade_key" }
      );
      await admin.from("price_history").delete()
        .match({ card_id: cardId, grade_key: g.key, recorded_on: today, source: "ebay" });
      await admin.from("price_history").insert(
        { card_id: cardId, grade_key: g.key, value_cents: result.medianCents, recorded_on: today, source: "ebay" }
      );
      updated++;
    } catch {
      skipped++;
    }
  }

  revalidatePath(`/cards/${card.slug}`);
  revalidatePath("/hierarchy");
  return { updated, skipped };
}
