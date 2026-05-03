import { notFound } from "next/navigation";
import { TopNav } from "@/components/nav/TopNav";
import { CapperHero } from "@/components/capper/CapperHero";
import { StatBand } from "@/components/capper/StatBand";
import { WindowToggle } from "@/components/capper/WindowToggle";
import { PendingBlock } from "@/components/capper/PendingBlock";
import { HistoryFilters } from "@/components/capper/HistoryFilters";
import { HistoryTable } from "@/components/capper/HistoryTable";
import { MarketMixBar } from "@/components/capper/MarketMixBar";
import { fetchCapperProfile } from "@/lib/api";
import type { Window } from "@/lib/types";

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

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps) {
  const { handle } = await params;
  return {
    title: `@${handle} · TailSlips`,
    description: `Pick history and audit trail for @${handle} on TailSlips.`,
  };
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
  try {
    profile = await fetchCapperProfile(handle, {
      history_limit: PAGE_SIZE,
      history_offset: offset,
      market: market || undefined,
      outcome: outcome || undefined,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "not_found") notFound();
    return (
      <>
        <TopNav />
        <main className="max-w-[1240px] mx-auto px-7 pt-12 pb-16">
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

  return (
    <>
      <TopNav />
      <main className="max-w-[1240px] mx-auto px-7 pb-16">
        <div className="pt-10">
          <CapperHero profile={profile} windowAgg={windowAgg ?? allTimeAgg} recentHistory={profile.history} />
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
            <PendingBlock picks={profile.pending} />
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

        <footer className="flex items-center justify-between py-7 pb-2 mt-8 text-xs text-[var(--color-text-muted)] font-medium">
          <div>Aggregates refresh daily at 6:00 AM PT.</div>
        </footer>
      </main>
    </>
  );
}
