import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Server-only client with the service role key, for reads whose SOURCE
 * table is VIP-gated by RLS but whose projected fields are public-safe
 * (e.g. per-market ROI for tailed scopes on My Tails: ROI is public on
 * every profile, while the same row's xROI/CLV/verdict columns are VIP).
 * Never import from client components, and never pass through more columns
 * than the surface is allowed to show. Returns null when the key is not
 * configured so callers can degrade to an empty state. */
export function createServiceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
