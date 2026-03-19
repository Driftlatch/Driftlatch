import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";

let browserClient: SupabaseClient<Database> | null = null;

export function supabaseBrowser() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  browserClient = createClient<Database>(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  return browserClient;
}
