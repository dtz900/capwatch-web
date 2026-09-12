/**
 * Upstash Redis cache-aside helper for public API responses.
 *
 * Layered above the existing Next.js ISR + data-cache:
 *   - Next ISR caches the rendered HTML per-region for ~60s
 *   - Next data-cache memoizes fetch responses per-region for ~60s
 *   - KV adds a cross-region, app-level layer so any cold render in any
 *     region reuses the same upstream JSON without re-hitting Railway
 *
 * Graceful by design:
 *   - When UPSTASH_REDIS_REST_{URL,TOKEN} are not set (local dev, preview
 *     without the integration linked yet, etc.), `withKvCache` becomes a
 *     pass-through: it just calls the fetcher.
 *   - When Redis is reachable but a get/set fails (network blip, eviction
 *     race), we still return whatever the fetcher produced. The user-
 *     visible page never breaks because of a cache hiccup.
 *
 * Vercel KV was retired in December 2024; the official Vercel Marketplace
 * recommendation is Upstash Redis. Add the Upstash integration from the
 * Vercel dashboard and it injects UPSTASH_REDIS_REST_{URL,TOKEN} into the
 * project automatically.
 */
import { Redis } from "@upstash/redis";

let _client: Redis | null = null;
let _clientChecked = false;

function getClient(): Redis | null {
  if (_clientChecked) return _client;
  _clientChecked = true;
  // Accept both naming conventions:
  //   UPSTASH_REDIS_REST_{URL,TOKEN}  -- Upstash-native, used when you create
  //                                      the DB directly on console.upstash.com
  //   KV_REST_API_{URL,TOKEN}         -- Legacy Vercel KV naming, still used
  //                                      by the Vercel Marketplace integration
  //                                      since the Dec 2024 migration from
  //                                      Vercel KV to Upstash Redis.
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  _client = new Redis({ url, token });
  return _client;
}

/**
 * Run `fetcher`, but consult Upstash first. On hit return the cached value;
 * on miss call the fetcher and seed the cache with `ttlSec` expiry.
 *
 * Cache writes are fire-and-forget: a slow or failing Redis must not delay
 * the user-facing response. Errors on the read path are silently treated
 * as misses.
 *
 * Stored values must be JSON-serializable. The Upstash SDK handles encoding
 * automatically for objects and arrays.
 *
 * `opts.lkgKey` overrides where the last-known-good copy is stored, instead
 * of the default `${key}:lkg`. Use this when `key` itself is built from a
 * relative selector whose meaning changes over time (e.g. "today", or
 * NFL's "current" week): the primary key's literal name has to stay put so
 * short-TTL purges still find it, but the long-TTL LKG copy must be keyed
 * by the concrete resolved period, or a value written before a rollover
 * (a new slate day, a new NFL week) could be replayed after it under the
 * same literal key. Every other caller omits this and gets the default.
 */
export async function withKvCache<T>(
  key: string,
  ttlSec: number,
  fetcher: () => Promise<T>,
  opts: { lkgKey?: string } = {},
): Promise<T> {
  const client = getClient();
  if (!client) return fetcher();

  try {
    const cached = await client.get<T>(key);
    if (cached !== null && cached !== undefined) return cached;
  } catch {
    // Treat read failures as a miss; keep serving from upstream.
  }

  const fresh = await fetcher();

  // Fire-and-forget. We don't await so the user response isn't slowed by
  // a slow Redis. The void-then-catch idiom keeps lint happy without
  // surfacing rejections.
  void client.set(key, fresh, { ex: ttlSec }).catch(() => {
    /* swallow */
  });

  // Also seed the last-known-good copy under a long TTL. This is the
  // fallback callers reach for with readLastKnownGood() when a live
  // upstream fetch throws (Railway stall, connection reset, etc) and the
  // short-TTL primary key has already expired. Same fire-and-forget
  // reasoning as the primary write above.
  void client.set(opts.lkgKey ?? lkgKey(key), fresh, { ex: LKG_TTL_SEC }).catch(() => {
    /* swallow */
  });

  return fresh;
}

// How long a last-known-good copy stays servable once its primary entry
// has expired. Six hours is long enough to ride out a Railway incident or
// a Supabase pooler outage without serving data so old it misleads a
// visitor, and short enough that a genuinely dead capper page eventually
// falls through to the real error state instead of serving forever.
export const LKG_TTL_SEC = 6 * 60 * 60;

function lkgKey(key: string): string {
  return `${key}:lkg`;
}

/**
 * Read the last-known-good copy for `key`, written by a previous successful
 * `withKvCache` call. Returns null on a miss, a Redis error, or when Redis
 * isn't configured, so callers can treat it as "no stale copy available"
 * without a try/catch of their own.
 *
 * Pass the same `opts.lkgKey` used on the matching `withKvCache` write, or
 * omit it on both ends to use the default `${key}:lkg`.
 */
export async function readLastKnownGood<T>(
  key: string,
  opts: { lkgKey?: string } = {},
): Promise<T | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const stale = await client.get<T>(opts.lkgKey ?? lkgKey(key));
    return stale ?? null;
  } catch {
    return null;
  }
}

/**
 * For tests and admin tooling: invalidate a specific cache key. Returns
 * true on success, false if the client isn't configured or the call
 * raised.
 */
export async function invalidateKvCache(key: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    await client.del(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Admin tooling: delete every key matching `${prefix}*`. Used by the
 * admin pipeline's Refresh Aggregates button so a fresh aggregate write
 * surfaces immediately on the public site instead of waiting for the
 * per-key TTL to expire.
 *
 * Returns the number of keys deleted. Safe to call without a configured
 * client (returns 0). SCAN-based so it doesn't block Redis on big sets.
 */
export async function purgeKvByPrefix(prefix: string): Promise<number> {
  const client = getClient();
  if (!client) return 0;

  let cursor: string | number = 0;
  let deleted = 0;
  // Bound the loop in case SCAN never converges on cursor=0 due to client
  // weirdness. 100 iterations * count=200 = 20k keys, well past anything
  // we ever expect for this site.
  for (let i = 0; i < 100; i++) {
    try {
      const result = (await client.scan(cursor, {
        match: `${prefix}*`,
        count: 200,
      })) as [string | number, string[]];
      const nextCursor = result[0];
      const keys = result[1];
      if (keys && keys.length > 0) {
        await client.del(...(keys as [string, ...string[]]));
        deleted += keys.length;
      }
      cursor = nextCursor;
      if (cursor === 0 || cursor === "0") break;
    } catch {
      break;
    }
  }
  return deleted;
}
