import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { NavBar } from "@/components/nav-bar";

export async function SiteNav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <NavBar authed={!!user} admin={isAdmin(user?.email)} />;
}
