import type { Metadata } from "next";
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { TopNav } from "@/components/nav/TopNav";
import { Hero, HeroStats, HeroStatsSkeleton } from "@/components/leaderboard/Hero";
import { FilterBar } from "@/components/leaderboard/FilterBar";
import { SportTabs } from "@/components/leaderboard/SportTabs";
import { SportTint } from "@/components/ui/SportTint";
import { Podium } from "@/components/leaderboard/Podium";
import { StandingsTable } from "@/components/leaderboard/StandingsTable";
import { SuggestCapperSection } from "@/components/leaderboard/SuggestCapperSection";
import { EmptyBoard } from "@/components/leaderboard/EmptyBoard";
import { PendingBoard } from "@/components/leaderboard/PendingBoard";
import { BoardSkeleton } from "@/components/leaderboard/BoardSkeleton";
import { LivePicksProvider } from "@/components/leaderboard/LivePicksContext";
import { LeaderboardPrefsRestorer } from "@/components/leaderboard/LeaderboardPrefsRestorer";
import { JsonLd } from "@/components/seo/JsonLd";
import { ShareLinkButton } from "@/components/share/ShareLinkButton";
import { SplashContests } from "@/components/contests/SplashContests";
import { fetchLeaderboard, fetchTofHand, minPicksForWindow, withDeadline, type LeaderboardFilters } from "@/lib/api";
import { breadcrumbNode, leaderboardItemListNode, organizationNode, websiteNode } from "@/lib/jsonld";
import { tofEnabled } from "@/lib/flags";
import { SITE_NAME } from "@/lib/seo";
import type { Window, Sort, BetTypeFilter, SportFilter, TofHandResponse, LeaderboardResponse } from "@/lib/types";
import { buildRootOgFingerprint, ROOT_OG_CARD_VERSION } from "./_root-og";

interface PageProps {
  searchParams: Promise<{ window?: string; sort?: string; bet_type?: string; active_only?: string; sport?: string; v?: string }>;
}

const VALID_WINDOWS: Window[] = ["all_time", "season", "last_30", "last_7"];
const VALID_SPORTS: SportFilter[] = ["all", "mlb", "nfl", "nba"];
// The board defaults to the combined record; MLB / NFL / NBA are one click away.
const DEFAULT_SPORT: SportFilter = "all";
function parseSport(raw: string | undefined): SportFilter {
  return VALID_SPORTS.includes(raw as SportFilter) ? (raw as SportFilter) : DEFAULT_SPORT;
}
const VALID_SORTS: Sort[] = ["roi_pct", "units_profit", "win_rate", "picks_count"];
const VALID_BET_TYPES: BetTypeFilter[] = ["all", "straights", "parlays"];

// The Tail or Fade hand is server-rendered into the nav when it arrives
// quickly; past this deadline the shell ships without it and TofHero fetches
// the hand client-side (its existing no-initial path), so a slow hand never
// holds up the first paint.
const TOF_HAND_SHELL_DEADLINE_MS = 1_500;

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
  const filters = parseFilters(sp);
  const fp = await buildRootOgFingerprint(filters);
  const q = new URLSearchParams();
  q.set("w", filters.window);
  q.set("sort", filters.sort);
  q.set("bt", filters.bet_type);
  if (!filters.active_only) q.set("ao", "false");
  if (filters.sport && filters.sport !== "mlb") q.set("sp", filters.sport);
  q.set("d", fp.ptDate);
  if (fp.picks > 0) q.set("p", String(fp.picks));
  if (fp.cappers > 0) q.set("c", String(fp.cappers));
  if (fp.contentHash) q.set("h", fp.contentHash);
  q.set("v", ROOT_OG_CARD_VERSION);
  if (sp.v && /^[0-9]{8,}$/.test(sp.v)) q.set("sv", sp.v);
  const ogUrl = `/og/home?${q.toString()}`;
  const title = `${windowTitle(filters.window)} ${sportTitle(filters.sport)} Twitter Capper Rankings · ${SITE_NAME}`;
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

function parseFilters(sp: Awaited<PageProps["searchParams"]>): LeaderboardFilters {
  const win: Window = VALID_WINDOWS.includes(sp.window as Window) ? (sp.window as Window) : "last_30";
  return {
    window: win,
    sort: VALID_SORTS.includes(sp.sort as Sort) ? (sp.sort as Sort) : "units_profit",
    bet_type: VALID_BET_TYPES.includes(sp.bet_type as BetTypeFilter) ? (sp.bet_type as BetTypeFilter) : "all",
    min_picks: minPicksForWindow(win, parseSport(sp.sport)),
    active_only: sp.active_only !== "false",
    sport: parseSport(sp.sport),
  };
}

function sportTitle(s: SportFilter | undefined): string {
  if (s === "nfl") return "NFL";
  if (s === "mlb") return "MLB";
  if (s === "nba") return "NBA";
  return "MLB, NFL and NBA";
}

function windowTitle(w: Window): string {
  if (w === "last_7") return "Last 7";
  if (w === "season") return "Season";
  if (w === "all_time") return "All-time";
  return "Last 30";
}

