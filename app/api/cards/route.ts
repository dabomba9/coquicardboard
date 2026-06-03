import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Minimal public catalog list for the ⌘K command palette.
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cards")
    .select("name, slug, tier_id, sets(name)")
    .order("tier_id")
    .order("rarity_rank");
  if (error) return NextResponse.json({ cards: [] }, { status: 200 });
  type Row = { name: string; slug: string; tier_id: number; sets: { name: string }[] | { name: string } | null };
  const setName = (s: Row["sets"]) => (Array.isArray(s) ? s[0]?.name : s?.name) ?? null;
  const cards = ((data as Row[]) ?? []).map((c) => ({
    name: c.name,
    slug: c.slug,
    tier_id: c.tier_id,
    set: setName(c.sets),
  }));
  return NextResponse.json({ cards }, { headers: { "Cache-Control": "public, max-age=300" } });
}
