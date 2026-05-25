import type { Metadata } from "next";
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { TopNav } from "@/components/nav/TopNav";
import { Hero } from "@/components/leaderboard/Hero";
import { FilterBar } from "@/components/leaderboard/FilterBar";
import { Podium } from "@/components/leaderboard/Podium";
import { StandingsTable } from "@/components/leaderboard/StandingsTable";
import { SuggestCapperSection } from "@/components/leaderboard/SuggestCapperSection";
import { LivePicksProvider } from "@/components/leaderboard/LivePicksContext";
import { LeaderboardPrefsRestorer } from "@/components/leaderboard/LeaderboardPrefsRestorer";
import { JsonLd } from "@/components/seo/JsonLd";
import { ShareLinkButton } from "@/components/share/ShareLinkButton";
import { SportsbookAd } from "@/components/affiliate/SportsbookAd";
import { BETMGM_1080x356 } from "@/lib/affiliates";
import { fetchLeaderboard, type LeaderboardFilters } from "@/lib/api";
import { breadcrumbNode, leaderboardItemListNode, organizationNode, websiteNode } from "@/lib/jsonld";
import { SITE_NAME } from "@/lib/seo";
import type { Window, Sort, BetTypeFilter } from "@/lib/types";
import { buildRootOgFingerprint, ROOT_OG_CARD_VERSION } from "./_root-og";

interface PageProps {
  searchParams: Promise<{ window?: string; sort?: string; bet_type?: string; active_only?: string; v?: string }>;
}

const VALID_WINDOWS: Window[] = ["all_time", "season", "last_30", "last_7"];
const VALID_SORTS: Sort[] = ["roi_pct", "units_profit", "win_rate", "picks_count"];
const VALID_BET_TYPES: BetTypeFilter[] = ["all", "straights", "parlays"];
const MIN_PICKS = 10;

// ISR: render on first request, serve from edge cache for 5 minutes,
// regenerate in background. Heavy aggregates only refresh once/day so 5 min
// of staleness is invisible. The "N live" indicator updates near-realtime
// via LivePicksProvider polling, separate from this cache.
export const revalidate = 300;
export const maxDuration = 30;

/**
 * Override the layout's static OG image with a fingerprinted Route Handler
 * URL. X caches OG bytes per share URL essentially forever and there's no
 * manual invalidation path anymore (the cards-dev validator was retired),
 * so the URL itself has to change whenever the leaderboard does. The
 * fingerprint includes the platform's graded-picks counter (bumps on every
 * grade event) and today's PT date (daily floor) so reposts of the same
 * tailslips.com URL after data changes get scraped fresh.
 */
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const filters: LeaderboardFilters = {
    window: VALID_WINDOWS.includes(sp.window as Window) ? (sp.window as Window) : "last_30",
    sort: VALID_SORTS.includes(sp.sort as Sort) ? (sp.sort as Sort) : "units_profit",
    bet_type: VALID_BET_TYPES.includes(sp.bet_type as BetTypeFilter) ? (sp.bet_type as BetTypeFilter) : "all",
    min_picks: MIN_PICKS,
    active_only: sp.active_only !== "false",
  };
  const fp = await buildRootOgFingerprint(filters);
  const q = new URLSearchParams();
  q.set("w", filters.window);
  q.set("sort", filters.sort);
  q.set("bt", filters.bet_type);
  if (!filters.active_only) q.set("ao", "false");
  q.set("d", fp.ptDate);
  if (fp.picks > 0) q.set("p", String(fp.picks));
  if (fp.cappers > 0) q.set("c", String(fp.cappers));
  if (fp.contentHash) q.set("h", fp.contentHash);
  q.set("v", ROOT_OG_CARD_VERSION);
  if (sp.v && /^[0-9]{8,}$/.test(sp.v)) q.set("sv", sp.v);
  const ogUrl = `/og/home?${q.toString()}`;
  const title = `${windowTitle(filters.window)} MLB Twitter Capper Rankings · ${SITE_NAME}`;
  return {
    title,
    openGraph: {
      title,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: "TailSlips · MLB Capper Scoreboard" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      images: [{ url: ogUrl, alt: "TailSlips · MLB Capper Scoreboard" }],
    },
  };
}

function windowTitle(w: Window): string {
  if (w === "last_7") return "Last 7";
  if (w === "season") return "Season";
  if (w === "all_time") return "All-time";
  return "Last 30";
}

export default async function Home({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filters: LeaderboardFilters = {
    window: VALID_WINDOWS.includes(sp.window as Window) ? (sp.window as Window) : "last_30",
    sort: VALID_SORTS.includes(sp.sort as Sort) ? (sp.sort as Sort) : "units_profit",
    bet_type: VALID_BET_TYPES.includes(sp.bet_type as BetTypeFilter) ? (sp.bet_type as BetTypeFilter) : "all",
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
    // Don't ISR-cache the failed render; let the next request retry.
    noStore();
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
      <JsonLd
        data={[
          organizationNode(),
          websiteNode(),
          breadcrumbNode([{ name: "Home", path: "/" }]),
          leaderboardItemListNode(rows),
        ]}
      />
      <Suspense fallback={null}>
        <LeaderboardPrefsRestorer />
      </Suspense>
      <TopNav />
      <LivePicksProvider initial={liveInitial}>
        <main className="max-w-[1240px] mx-auto px-4 sm:px-7">
          <Hero stats={heroStats} />
          <div className="mb-3">
            <FilterBar filters={filters} />
          </div>
          <div className="mb-8 flex justify-end">
            <ShareLinkButton
              basePath="/"
              queryParams={{
                window: filters.window !== "last_30" ? filters.window : undefined,
                sort: filters.sort !== "units_profit" ? filters.sort : undefined,
                bet_type: filters.bet_type !== "all" ? filters.bet_type : undefined,
                active_only: filters.active_only ? undefined : "false",
              }}
              label="Share this view"
            />
          </div>
          {top3.length === 3 && <Podium rows={top3} window={filters.window} />}
          {rows.length > 0 && (
            <div className="my-8 flex justify-center">
              <SportsbookAd
                creative={BETMGM_1080x356}
                placement="home-inline"
              />
            </div>
          )}
          {rest.length > 0 && <StandingsTable rows={rest} startRank={4} window={filters.window} />}
          <SuggestCapperSection />
          <footer className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 py-7 pb-16 text-xs text-[var(--color-text-muted)] font-medium">
            <div>Min {MIN_PICKS} graded picks · refreshed daily 6:00 AM PT.</div>
            <div>Operated by FADE AI · The model entry is graded identically</div>
          </footer>
        </main>
      </LivePicksProvider>
    </>
  );
}