export default async function Home({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filters = parseFilters(sp);

  // Kick off the leaderboard fetch now but do not await it here: the shell
  // (nav, hero, sport tabs, filters) streams immediately and the board lands
  // in its Suspense boundary when the data arrives. Both async children below
  // await this same promise, so the API is hit once. The no-op catch keeps a
  // rejection from surfacing as unhandled before a consumer awaits it; each
  // consumer handles the error itself.
  const board = fetchLeaderboard(filters);
  board.catch(() => {});

  // Tail or Fade hand. Runs concurrently with the leaderboard fetch above and
  // is the only data the shell waits for, under a short deadline. A failed or
  // slow fetch renders the no-hand state and is not ISR-cached as a failure;
  // TofHero re-fetches client-side and keeps polling every minute.
  let tofHand: TofHandResponse | null = null;
  if (tofEnabled()) {
    try {
      tofHand = await withDeadline<TofHandResponse | null>(fetchTofHand(), TOF_HAND_SHELL_DEADLINE_MS, null);
    } catch (err) {
      console.error("tof hand fetch failed:", err);
      noStore();
    }
  }

  return (
    <>
      <JsonLd
        data={[
          organizationNode(),
          websiteNode(),
          breadcrumbNode([{ name: "Home", path: "/" }]),
        ]}
      />
      <Suspense fallback={null}>
        <LeaderboardPrefsRestorer />
      </Suspense>
      <SportTint sport={filters.sport} />
      <TopNav tofHand={tofHand} />
      <main className="max-w-[1240px] mx-auto px-4 sm:px-7">
        <Hero
          sport={filters.sport}
          statsSlot={
            <Suspense fallback={<HeroStatsSkeleton />}>
              <HomeHeroStats board={board} />
            </Suspense>
          }
        />
        <div className="mb-4">
          <SportTabs current={filters.sport ?? "all"} />
        </div>
        <div className="mb-3">
          <FilterBar filters={filters} />
        </div>
        <div className="mb-8 flex justify-end">
          <ShareLinkButton
            basePath="/"
            queryParams={{
              sport: filters.sport !== DEFAULT_SPORT ? filters.sport : undefined,
              window: filters.window !== "last_30" ? filters.window : undefined,
              sort: filters.sort !== "units_profit" ? filters.sort : undefined,
              bet_type: filters.bet_type !== "all" ? filters.bet_type : undefined,
              active_only: filters.active_only ? undefined : "false",
            }}
            label="Share this view"
          />
        </div>
        <Suspense fallback={<BoardSkeleton />}>
          <HomeBoard board={board} filters={filters} />
        </Suspense>
        <SuggestCapperSection />
        <footer className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 py-7 pb-16 text-xs text-[var(--color-text-muted)] font-medium">
          <div>Min {minPicksForWindow(filters.window, filters.sport)} graded picks · refreshed daily 6:00 AM PT.</div>
          <div>Operated by FADE AI · The model entry is graded identically</div>
        </footer>
      </main>
    </>
  );
}

/**
 * Hero numbers come from platform_stats (cross-capper, all-time, no filter)
 * so the public "Records you can verify" promise tracks the admin truth and
 * doesn't shift when users toggle the leaderboard filters. Falls back to a
 * window-scoped sum if the backend is on an older deploy. A failed fetch
 * renders no stat row; HomeBoard owns the error message.
 */
async function HomeHeroStats({ board }: { board: Promise<LeaderboardResponse> }) {
  let data: LeaderboardResponse;
  try {
    data = await board;
  } catch {
    return null;
  }
  const rows = data.leaderboard;
  const stats = data.platform_stats
    ? { totalPicks: data.platform_stats.graded_picks_total, cappersCount: data.platform_stats.cappers_tracked }
    : {
        totalPicks: rows.reduce((sum, r) => sum + (r.picks_count ?? 0), 0),
        cappersCount: rows.length,
      };
  return <HeroStats stats={stats} />;
}

/** The leaderboard proper: podium, standings, pending board, empty state. Streams in behind BoardSkeleton. */
async function HomeBoard({ board, filters }: { board: Promise<LeaderboardResponse>; filters: LeaderboardFilters }) {
  let data: LeaderboardResponse;
  try {
    data = await board;
  } catch {
    // Don't ISR-cache the failed render; let the next request retry.
    noStore();
    return (
      <div className="text-center py-16 text-[13px] text-[var(--color-text-muted)]">
        Leaderboard is temporarily unavailable. Refresh in a moment.
      </div>
    );
  }

  const rows = data.leaderboard;
  const pendingOnly = data.pending_only ?? [];
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3, 100);

  // Seed the live-picks context with the SSR-rendered counts so the first
  // paint already has correct values. The provider polls every 30s after
  // mount to keep the indicator fresh as cappers tweet new picks.
  const liveInitial: Record<number, number> = {};
  for (const r of rows) {
    if (r.live_picks_count > 0) liveInitial[Number(r.capper_id)] = r.live_picks_count;
  }
  for (const r of pendingOnly) {
    if (r.live_picks_count > 0) liveInitial[Number(r.capper_id)] = r.live_picks_count;
  }

  return (
    <LivePicksProvider initial={liveInitial} sport={filters.sport}>
      <JsonLd data={leaderboardItemListNode(rows)} />
      {top3.length === 3 && <Podium rows={top3} window={filters.window} sport={filters.sport} />}
      {rows.length > 0 && (
        <SplashContests placement="home" className="my-8" />
      )}
      {rest.length > 0 && <StandingsTable rows={rest} startRank={4} window={filters.window} sport={filters.sport} />}
      <PendingBoard
        rows={pendingOnly}
        sport={filters.sport ?? "all"}
        window={filters.window}
        standalone={rows.length === 0}
      />
      {rows.length === 0 && pendingOnly.length === 0 && (
        <EmptyBoard sport={filters.sport ?? "all"} window={filters.window} />
      )}
    </LivePicksProvider>
  );
}
