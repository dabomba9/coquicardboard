import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Self-serve "export my data" — returns the signed-in user's own rows as a JSON
// download. RLS scopes every query to the caller, so a user only ever gets their
// own data.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const [profile, holdings, wantList] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("holdings").select("*").order("created_at"),
    supabase.from("want_list").select("*").order("created_at"),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    profile: profile.data ?? null,
    holdings: holdings.data ?? [],
    want_list: wantList.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="coqui-cardboard-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
