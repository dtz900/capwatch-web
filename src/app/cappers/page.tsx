import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { TopNav } from "@/components/nav/TopNav";
import { CapperAvatar } from "@/components/leaderboard/CapperAvatar";
import { PaidProgramPill } from "@/components/leaderboard/PaidProgramPill";
import { StatusPill } from "@/components/leaderboard/StatusPill";
import { DeletedPicksPill } from "@/components/leaderboard/DeletedPicksPill";
import { LivePicksIndicator } from "@/components/leaderboard/LivePicksIndicator";
import { LivePicksProvider } from "@/components/leaderboard/LivePicksContext";
import { StreakBadge } from "@/components/leaderboard/StreakBadge";
import { ChevronIcon } from "@/components/icons/ChevronIcon";
import { JsonLd } from "@/components/seo/JsonLd";
import { fetchLeaderboard } from "@/lib/api";
import { breadcrumbNode } from "@/lib/jsonld";
import {
  formatHandle,
  formatRoi,
  formatUnits,
  formatWinRate,
} from "@/lib/formatters";
import type { CapperRow } from "@/lib/types";

export const metadata = {
  title: "MLB Cappers · Verified Records & Leaderboard",
  description:
    "Track every MLB Twitter capper's verified record, units profit, ROI, and full graded pick history. A daily-updated ledger of public picks, win or lose.",
  alternates: { canonical: "/cappers" },
  openGraph: {
    title: "MLB Cappers · Verified Records & Leaderboard · TailSlips",
    description:
      "Track every MLB Twitter capper's verified record, units, ROI, and full graded pick history on TailSlips. A daily-updated ledger of public picks.",
    url: "/cappers",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MLB Cappers · Verified Records & Leaderboard · TailSlips",
    description: "Every tracked MLB Twitter capper, with verified records and full graded pick history.",
  },
};

export const revalidate = 60;
// Give the retry-aware fetch room: 2 attempts of up to 10s each plus
// backoff fits inside ~25s. Default Vercel maxDuration can be tighter,
// so set it explicitly.
export const maxDuration = 30;

const DESKTOP_GRID =
  "hidden sm:grid grid-cols-[44px_minmax(220px,1fr)_72px_84px_72px_72px_20px] items-center gap-4";

export default async function CappersIndexPage() {
  let cappers: CapperRow[] = [];
  let fetchError: string | null = null;
  try {
    const data = await fetchLeaderboard({
      window: "all_time",
      sort: "units_profit",
      bet_type: "all",
      min_picks: 0,
      active_only: false,
      // limit=500: the directory lists every tracked capper, not the top 100.
      limit: 500,
    });
    cappers = [...data.leaderboard].sort((a, b) =>
      (a.display_name ?? a.handle ?? "").localeCompare(b.display_name ?? b.handle ?? ""),
    );
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
    // Don't ISR-cache a failed render. Without this, a single transient
    // 503 from Railway would stick the fallback message in the CDN for
    // 60s for every visitor, even after the upstream recovered.
    noStore();
  }

  if (fetchError) {
    return (
      <>
        <TopNav />
        <main className="max-w-[1240px] mx-auto px-4 sm:px-7 pb-16 pt-12">
          <h1 className="text-[24px] font-extrabold mb-2">Capper index</h1>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            Leaderboard is temporarily unavailable. Refresh in a moment.
          </p>
        </main>
      </>
    );
  }

  // Seed the live-picks context with the SSR counts, same as the homepage;
  // the provider polls every 30s after mount.
  const liveInitial: Record<number, number> = {};
  for (const r of cappers) {
    if (r.live_picks_count > 0) liveInitial[Number(r.capper_id)] = r.live_picks_count;
  }

  return (
    <>
      <JsonLd
        data={breadcrumbNode([
          { name: "Home", path: "/" },
          { name: "Cappers", path: "/cappers" },
        ])}
      />
      <TopNav />
      {/* Provider gives directory rows the same 30s live-pick polling as the
          homepage; without it the indicator froze at the SSR value (Codex #68). */}
      <LivePicksProvider initial={liveInitial}>
      <main className="max-w-[1240px] mx-auto px-4 sm:px-7 pb-16">
        <header className="pt-12 pb-8">
          <div className="text-[10px] uppercase tracking-[0.20em] text-[var(--color-text-muted)] font-bold mb-2.5">
            Capper index
          </div>
          <h1 className="text-[36px] font-extrabold tracking-[-0.025em] leading-none">
            All tracked cappers
          </h1>
          <p className="text-[13px] text-[var(--color-text-soft)] font-medium mt-3 max-w-[560px] leading-relaxed">
            {cappers.length} capper{cappers.length === 1 ? "" : "s"} tracked.
            Click any row for the full pick history.
          </p>
        </header>

        <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl">
          <div
            className={`${DESKTOP_GRID} px-6 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em]
                       text-[var(--color-text-muted)] border-b border-[var(--color-border)]`}
          >
            <div></div>
            <div>Capper</div>
            <div className="text-right">Picks</div>
            <div className="text-right">Units</div>
            <div className="text-right">ROI</div>
            <div className="text-right">Win&nbsp;%</div>
            <div></div>
          </div>
          {cappers.map((c, i) => (
            <CapperIndexRow
              key={c.capper_id}
              capper={c}
              isLast={i === cappers.length - 1}
            />
          ))}
        </section>

        <footer className="flex items-center justify-between py-7 pb-2 mt-6 text-xs text-[var(--color-text-muted)] font-medium flex-wrap gap-3">
          <div>All-time stats. Daily refresh at 6:00 AM PT.</div>
          <div className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block rounded-full"
              style={{
                width: 12,
                height: 12,
                background:
                  "linear-gradient(135deg, #60a5fa 0%, #2563eb 50%, #1e40af 100%)",
                padding: 1.5,
                boxShadow: "0 0 6px rgba(37, 99, 235, 0.45)",
              }}
            >
              <span className="block w-full h-full rounded-full bg-[#0a0a0c]" />
            </span>
            <span>Gradient ring marks API-integrated cappers</span>
          </div>
        </footer>
      </main>
      </LivePicksProvider>
    </>
  );
}

