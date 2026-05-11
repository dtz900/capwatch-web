import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { TopNav } from "@/components/nav/TopNav";
import { CapperHero } from "@/components/capper/CapperHero";
import { StatBand } from "@/components/capper/StatBand";
import { WindowToggle } from "@/components/capper/WindowToggle";
import { PendingBlock } from "@/components/capper/PendingBlock";
import { HistoryFilters } from "@/components/capper/HistoryFilters";
import { HistoryTable } from "@/components/capper/HistoryTable";
import { MarketMixBar } from "@/components/capper/MarketMixBar";
import { FaqSection } from "@/components/capper/FaqSection";
import { SimilarCappers } from "@/components/capper/SimilarCappers";
import { JsonLd } from "@/components/seo/JsonLd";
import { fetchCapperProfile, fetchEnabledSportsbooks, fetchLeaderboard } from "@/lib/api";
import { breadcrumbNode, capperPersonNode, capperReviewNode, faqNode } from "@/lib/jsonld";
import {
  buildCapperDescription,
  buildCapperFaq,
  buildCapperOgDescription,
  buildCapperTitle,
  SITE_NAME,
} from "@/lib/seo";
import type { CapperRow, Window } from "@/lib/types";

interface PageProps {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{
    window?: string;
    offset?: string;
    market?: string;
    outcome?: string;
  }>;
}

const VALID_WINDOWS: Window[] = ["last_7", "last_30", "season", "all_time"];
const PAGE_SIZE = 25;

export const revalidate = 60;
export const maxDuration = 30;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const canonical = `/cappers/${handle}`;
  try {
    const profile = await fetchCapperProfile(handle, { history_limit: 0, history_offset: 0 });
    const allTimeAgg = profile.aggregates["all_time"];
    const windowAgg = profile.aggregates["last_30"] ?? allTimeAgg;
    const inputs = {
      handle,
      displayName: profile.capper.display_name,
      windowAgg,
      allTimeAgg,
      trackedSince: allTimeAgg?.tracked_since ?? null,
    };
    const title = buildCapperTitle(inputs);
    const description = buildCapperDescription(inputs);
    const ogDescription = buildCapperOgDescription(inputs);
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description: ogDescription,
        url: canonical,
        type: "profile",
        siteName: SITE_NAME,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: ogDescription,
        site: "@FadeAI_",
      },
      robots: { index: true, follow: true },
    };
  } catch {
    const title = `@${handle} · MLB capper record on ${SITE_NAME}`;
    const description = `@${handle} is tracked on ${SITE_NAME}. Every public MLB pick is parsed within seconds and graded against final game outcomes.`;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, url: canonical, type: "profile", siteName: SITE_NAME },
      twitter: { card: "summary_large_image", title, description, site: "@FadeAI_" },
    };
  }
}

export default async function CapperPage({ params, searchParams }: PageProps) {
  const { handle } = await params;
  const sp = await searchParams;

  const window: Window = VALID_WINDOWS.includes(sp.window as Window)
    ? (sp.window as Window)
    : "last_30";
  const offset = Math.max(0, parseInt(sp.offset ?? "0", 10) || 0);
  const market = (sp.market ?? "").trim();
  const outcome = (sp.outcome ?? "").trim();

  let profile;
  let sportsbooks;
  let leaderboardRows: CapperRow[] = [];
  try {
    const [profileResult, sportsbooksResult, leaderboardResult] = await Promise.all([
      fetchCapperProfile(handle, {
        history_limit: PAGE_SIZE,
        history_offset: offset,
        market: market || undefined,
        outcome: outcome || undefined,
      }),
      fetchEnabledSportsbooks(),
      fetchLeaderboard({
        window: "season",
        sort: "units_profit",
        bet_type: "all",
        min_picks: 10,
        active_only: true,
      }).catch(() => ({ leaderboard: [] as CapperRow[] })),
    ]);
    profile = profileResult;
    sportsbooks = sportsbooksResult;
    leaderboardRows = leaderboardResult.leaderboard;
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "not_found") notFound();
    // Skip ISR cache on the transient-failure render so the next refresh
    // re-fetches against the now-recovered upstream.
    noStore();
    return (
      <>
        <TopNav />
        <main className="max-w-[1240px] mx-auto px-4 sm:px-7 pt-12 pb-16">
          <h1 className="text-[24px] font-extrabold mb-2">@{handle}</h1>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            Capper profile is temporarily unavailable. Refresh in a moment.
          </p>
        </main>
      </>
    );
  }

  const windowAgg = profile.aggregates[window];
  const allTimeAgg = profile.aggregates["all_time"];
  const basePath = `/cappers/${encodeURIComponent(handle)}`;

  const queryForPagination = new URLSearchParams();
  if (window !== "last_30") queryForPagination.set("window", window);
  if (market) queryForPagination.set("market", market);
  if (outcome) queryForPagination.set("outcome", outcome);

  const faqItems = buildCapperFaq({
    handle,
    displayName: profile.capper.display_name,
    allTimeAgg: allTimeAgg ?? undefined,
    trackedSince: allTimeAgg?.tracked_since ?? null,
  });

  const jsonLdNodes = [
    breadcrumbNode([
      { name: "Home", path: "/" },
      { name: "Cappers", path: "/cappers" },
      { name: `@${handle}`, path: `/cappers/${handle}` },
    ]),
    capperPersonNode(profile),
  ];
  const reviewNode = capperReviewNode(profile);
  if (reviewNode) jsonLdNodes.push(reviewNode);
  if (faqItems.length > 0) jsonLdNodes.push(faqNode(faqItems));

  return (
    <>
      <JsonLd data={jsonLdNodes} />
      <TopNav />
      <main className="max-w-[1240px] mx-auto px-4 sm:px-7 pb-16">
        <div className="pt-10">
          <CapperHero
            profile={profile}
            windowAgg={windowAgg ?? allTimeAgg}
            trajectorySeries={profile.trajectory?.[window] ?? []}
            window={window}
          />
        </div>

        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="text-[12px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold">
            Performance window
          </div>
          <WindowToggle current={window} basePath={basePath} />
        </div>

        <div className="mb-6">
          <StatBand agg={windowAgg} recentHistory={profile.history} />
        </div>

        {profile.pending.length > 0 && (
          <div className="mb-6">
            <PendingBlock picks={profile.pending} sportsbooks={sportsbooks} />
          </div>
        )}

        {(allTimeAgg?.bet_type_breakdown ?? null) && (
          <div className="mb-6">
            <MarketMixBar breakdown={allTimeAgg?.bet_type_breakdown ?? null} />
          </div>
        )}

        <section>
          <h2 className="text-[14px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold mb-3">
            Pick history
          </h2>
          <HistoryFilters basePath={basePath} market={market} outcome={outcome} />
          <HistoryTable
            history={profile.history}
            total={profile.history_total}
            offset={offset}
            basePath={basePath}
            query={queryForPagination}
          />
        </section>

        <SimilarCappers rows={leaderboardRows} currentHandle={handle} />

        <FaqSection items={faqItems} />

        <footer className="flex items-center justify-between py-7 pb-2 mt-8 text-xs text-[var(--color-text-muted)] font-medium">
          <div>Aggregates refresh daily at 6:00 AM PT.</div>
        </footer>
      </main>
    </>
  );
}
