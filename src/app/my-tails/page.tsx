import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/nav/TopNav";
import { createServerSupabase } from "@/lib/supabase/server";
import { fetchLeaderboard, fetchTodayPicks } from "@/lib/api";
import { capperVipEnabledFor, capperVipReachable, vipEnabled, vipTierEnabled } from "@/lib/flags";
import { StableGrid } from "@/components/my-tails/StableGrid";
import { BetSlipProvider } from "@/components/my-tails/BetSlipContext";
import { BetSlipRail } from "@/components/my-tails/BetSlipRail";
import { EmptyStable } from "@/components/my-tails/EmptyStable";
import { MarketRankings } from "@/components/my-tails/MarketRankings";
import { MyTailsTabs, type MyTailsTab, type MyTailsTabSpec } from "@/components/my-tails/MyTailsTabs";
import { createServiceSupabase } from "@/lib/supabase/service";
import { getVipSubscriptions } from "@/lib/vip/client";
import { vipOnlyRow } from "@/lib/vip/stableRow";
import { hasVipAccess } from "@/lib/vip/access";
import type { VipSubscription } from "@/lib/vip/types";
import type { CapperRow, ScopeStat, TodayPickEntry } from "@/lib/types";
import type { EdgeRow } from "@/lib/edges";
import type { RankedEdgeRow } from "@/lib/marketRankings";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Tails | TailSlips" };

/* Stable always; Market Masters under the tier flag. VIP subscriptions live
 * inside the stable (a subscribed capper's card carries its VIP picks), not
 * in a tab. A lone stable renders bare (no tab strip). A requested tab that
 * is not present falls back to the stable. */
function renderMyTailsSections(
  requestedTab: MyTailsTab | null,
  stable: ReactNode,
  board: ReactNode
) {
  const tabs: MyTailsTabSpec[] = [{ key: "stable", label: "Stable", content: stable }];
  if (vipTierEnabled()) tabs.push({ key: "board", label: "Market Masters", content: board });
  if (tabs.length === 1) return stable;
  const initialTab = tabs.some((t) => t.key === requestedTab) ? (requestedTab as MyTailsTab) : "stable";
  return <MyTailsTabs initialTab={initialTab} tabs={tabs} />;
}

