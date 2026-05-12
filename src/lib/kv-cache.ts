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
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
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
 */
export async function withKvCache<T>(
  key: string,
  ttlSec: number,
  fetcher: () => Promise<T>,
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

  return fresh;
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
