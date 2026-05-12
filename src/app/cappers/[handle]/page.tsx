import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { TopNav } from "@/components/nav/TopNav";
import { CapperHero } from "@/components/capper/CapperHero";
import { StatBand } from "@/components/capper/StatBand";
import { WindowToggle } from "@/components/capper/WindowToggle";
import { BetTypeToggle } from "@/components/capper/BetTypeToggle";
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
  formatRecord,
  formatRoiForTitle,
  formatUnitsForTitle,
  SITE_NAME,
} from "@/lib/seo";
import type { BetTypeFilter, CapperRow, Window } from "@/lib/types";

interface PageProps {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{
    window?: string;
    offset?: string;
    market?: string;
    outcome?: string;
    bet_type?: string;
  }>;
}

const VALID_WINDOWS: Window[] = ["last_7", "last_30", "season", "all_time"];
const VALID_BET_TYPES: BetTypeFilter[] = ["all", "straights", "parlays"];
const PAGE_SIZE = 25;

export const revalidate = 60;
export const maxDuration = 30;

function filterLabelFor(window: Window, betType: BetTypeFilter): string {
  const w =
    window === "season"
      ? "Season"
      : window === "last_30"
        ? "Last 30"
        : window === "last_7"
          ? "Last 7"
          : null;
  const bt =
    betType === "straights" ? "Straights" : betType === "parlays" ? "Parlays" : null;
  return [bt, w].filter(Boolean).join(" · ");
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const sp = await searchParams;

  // Resolve filter from the page's own query params so the meta tags (and
  // OG image route URL) mirror the page view the share URL points at.
  const requestedWindow = sp.window as Window | undefined;
  const requestedBetType = sp.bet_type as BetTypeFilter | undefined;
  const window: Window =
    requestedWindow && VALID_WINDOWS.includes(requestedWindow) ? requestedWindow : "all_time";
  const betType: BetTypeFilter =
    requestedBetType && VALID_BET_TYPES.includes(requestedBetType) ? requestedBetType : "all";
  const hasFilter = window !== "all_time" || betType !== "all";

  // Canonical stays unfiltered for SEO; og:url reflects the actual shared
  // URL so social click-throughs land on the filtered view they were sold.
  const canonical = `/cappers/${handle}`;
  const sharedQs = new URLSearchParams();
  if (sp.window) sharedQs.set("window", sp.window);
  if (sp.bet_type) sharedQs.set("bet_type", sp.bet_type);
  const sharedUrl = sharedQs.toString() ? `${canonical}?${sharedQs.toString()}` : canonical;

  const buildOgImageUrl = (picksFp: number): string => {
    const q = new URLSearchParams();
    q.set("w", window);
    q.set("bt", betType);
    q.set("p", String(picksFp));
    return `/cappers/${handle}/og?${q.toString()}`;
  };

  try {
    // history_limit must be >= 1 per the Railway API validator; we don't use
    // history rows here so use the minimum.
    const profile = await fetchCapperProfile(handle, {
      history_limit: 1,
      history_offset: 0,
      bet_type: betType !== "all" ? betType : undefined,
    });
    const allTimeAgg = profile.aggregates["all_time"];
    const filteredAgg = profile.aggregates[window] ?? allTimeAgg;
    const windowAgg = profile.aggregates["last_30"] ?? allTimeAgg;

    const baseInputs = {
      handle,
      displayName: profile.capper.display_name,
      windowAgg,
      allTimeAgg,
      trackedSince: allTimeAgg?.tracked_since ?? null,
    };

    let title: string;
    let description: string;
    let ogDescription: string;
    if (hasFilter && filteredAgg && filteredAgg.picks_count > 0) {
      // Filter-aware text so the meta description matches the OG card image
      // rather than contradicting it with all-time numbers.
      const fLabel = filterLabelFor(window, betType);
      const r = formatRecord(filteredAgg);
      const u = formatUnitsForTitle(filteredAgg.units_profit);
      const ro = formatRoiForTitle(filteredAgg.roi_pct);
      const name =
        profile.capper.display_name && profile.capper.display_name !== handle
          ? `${profile.capper.display_name} (@${handle})`
          : `@${handle}`;
      title = `@${handle} · ${fLabel} · ${r} ${u} (${ro}) · ${SITE_NAME}`;
      description = `${name} on ${fLabel.toLowerCase()}: ${r} (${u}, ${ro}) across ${filteredAgg.picks_count} graded picks. Verified on ${SITE_NAME}.`;
      ogDescription = `${fLabel}: ${r} ${u} (${ro}) across ${filteredAgg.picks_count} graded picks.`;
    } else {
      title = buildCapperTitle(baseInputs);
      description = buildCapperDescription(baseInputs);
      ogDescription = buildCapperOgDescription(baseInputs);
    }

    // Fingerprint the OG image URL with the filtered picks_count. X caches
    // OG images per URL forever, so changing the URL whenever the underlying
    // numbers move forces a re-crawl for the next share.
    const picksFp = filteredAgg?.picks_count ?? 0;
    const ogImage = buildOgImageUrl(picksFp);

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description: ogDescription,
        url: sharedUrl,
        type: "profile",
        siteName: SITE_NAME,
        images: [
          { url: ogImage, width: 1200, height: 630, alt: "Verified MLB capper record on TailSlips" },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: ogDescription,
        site: "@FadeAI_",
        images: [{ url: ogImage, alt: "Verified MLB capper record on TailSlips" }],
      },
      robots: { index: true, follow: true },
    };
  } catch {
    const title = `@${handle} · MLB capper record on ${SITE_NAME}`;
    const description = `@${handle} is tracked on ${SITE_NAME}. Every public MLB pick is parsed within seconds and graded against final game outcomes.`;
    const ogImage = buildOgImageUrl(0);
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: sharedUrl,
        type: "profile",
        siteName: SITE_NAME,
        images: [
          { url: ogImage, width: 1200, height: 630, alt: "Verified MLB capper record on TailSlips" },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        site: "@FadeAI_",
        images: [{ url: ogImage, alt: "Verified MLB capper record on TailSlips" }],
      },
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
  const betType: BetTypeFilter = VALID_BET_TYPES.includes(sp.bet_type as BetTypeFilter)
    ? (sp.bet_type as BetTypeFilter)
    : "all";

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
        bet_type: betType !== "all" ? betType : undefined,
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
  if (betType !== "all") queryForPagination.set("bet_type", betType);

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
          <div className="flex items-center gap-2 flex-wrap">
            <BetTypeToggle current={betType} basePath={basePath} />
            <WindowToggle current={window} basePath={basePath} />
          </div>
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

        <section className="mt-10 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5 sm:p-6">
          <h2 className="text-[12px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold mb-3">
            How this record is calculated
          </h2>
          <p className="text-[13px] leading-relaxed text-[var(--color-text-soft)] mb-3">
            This page reflects every publicly posted pick from @{handle} that declared a side,
            line where applicable, odds taken, and unit stake. Picks without those details are
            not gradeable and are not shown. Moneylines without posted odds are graded at the
            Pinnacle close; spreads and totals default to -110. Player props without odds count
            toward win rate but not units profit.
          </p>
          <p className="text-[13px] leading-relaxed text-[var(--color-text-soft)]">
            Full rules at{" "}
            <Link
              href="/methodology"
              className="underline text-[var(--color-text)] hover:text-[var(--color-text)]"
            >
              methodology
            </Link>
            . If you&apos;re @{handle} and you spot a genuine misattribution, email{" "}
            <a
              href={`mailto:corrections@tailslips.com?subject=Correction%20for%20%40${handle}`}
              className="underline text-[var(--color-text)] hover:text-[var(--color-text)]"
            >
              corrections@tailslips.com
            </a>
            .
          </p>
        </section>

        <footer className="flex items-center justify-between py-7 pb-2 mt-8 text-xs text-[var(--color-text-muted)] font-medium">
          <div>Aggregates refresh daily at 6:00 AM PT.</div>
        </footer>
      </main>
    </>
  );
}
