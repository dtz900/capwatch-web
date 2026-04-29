import Link from "next/link";
import { TopNav } from "@/components/nav/TopNav";
import { CapperAvatar } from "@/components/leaderboard/CapperAvatar";
import { ModelTag } from "@/components/leaderboard/ModelTag";
import { PaidProgramPill } from "@/components/leaderboard/PaidProgramPill";
import { fetchLeaderboard } from "@/lib/api";
import {
  formatHandle,
  formatRoi,
  formatUnits,
  formatWinRate,
} from "@/lib/formatters";
import type { CapperRow } from "@/lib/types";

export const metadata = {
  title: "Cappers · Capwatch",
  description:
    "Every tracked capper on Capwatch. Click a row for the full pick history and audit trail.",
};

export default async function CappersIndexPage() {
  const data = await fetchLeaderboard({
    window: "all_time",
    sort: "units_profit",
    min_picks: 0,
    active_only: false,
  });
  const cappers = [...data.leaderboard].sort((a, b) =>
    (a.display_name ?? a.handle ?? "").localeCompare(b.display_name ?? b.handle ?? ""),
  );

  return (
    <>
      <TopNav />
      <main className="max-w-[1240px] mx-auto px-7 pb-16">
        <header className="pt-10 pb-7">
          <div className="text-[10px] uppercase tracking-[0.20em] text-[var(--color-text-muted)] font-bold mb-2">
            Capper index
          </div>
          <h1 className="text-[36px] font-extrabold tracking-[-0.025em] leading-none">
            All tracked cappers
          </h1>
          <p className="text-[13px] text-[var(--color-text-soft)] font-medium mt-2">
            {cappers.length} capper{cappers.length === 1 ? "" : "s"} tracked.
            Click any row for the full pick history.
          </p>
        </header>

        <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden">
          {cappers.map((c, i) => (
            <CapperIndexRow key={c.capper_id} capper={c} isLast={i === cappers.length - 1} />
          ))}
        </div>

        <footer className="flex items-center justify-between py-7 pb-2 mt-6 text-xs text-[var(--color-text-muted)] font-medium">
          <div>All-time stats. Daily refresh at 6:00 AM PT.</div>
        </footer>
      </main>
    </>
  );
}

function CapperIndexRow({ capper: c, isLast }: { capper: CapperRow; isLast: boolean }) {
  const isModel = c.handle === "fadeai_";
  const unitsCls =
    c.units_profit >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]";
  const roiCls = c.roi_pct >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]";

  return (
    <Link
      href={c.handle ? `/cappers/${c.handle}` : "#"}
      className={`grid grid-cols-[40px_minmax(220px,1fr)_80px_80px_70px_70px] items-center gap-3 px-5 py-3.5
                  hover:bg-[rgba(255,255,255,0.025)] transition-colors
                  ${isLast ? "" : "border-b border-[rgba(255,255,255,0.04)]"}`}
    >
      <CapperAvatar url={c.profile_image_url} handle={c.handle} size={36} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[14px] truncate text-[var(--color-text)]">
            {c.display_name ?? c.handle}
          </span>
          {isModel && <ModelTag />}
          {c.has_paid_program && <PaidProgramPill />}
        </div>
        <div className="text-[12px] text-[var(--color-text-muted)] font-medium truncate">
          {c.handle ? formatHandle(c.handle) : ""}
        </div>
      </div>
      <div className="text-right text-[12px] text-[var(--color-text-soft)] font-semibold tabular-nums">
        {c.picks_count} picks
      </div>
      <div className={`text-right text-[12px] font-bold tabular-nums ${unitsCls}`}>
        {formatUnits(c.units_profit)}u
      </div>
      <div className={`text-right text-[12px] font-bold tabular-nums ${roiCls}`}>
        {formatRoi(c.roi_pct)}
      </div>
      <div className="text-right text-[12px] text-[var(--color-text-soft)] font-semibold tabular-nums">
        {formatWinRate(c.win_rate)}
      </div>
    </Link>
  );
}
