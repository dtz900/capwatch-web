import { BiggestWin } from "@/components/leaderboard/BiggestWin";
import {
  formatRoi,
  formatStreak,
  formatUnits,
  formatWinRate,
} from "@/lib/formatters";
import type { CapperAggregate } from "@/lib/types";

export function StatBand({ agg }: { agg: CapperAggregate | undefined }) {
  if (!agg) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-6 py-8 text-center text-[13px] text-[var(--color-text-muted)] italic">
        No graded picks in this window yet.
      </div>
    );
  }

  const unitsPositive = agg.units_profit >= 0;
  const roiPositive = agg.roi_pct >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-4">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <Stat
            label="Net profit"
            value={formatUnits(agg.units_profit)}
            tone={unitsPositive ? "pos" : "neg"}
            big
          />
          <Stat
            label="ROI"
            value={formatRoi(agg.roi_pct)}
            tone={roiPositive ? "pos" : "neg"}
            big
          />
          <Stat label="Win rate" value={formatWinRate(agg.win_rate)} />
          <Stat label="Picks" value={String(agg.picks_count)} />
          <Stat label="Wins" value={String(agg.wins)} tone="pos" />
          <Stat label="Losses" value={String(agg.losses)} tone="neg" />
          <Stat label="Pushes" value={String(agg.pushes)} />
          <Stat
            label="Streak"
            value={formatStreak(agg.current_streak)}
            tone={agg.current_streak > 0 ? "pos" : agg.current_streak < 0 ? "neg" : "neutral"}
          />
        </div>
      </div>
      <div>
        <BiggestWin win={agg.biggest_win} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
  big = false,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg" | "neutral";
  big?: boolean;
}) {
  const color =
    tone === "pos"
      ? "text-[var(--color-pos)]"
      : tone === "neg"
        ? "text-[var(--color-neg)]"
        : "text-[var(--color-text)]";
  const size = big ? "text-[24px]" : "text-[16px]";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold mb-1.5">
        {label}
      </div>
      <div className={`font-extrabold tabular-nums leading-none tracking-[-0.02em] ${size} ${color}`}>
        {value}
      </div>
    </div>
  );
}
