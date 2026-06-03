import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client — bypasses RLS. SERVER ONLY. The "server-only"
// import above makes the build fail if this is ever imported into a Client
// Component. Use exclusively inside admin Server Actions / scripts.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
