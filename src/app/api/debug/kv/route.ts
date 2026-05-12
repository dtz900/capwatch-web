/**
 * Admin-only debug endpoint for the Upstash KV cache layer.
 *
 * Reports:
 *   - Which env vars the runtime sees (presence only — never the values)
 *   - Whether withKvCache constructs a client
 *   - Round-trip latency of a SET + GET against a temp key
 *
 * Gated on the same CRON_SECRET bearer the audit page uses. Remove this
 * file (or noop the handler) once the cache is verified working.
 */
import { NextResponse } from "next/server";
import { withKvCache, invalidateKvCache } from "@/lib/kv-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET;
  if (!expected || !auth.startsWith("Bearer ") || auth.slice(7) !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const env_seen: Record<string, boolean> = {
    UPSTASH_REDIS_REST_URL: Boolean(process.env.UPSTASH_REDIS_REST_URL),
    UPSTASH_REDIS_REST_TOKEN: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
    KV_REST_API_URL: Boolean(process.env.KV_REST_API_URL),
    KV_REST_API_TOKEN: Boolean(process.env.KV_REST_API_TOKEN),
    KV_URL: Boolean(process.env.KV_URL),
    REDIS_URL: Boolean(process.env.REDIS_URL),
  };

  const probe_key = `__kv_debug_probe__:${Date.now()}`;
  const probe_value = { ok: true, ts: Date.now() };

  const t0 = performance.now();
  let result_status: string;
  let cached_match: boolean | null = null;
  let error_message: string | null = null;
  try {
    // First call: miss -> upstream fetcher returns the probe value, then
    // withKvCache writes it to Redis. Read latency captured below.
    const got = await withKvCache<typeof probe_value>(
      probe_key,
      30,
      async () => probe_value,
    );
    cached_match = got?.ts === probe_value.ts;
    // Wait a beat for the fire-and-forget SET to settle (Upstash REST is
    // synchronous over HTTP so this is usually instant; 100ms is generous).
    await new Promise((r) => setTimeout(r, 100));
    // Second call: should hit the cache and return the same payload.
    const got2 = await withKvCache<typeof probe_value>(
      probe_key,
      30,
      async () => ({ ok: false, ts: -1 }), // marker so we know if cache MISSED
    );
    if (got2?.ts === probe_value.ts) {
      result_status = "cache_hit_on_second_call";
    } else if (got2?.ts === -1) {
      result_status = "cache_missed_second_call_no_client_or_set_failed";
    } else {
      result_status = "unexpected";
    }
  } catch (e) {
    result_status = "exception";
    error_message = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  } finally {
    await invalidateKvCache(probe_key);
  }
  const elapsed_ms = Math.round(performance.now() - t0);

  return NextResponse.json({
    env_seen,
    result_status,
    cached_match,
    error_message,
    elapsed_ms,
    note:
      "If result_status === 'cache_hit_on_second_call', KV is wired up correctly. " +
      "If env_seen has only false values, the deploy didn't pick up the integration's env vars.",
  });
}
