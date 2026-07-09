import Link from "next/link";
import type { CapperRow } from "@/lib/types";
import { CapperAvatar } from "@/components/leaderboard/CapperAvatar";
import { StreakBadge } from "@/components/leaderboard/StreakBadge";
import { Sparkline } from "@/components/leaderboard/Sparkline";
import { MomentumStrip } from "@/components/leaderboard/MomentumStrip";
import { formatUnits } from "@/lib/formatters";

export function StableCard({
  capper,
  onUntail,
}: {
  capper: CapperRow;
  onUntail: () => void;
}) {
  const positive = (capper.units_profit ?? 0) >= 0;
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#15151a] via-[#0f0f14] to-[#0a0a0d] border border-[var(--color-border)] px-5 py-5">
      <button
        aria-label={`Untail ${capper.display_name ?? capper.handle}`}
        onClick={onUntail}
        className="absolute right-3 top-3 z-10 text-[var(--color-text-muted)] hover:text-[var(--color-neg)] text-sm"
        title="Untail"
      >
        {"✕"}
      </button>
      <Link href={`/cappers/${capper.handle}`} className="block">
        <div className="flex items-center gap-3">
          <CapperAvatar url={capper.profile_image_url} handle={capper.handle} size={44} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--color-text)] truncate">
                {capper.display_name ?? capper.handle}
              </span>
              <StreakBadge streak={capper.current_day_streak} size="sm" />
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">@{capper.handle}</span>
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
              Net profit
            </div>
            <div
              className={`text-[32px] leading-none font-extrabold tabular-nums ${
                positive ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"
              }`}
            >
              {formatUnits(capper.units_profit)}
            </div>
            <div className="mt-1 text-xs text-[var(--color-text-soft)]">
              {capper.roi_pct != null ? `${capper.roi_pct > 0 ? "+" : ""}${capper.roi_pct.toFixed(1)}% ROI` : ""}
              {capper.win_rate != null ? ` · ${Math.round(capper.win_rate * 100)}% win` : ""}
              {` · ${capper.picks_count} picks`}
            </div>
          </div>
          {capper.trajectory_units && capper.trajectory_units.length >= 2 && (
            <Sparkline values={capper.trajectory_units} width={116} height={38} />
          )}
        </div>
        {capper.last_picks && capper.last_picks.length > 0 && (
          <div className="mt-3">
            <MomentumStrip picks={capper.last_picks} />
          </div>
        )}
      </Link>
    </div>
  );
}