export default async function MyTailsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  if (!vipEnabled()) notFound();

  const { tab } = await searchParams;
  const requestedTab: MyTailsTab | null =
    tab === "board" ? tab : null;

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  // limit=500 (the backend max) on purpose: this response is the lookup
  // table for the user's stable, not a top-N board. At the default 100 rows
  // any tailed capper below the 100th by season profit fell out of byId and
  // was silently dropped from the page (dbunk_picks at -185u, 2026-08-16).
  const lb = await fetchLeaderboard({
    window: "season",
    sort: "units_profit",
    bet_type: "all",
    min_picks: 0,
    active_only: false,
    limit: 500,
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
          <div className="mt-8">
            {renderMyTailsSections(
              requestedTab,
              <EmptyStable suggestions={top3} />,
              <MarketRankings rows={[]} vip={false} />
            )}
          </div>
        </main>
      </>
    );
  }

  const { data: follows, error: followsError } = await supabase
    .from("capper_follows")
    .select("capper_id, market, default_stake")
    .eq("user_id", user.id);
  if (followsError) console.error("my-tails follows query failed:", followsError);
  const followRows = (follows ?? []) as {
    capper_id: number;
    market: string;
    default_stake: number | null;
  }[];
  // VIP subscriptions ride in the stable: a subscribed capper is always on
  // it (subscribing is the strongest tail) and its card carries the picks.
  const vipByCapper = capperVipReachable() ? await loadVipByCapper(supabase) : {};
  const ids = [
    ...new Set([...followRows.map((f) => f.capper_id), ...Object.keys(vipByCapper).map(Number)]),
  ];

  // Assigned slip stake per capper (first non-null across the capper's
  // follow rows; the setter writes them all so they agree).
  const stakesByCapper: Record<string, number> = {};
  for (const f of followRows) {
    if (f.default_stake != null && stakesByCapper[String(f.capper_id)] === undefined) {
      stakesByCapper[String(f.capper_id)] = Number(f.default_stake);
    }
  }

  // "Start fresh" baseline for the slip tally.
  const { data: slipProfile, error: slipProfileError } = await supabase
    .from("ts_profiles")
    .select("slip_reset_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (slipProfileError) console.error("my-tails reset query failed:", slipProfileError);
  const slipResetAt = (slipProfile?.slip_reset_at as string | null) ?? null;

  // Market Masters is paid-tier inventory (decisions/log.md 2026-07-11):
  // held out of the free launch entirely and only fetched once the tier is
  // live. Cross-capper read of the whole edges table; RLS gates it to VIP
  // JWTs; x_n rides along because the ranking sort needs it.
  let isVip = false;
  let rankingRows: RankedEdgeRow[] = [];
  if (vipTierEnabled()) {
    const { data: tsProfile, error: tsProfileError } = await supabase
      .from("ts_profiles")
      .select("tier")
      .eq("user_id", user.id)
      .maybeSingle();
    if (tsProfileError) console.error("my-tails tier query failed:", tsProfileError);
    isVip = tsProfile?.tier === "vip";
  }
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
      profile_image_url: byId.get(String(e.capper_id))?.profile_image_url ?? null,
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

  // Per-market ROI for tailed scopes. The source table is VIP-RLS-gated but
  // ROI itself is public (it's on every profile page), so the read goes
  // through the service role with ONLY the public-safe columns projected.
  // The de-lucked fields (xROI, CLV, verdicts) stay VIP and never reach
  // this surface.
  const scopedIds = Object.keys(scopesByCapper).map(Number);
  const statsByCapper: Record<string, ScopeStat[]> = {};
  const serviceSupabase = scopedIds.length > 0 ? createServiceSupabase() : null;
  if (serviceSupabase && scopedIds.length > 0) {
    const { data: statRows, error: statError } = await serviceSupabase
      .from("capper_market_edges")
      .select("capper_id, market, roi_pct, n_decided")
      .in("capper_id", scopedIds);
    if (statError) console.error("my-tails scope stats query failed:", statError);
    for (const e of (statRows ?? []) as (ScopeStat & { capper_id: number })[]) {
      const key = String(e.capper_id);
      if (scopesByCapper[key]?.includes(e.market)) {
        (statsByCapper[key] ??= []).push({
          market: e.market,
          roi_pct: e.roi_pct,
          n_decided: e.n_decided,
        });
      }
    }
  }

  // A VIP capper off the season board (hidden preview capper, no picks this
  // season) still belongs on the stable: build its row from the subscription.
  const stable = ids
    .map((id) => byId.get(String(id)) ?? vipOnlyRow(vipByCapper[String(id)]))
    .filter(Boolean) as CapperRow[];
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
      <BetSlipProvider
        todayDate={today.date || null}
        initialStakes={stakesByCapper}
        initialResetAt={slipResetAt}
      >
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
        {(() => {
          const stableView =
            ids.length === 0 ? (
              <EmptyStable suggestions={top3} />
            ) : (
              <StableGrid
                initial={stable}
                todayByCapper={todayByCapper}
                todayDate={today.date || null}
                scopesByCapper={scopesByCapper}
                statsByCapper={statsByCapper}
                vipByCapper={vipByCapper}
              />
            );
          // Tabs exist for the Market Masters (paid-tier) sub-page; with the
          // flag off, the launch is the stable alone.
          return renderMyTailsSections(
            requestedTab,
            stableView,
            <MarketRankings rows={rankingRows} vip={isVip} />
          );
        })()}
      </main>
      </BetSlipProvider>
    </>
  );
}

/** The viewer's VIP subscriptions keyed by capper id: every subscription
 *  with access, plus paused ones (shown with a paused line). Ended ones drop
 *  out. Fails soft: the stable still renders without them. */
async function loadVipByCapper(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>
): Promise<Record<string, VipSubscription>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? null;
  if (!token) return {};
  try {
    const { subscriptions } = await getVipSubscriptions(token);
    const out: Record<string, VipSubscription> = {};
    for (const sub of subscriptions) {
      // In preview only the listed test cappers' subscriptions surface.
      if (!capperVipEnabledFor(sub.capper.handle)) continue;
      if (hasVipAccess(sub) || sub.status === "paused") out[String(sub.capper.id)] = sub;
    }
    return out;
  } catch (err) {
    console.error("my-tails vip subscriptions failed:", err);
    return {};
  }
}
