import { TopNav } from "@/components/nav/TopNav";
import { Hero } from "@/components/leaderboard/Hero";
import { FilterBarClient } from "@/components/leaderboard/FilterBarClient";
import { Podium } from "@/components/leaderboard/Podium";
import { StandingsTable } from "@/components/leaderboard/StandingsTable";
import { fetchLeaderboard, type LeaderboardFilters } from "@/lib/api";
import type { Window, Sort } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ window?: string; sort?: string; min_picks?: string; active_only?: string }>;
}

const VALID_WINDOWS: Window[] = ["all_time", "season", "last_30", "last_7"];
const VALID_SORTS: Sort[] = ["roi_pct", "units_profit", "win_rate", "picks_count"];

export default async function Home({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filters: LeaderboardFilters = {
    window: VALID_WINDOWS.includes(sp.window as Window) ? (sp.window as Window) : "all_time",
    sort: VALID_SORTS.includes(sp.sort as Sort) ? (sp.sort as Sort) : "roi_pct",
    min_picks: sp.min_picks ? parseInt(sp.min_picks, 10) : 5,
    active_only: sp.active_only !== "false",
  };

  const data = await fetchLeaderboard(filters);
  const rows = data.leaderboard;
  const totalPicks = rows.reduce((s, r) => s + r.picks_count, 0);
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3, 50);

  return (
    <>
      <TopNav />
      <main className="max-w-[1240px] mx-auto px-7">
        <div className="flex items-end justify-between gap-5 flex-wrap pt-14 pb-8">
          <Hero totalCappers={rows.length} totalPicks={totalPicks} />
          <FilterBarClient initial={filters} />
        </div>
        {top3.length === 3 && <Podium rows={top3} />}
        {rest.length > 0 && <StandingsTable rows={rest} startRank={4} />}
        <footer className="flex items-center justify-between py-7 pb-16 text-xs text-[var(--color-text-muted)] font-medium">
          <div>Min 5 graded picks. Aggregates refresh daily 6:00 AM PT.</div>
          <div>Operated by FADE AI · The model entry is graded identically</div>
        </footer>
      </main>
    </>
  );
}
