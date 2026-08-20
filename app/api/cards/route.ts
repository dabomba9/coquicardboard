import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Card search for the ⌘K command palette. With `?q=`, does a server-side name
// search across BOTH catalogs (hierarchy + vault), capped at 30 — so all 12.5k
// cards are searchable without shipping them to the client. No query → a small
// default list of hierarchy grails.
// `%` and `_` are LIKE wildcards, so an unescaped user query like "100%" matched
// every card. Escape them (and the escape char) so the input is treated literally.
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const like = `%${escapeLike(q)}%`;
  const supabase = await createClient();

  const cols = "name, slug, tier_id, catalog, sets(name)";
  type Row = { name: string; slug: string; tier_id: number | null; catalog: string; sets: { name: string }[] | { name: string } | null };

  let data: Row[] | null = null;
  let error: unknown = null;
  if (q) {
    // Search BOTH catalogs and merge so vault matches always surface (hierarchy
    // rows are physically first, so a single capped scan would hide the vault).
    const [hier, vault] = await Promise.all([
      supabase.from("cards").select(cols).in("catalog", ["mj-hierarchy", "kobe-hierarchy", "mamba-hierarchy"]).ilike("name", like).order("name").limit(10),
      supabase.from("cards").select(cols).in("catalog", ["mj-vault", "kobe-vault", "clemente-vault", "killebrew-vault"]).ilike("name", like).order("name").limit(20),
    ]);
    error = hier.error || vault.error;
    data = [...((hier.data as Row[]) ?? []), ...((vault.data as Row[]) ?? [])];
  } else {
    const res = await supabase.from("cards").select(cols).eq("catalog", "mj-hierarchy").order("tier_id").order("rarity_rank").limit(12);
    data = res.data as Row[];
    error = res.error;
  }
  if (error) return NextResponse.json({ cards: [] }, { status: 200 });

  const setName = (s: Row["sets"]) => (Array.isArray(s) ? s[0]?.name : s?.name) ?? null;
  const cards = ((data as Row[]) ?? []).map((c) => ({
    name: c.name,
    slug: c.slug,
    tier_id: c.tier_id,
    catalog: c.catalog,
    set: setName(c.sets),
  }));
  return NextResponse.json({ cards }, { headers: { "Cache-Control": q ? "no-store" : "public, max-age=300" } });
}
