import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Auth gate for all routes in this group. getUser() revalidates with the auth
// server — never trust getSession() alone for authorization.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <>{children}</>;
}
