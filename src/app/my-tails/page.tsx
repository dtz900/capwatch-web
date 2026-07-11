import { notFound } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/nav/TopNav";
import { createServerSupabase } from "@/lib/supabase/server";
import { fetchLeaderboard, fetchTodayPicks } from "@/lib/api";
import { vipEnabled } from "@/lib/flags";
import { StableGrid } from "@/components/my-tails/StableGrid";
import { BetSlipProvider } from "@/components/my-tails/BetSlipContext";
import { BetSlipRail } from "@/components/my-tails/BetSlipRail";
import { EmptyStable } from "@/components/my-tails/EmptyStable";
import { MarketRankings } from "@/components/my-tails/MarketRankings";
import type { CapperRow, TodayPickEntry } from "@/lib/types";
import type { EdgeRow } from "@/lib/edges";
import type { RankedEdgeRow } from "@/lib/marketRankings";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Tails | TailSlips" };

export default async function MyTailsPage() {
  if (!vipEnabled()) notFound();

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const lb = await fetchLeaderboard({
    window: "season",
    sort: "units_profit",
    bet_type: "all",
    min_picks: 0,
    active_only: false,
  });
  const byId = new Map<string, CapperRow>(lb.leaderboard.map((r) => [String(r.capper_id), r]));
  const top3 = lb.leaderboard.slice(0, 3);

  if (!user) {
    return (
      <>
        <TopNav />
        <main className="mx-auto max-w-5xl px-4 py-10">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">My Tails</h1>
          <p className="mt-2 text-sm text-[var(--color-text-soft)]">
            <Link href="/login" className="underline">Sign in</Link> to tail cappers and track
            your stable here.
          </p>
          <div className="mt-8"><EmptyStable suggestions={top3} /></div>
          <div className="mt-6"><MarketRankings rows={[]} vip={false} /></div>
        </main>
      </>
    );
  }

  const { data: follows, error: followsError } = await supabase
    .from("capper_follows")
    .select("capper_id, market")
    .eq("user_id", user.id);
  if (followsError) console.error("my-tails follows query failed:", followsError);
  const followRows = (follows ?? []) as { capper_id: number; market: string }[];
  const ids = [...new Set(followRows.map((f) => f.capper_id))];

  const { data: tsProfile } = await supabase
    .from("ts_profiles")
    .select("tier")
    .eq("user_id", user.id)
    .maybeSingle();
  const isVip = tsProfile?.tier === "vip";

  // Cross-capper read of the whole edges table. RLS gates it to VIP JWTs;
  // x_n rides along because the ranking sort needs it.
  let rankingRows: RankedEdgeRow[] = [];
  if (isVip) {
    const { data: allEdges, error: allEdgesError } = await supabase
      .from("capper_market_edges")
      .select(
        "capper_id, market, n_decided, roi_pct, xroi_pct, clv_beat_pct, clv_avg_cents, clv_n, tracked_days, gate_pass, gate_reasons, originator, tail_at_close_roi, x_n"
      );
    if (allEdgesError) console.error("my-tails rankings query failed:", allEdgesError);
    rankingRows = ((allEdges ?? []) as (EdgeRow & { capper_id: number })[]).map((e) => ({
      ...e,
      handle: byId.get(String(e.capper_id))?.handle ?? null,
      display_name: byId.get(String(e.capper_id))?.display_name ?? null,
    }));
  }

  // A capper with an 'all' row is fully tailed; scope rows only count when
  // no 'all' row exists (the toggle enforces this, this is belt and braces).
  const whole = new Set(
    followRows.filter((f) => f.market === "all").map((f) => String(f.capper_id))
  );
  const scopesByCapper: Record<string, string[]> = {};
  for (const f of followRows) {
    const key = String(f.capper_id);
    if (f.market !== "all" && !whole.has(key)) {
      (scopesByCapper[key] ??= []).push(f.market);
    }
  }

  const scopedIds = Object.keys(scopesByCapper).map(Number);
  const edgesByCapper: Record<string, EdgeRow[]> = {};
  if (scopedIds.length > 0) {
    const { data: edgeRows } = await supabase
      .from("capper_market_edges")
      .select(
        "capper_id, market, n_decided, roi_pct, xroi_pct, clv_beat_pct, clv_avg_cents, clv_n, tracked_days, gate_pass, gate_reasons, originator, tail_at_close_roi"
      )
      .in("capper_id", scopedIds);
    for (const e of (edgeRows ?? []) as (EdgeRow & { capper_id: number })[]) {
      const key = String(e.capper_id);
      if (scopesByCapper[key]?.includes(e.market)) {
        (edgesByCapper[key] ??= []).push(e);
      }
    }
  }

  const stable = ids.map((id) => byId.get(String(id))).filter(Boolean) as CapperRow[];
  const today = ids.length > 0 ? await fetchTodayPicks(ids).catch(() => ({ date: "", picks: [] })) : { date: "", picks: [] };

  const todayByCapper: Record<string, TodayPickEntry[]> = {};
  for (const p of today.picks) {
    const key = String(p.capper_id);
    const capperScopes = scopesByCapper[key];
    // Scoped cappers only surface picks in their tailed markets; parlays
    // carry market_group null and drop out of scoped views by design.
    if (capperScopes && (!p.market_group || !capperScopes.includes(p.market_group))) continue;
    (todayByCapper[key] ??= []).push(p);
  }
  const shownPickCount = Object.values(todayByCapper).reduce((n, arr) => n + arr.length, 0);

  return (
    <>
      <TopNav />
      <BetSlipProvider todayDate={today.date || null}>
      {/* Content spans the leaderboard's exact container (max-w-[1240px]) so
          the card grid spreads like the podiums. The bet slip lives in the
          header row as a ticket stub that scrolls with the page; once opened
          it becomes a fixed ticket pinned in the right gutter. */}
      <main className="max-w-[1240px] mx-auto px-4 sm:px-7 py-10 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">My Tails</h1>
            {ids.length > 0 && (
              <p className="mt-1 text-sm text-[var(--color-text-soft)]">
                {shownPickCount > 0
                  ? `${shownPickCount} pick${shownPickCount === 1 ? "" : "s"} from your tails today`
                  : "No picks from your tails yet today."}
              </p>
            )}
          </div>
          <BetSlipRail />
        </div>
        {ids.length === 0 ? (
          <EmptyStable suggestions={top3} />
        ) : (
          <StableGrid
            initial={stable}
            todayByCapper={todayByCapper}
            scopesByCapper={scopesByCapper}
            edgesByCapper={edgesByCapper}
          />
        )}
        <MarketRankings rows={rankingRows} vip={isVip} />
      </main>
      </BetSlipProvider>
    </>
  );
}
