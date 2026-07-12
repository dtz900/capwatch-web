import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Server-only client with the service role key, for reads that should not
 * depend on the viewer's tier (e.g. the free Market Masters board reads
 * capper_market_edges, whose RLS stays VIP-gated for the client-side dossier
 * surfaces). Never import from client components. Returns null when the key
 * is not configured so callers can degrade to an empty state. */
export function createServiceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
