import { NextResponse } from "next/server";
import { probeKvGet } from "@/lib/kv-cache";
import { fetchLeaderboard, minPicksForWindow, type LeaderboardFilters } from "@/lib/api";

/**
 * Temporary diagnostic (2026-10-09): the homepage TTFB never improved when
 * the leaderboard KV TTL went 15s -> 300s, which suggests KV never hits in
 * production. This times the default board's KV key directly, then the full
 * fetchLeaderboard path twice. Returns timings and hit/miss only: no data,
 * no keys, no secrets, so it needs no auth. Remove once diagnosed.
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

export async function GET() {
  const key = keyFor(DEFAULT);
  const before = await probeKvGet(key);
  const first = await timed(() => fetchLeaderboard(DEFAULT));
  // Fire-and-forget KV writes need a moment to land before the re-probe.
  await new Promise((r) => setTimeout(r, 1500));
  const after = await probeKvGet(key);
  const second = await timed(() => fetchLeaderboard(DEFAULT));
  return NextResponse.json(
    { region: process.env.VERCEL_REGION ?? null, before, first, after, second },
    { headers: { "Cache-Control": "no-store" } },
  );
}