function CapperIndexRow({
  capper: c,
  isLast,
}: {
  capper: CapperRow;
  isLast: boolean;
}) {
  const isModel = c.handle === "fadeai_";
  const unitsCls =
    c.units_profit >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]";
  const roiCls =
    c.roi_pct >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]";

  return (
    // Overlay-link row: the anchor is an absolutely positioned sibling, not a
    // wrapper, because DeletedPicksPill renders a <button> (with a dialog) and
    // nested interactive elements inside an <a> are invalid for browsers and
    // assistive tech (Codex #68). Interactive children re-stack above the
    // overlay with relative z-10.
    <div
      className={`group/row relative block hover:bg-[rgba(255,255,255,0.022)] transition-colors duration-150
                  ${isLast ? "" : "border-b border-[rgba(255,255,255,0.035)]"}`}
    >
      <Link
        href={c.handle ? `/cappers/${c.handle}` : "#"}
        aria-label={`${c.display_name ?? c.handle ?? "capper"} profile`}
        className="absolute inset-0"
      />
      <div className={`${DESKTOP_GRID} px-6 py-[18px]`}>
        <CapperAvatar url={c.profile_image_url} handle={c.handle} size={40} apiIntegrated={isModel} accountDeleted={c.account_deleted_at != null} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-[15px] truncate text-[var(--color-text)] tracking-[-0.01em]">
              {c.display_name ?? c.handle}
            </span>
            {c.has_paid_program && <PaidProgramPill />}
            <StreakBadge streak={c.current_day_streak} />
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)] font-medium mt-[3px] flex items-center gap-1.5 min-w-0">
            <span className="truncate">{c.handle ? formatHandle(c.handle) : ""}</span>
            {c.activity_status !== "active" && <StatusPill status={c.activity_status} />}
            <span className="relative z-10">
              <DeletedPicksPill count={c.deleted_picks_count ?? 0} handle={c.handle ?? undefined} />
            </span>
            <LivePicksIndicator capperId={c.capper_id} initialCount={c.live_picks_count} />
          </div>
        </div>
        <div className="text-right text-[13px] text-[var(--color-text-soft)] font-semibold tabular-nums">
          {c.picks_count}
        </div>
        <div className={`text-right text-[13px] font-bold tabular-nums ${unitsCls}`}>
          {formatUnits(c.units_profit)}u
        </div>
        <div className={`text-right text-[13px] font-bold tabular-nums ${roiCls}`}>
          {formatRoi(c.roi_pct)}
        </div>
        <div className="text-right text-[13px] text-[var(--color-text-soft)] font-semibold tabular-nums">
          {formatWinRate(c.win_rate)}
        </div>
        <div className="flex justify-end text-[var(--color-text-muted)] opacity-0 -translate-x-1 group-hover/row:opacity-100 group-hover/row:translate-x-0 transition-all duration-150">
          <ChevronIcon size={14} className="-rotate-90" />
        </div>
      </div>

      <div className="sm:hidden block px-4 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <CapperAvatar url={c.profile_image_url} handle={c.handle} size={40} apiIntegrated={isModel} accountDeleted={c.account_deleted_at != null} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-[15px] truncate text-[var(--color-text)] tracking-[-0.01em]">
                {c.display_name ?? c.handle}
              </span>
              {c.has_paid_program && <PaidProgramPill />}
              <StreakBadge streak={c.current_day_streak} />
            </div>
            <div className="text-[12px] text-[var(--color-text-muted)] font-medium mt-[2px] flex items-center gap-1.5 min-w-0">
              <span className="truncate">{c.handle ? formatHandle(c.handle) : ""}</span>
              {c.activity_status !== "active" && <StatusPill status={c.activity_status} />}
              <span className="relative z-10">
                <DeletedPicksPill count={c.deleted_picks_count ?? 0} handle={c.handle ?? undefined} />
              </span>
              <LivePicksIndicator capperId={c.capper_id} initialCount={c.live_picks_count} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3 text-center">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] font-bold">Picks</div>
            <div className="text-sm font-bold tabular-nums mt-0.5">{c.picks_count}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] font-bold">Win</div>
            <div className="text-sm font-bold tabular-nums mt-0.5">{formatWinRate(c.win_rate)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] font-bold">Units</div>
            <div className={`text-sm font-bold tabular-nums mt-0.5 ${unitsCls}`}>{formatUnits(c.units_profit)}u</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] font-bold">ROI</div>
            <div className={`text-sm font-bold tabular-nums mt-0.5 ${roiCls}`}>{formatRoi(c.roi_pct)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
