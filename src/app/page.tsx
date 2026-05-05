import { TopNav } from "@/components/nav/TopNav";
import { Hero } from "@/components/leaderboard/Hero";
import { FilterBar } from "@/components/leaderboard/FilterBar";
import { Podium } from "@/components/leaderboard/Podium";
import { StandingsTable } from "@/components/leaderboard/StandingsTable";
import { SuggestCapperSection } from "@/components/leaderboard/SuggestCapperSection";
import { LivePicksProvider } from "@/components/leaderboard/LivePicksContext";
import { fetchLeaderboard, type LeaderboardFilters } from "@/lib/api";
import type { Window, Sort } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ window?: string; sort?: string; active_only?: string }>;
}

const VALID_WINDOWS: Window[] = ["all_time", "season", "last_30", "last_7"];
const VALID_SORTS: Sort[] = ["roi_pct", "units_profit", "win_rate", "picks_count"];
const MIN_PICKS = 10;

// ISR: render on first request, serve from edge cache for 5 minutes,
// regenerate in background. Heavy aggregates only refresh once/day so 5 min
// of staleness is invisible. The "N live" indicator updates near-realtime
// via LivePicksProvider polling, separate from this cache.
export const revalidate = 300;

export default async function Home({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filters: LeaderboardFilters = {
    window: VALID_WINDOWS.includes(sp.window as Window) ? (sp.window as Window) : "last_30",
    sort: VALID_SORTS.includes(sp.sort as Sort) ? (sp.sort as Sort) : "units_profit",
    min_picks: MIN_PICKS,
    active_only: sp.active_only !== "false",
  };

  let rows: Awaited<ReturnType<typeof fetchLeaderboard>>["leaderboard"] = [];
  let platformStats: Awaited<ReturnType<typeof fetchLeaderboard>>["platform_stats"];
  let fetchError: string | null = null;
  try {
    const data = await fetchLeaderboard(filters);
    rows = data.leaderboard;
    platformStats = data.platform_stats;
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
  }

  if (fetchError) {
    return (
      <>
        <TopNav />
        <main className="max-w-[1240px] mx-auto px-4 sm:px-7">
          <Hero />
          <div className="text-center py-16 text-[13px] text-[var(--color-text-muted)]">
            Leaderboard is temporarily unavailable. Refresh in a moment.
          </div>
        </main>
      </>
    );
  }

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3, 50);
  // Hero numbers come from platform_stats (cross-capper, all-time, no filter)
  // so the public "Records you can verify" promise tracks the admin truth and
  // doesn't shift when users toggle the leaderboard filters. Falls back to a
  // window-scoped sum if the backend is on an older deploy.
  const heroStats = platformStats
    ? { totalPicks: platformStats.graded_picks_total, cappersCount: platformStats.cappers_tracked }
    : {
        totalPicks: rows.reduce((sum, r) => sum + (r.picks_count ?? 0), 0),
        cappersCount: rows.length,
      };

  // Seed the live-picks context with the SSR-rendered counts so the first
  // paint already has correct values. The provider polls every 30s after
  // mount to keep the indicator fresh as cappers tweet new picks.
  const liveInitial: Record<number, number> = {};
  for (const r of rows) {
    if (r.live_picks_count > 0) liveInitial[Number(r.capper_id)] = r.live_picks_count;
  }

  return (
    <>
      <TopNav />
      <LivePicksProvider initial={liveInitial}>
        <main className="max-w-[1240px] mx-auto px-4 sm:px-7">
          <Hero stats={heroStats} />
          <div className="mb-8">
            <FilterBar filters={filters} />
          </div>
          {top3.length === 3 && <Podium rows={top3} />}
          {rest.length > 0 && <StandingsTable rows={rest} startRank={4} />}
          <SuggestCapperSection />
          <footer className="flex items-center justify-between py-7 pb-16 text-xs text-[var(--color-text-muted)] font-medium">
            <div>Min {MIN_PICKS} graded picks · refreshed daily 6:00 AM PT.</div>
            <div>Operated by FADE AI · The model entry is graded identically</div>
          </footer>
        </main>
      </LivePicksProvider>
    </>
  );
}
