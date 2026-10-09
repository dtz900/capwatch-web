import { NextResponse } from "next/server";
import { probeKvGet } from "@/lib/kv-cache";
import { fetchLeaderboard, minPicksForWindow, type LeaderboardFilters } from "@/lib/api";
import { API_BASE } from "@/lib/config";

/**
 * Temporary diagnostic (2026-10-09): the homepage TTFB never improved when
 * the leaderboard KV TTL went 15s -> 300s, which suggests KV never hits in
 * production. This times the default board's KV key directly, the full
 * fetchLeaderboard path once, and the key again. Returns timings and hit/miss
 * only: no data, keys or secrets. Throttled instead of authed (no web-side
 * secret is available to the operator). Remove once diagnosed.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT: LeaderboardFilters = {
  window: "last_30",
  sort: "units_profit",
  bet_type: "all",
  min_picks: minPicksForWindow("last_30", "all"),
  active_only: true,
  sport: "all",
};

function keyFor(f: LeaderboardFilters): string {
  // Mirrors fetchLeaderboard's cache key construction.
  const params = new URLSearchParams({
    window: f.window,
    sort: f.sort,
    bet_type: f.bet_type,
    min_picks: String(f.min_picks),
    active_only: String(f.active_only),
  });
  if (f.sport) params.set("sport", f.sport);
  return `lb:v1:${params.toString()}`;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ ms: number; ok: boolean; error: string | null }> {
  const t = Date.now();
  try {
    await fn();
    return { ms: Date.now() - t, ok: true, error: null };
  } catch (err) {
    return { ms: Date.now() - t, ok: false, error: err instanceof Error ? err.message.slice(0, 300) : String(err) };
  }
}

// Unauthenticated, so bounded (Codex P1 on #187): two upstream reads per
// run (one direct, one through fetchLeaderboard), and at most one run per
// instance every THROTTLE_MS. Throttled calls get a 429 without touching
// Redis or Railway.
const THROTTLE_MS = 10_000;
let lastRun = 0;

export async function GET() {
  const now = Date.now();
  if (now - lastRun < THROTTLE_MS) {
    return NextResponse.json({ error: "throttled" }, { status: 429, headers: { "Cache-Control": "no-store" } });
  }
  lastRun = now;
  const key = keyFor(DEFAULT);
  const before = await probeKvGet(key);
  // Railway on its own, so a stale-fallback success inside fetchLeaderboard
  // (upstream failed, :lkg served, primary never written) cannot pass for a
  // KV write failure (Codex P2 on #187): if upstream is not ok here, the
  // after-probe miss means nothing.
  const t = Date.now();
  let upstream: { ms: number; status: number | null; error: string | null };
  try {
    const res = await fetch(`${API_BASE}/api/public/cappers?${key.slice("lb:v1:".length)}`, { cache: "no-store" });
    await res.arrayBuffer();
    upstream = { ms: Date.now() - t, status: res.status, error: null };
  } catch (err) {
    upstream = { ms: Date.now() - t, status: null, error: err instanceof Error ? err.message.slice(0, 300) : String(err) };
  }
  const lkgBefore = await probeKvGet(`${key}:lkg`);
  const fetchTiming = await timed(() => fetchLeaderboard(DEFAULT));
  // Fire-and-forget KV writes need a moment to land before the re-probe.
  await new Promise((r) => setTimeout(r, 1000));
  const after = await probeKvGet(key);
  return NextResponse.json(
    { region: process.env.VERCEL_REGION ?? null, before, lkgBefore, upstream, fetch: fetchTiming, after },
    { headers: { "Cache-Control": "no-store" } },
  );
}
