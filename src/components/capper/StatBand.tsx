import Link from "next/link";
import {
  formatRoi,
  formatStreak,
  formatUnits,
  formatUnitsSmart,
  formatWinRate,
} from "@/lib/formatters";
import { RecentTrajectory } from "@/components/capper/RecentTrajectory";
import type { CapperAggregate, FormOutcome, HistoryPick, Window } from "@/lib/types";

interface Props {
  agg: CapperAggregate | undefined;
  recentHistory?: HistoryPick[];
  /** Cumulative profit_units series for the active window. Rendered as a
   * full-width sparkline on mobile only (between ROI and LAST 10). Desktop
   * keeps the existing CapperHero placement. */
  trajectorySeries?: number[];
  window?: Window;
  /** "Season · Spread" scope label rendered above the headline numbers. */
  scopeLabel?: string;
  /** When true, a specific market is active: hide Streak and Biggest win,
   * which are not computed per market. */
  marketScoped?: boolean;
}

export function StatBand({
  agg,
  recentHistory = [],
  trajectorySeries = [],
  window,
  scopeLabel,
  marketScoped = false,
}: Props) {
  if (!agg) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-6 py-8 text-center text-[13px] text-[var(--color-text-muted)] italic">
        No graded picks in this window yet.
      </div>
    );
  }

  const unitsPositive = agg.units_profit >= 0;
  const roiPositive = agg.roi_pct >= 0;
  const recordText =
    agg.pushes > 0
      ? `${agg.wins}-${agg.losses}-${agg.pushes}`
      : `${agg.wins}-${agg.losses}`;
  const formCells: (FormOutcome | null)[] = recentHistory
    .slice(0, 10)
    .map((p) => p.outcome);
  while (formCells.length < 10) formCells.push(null);
  const streakTone =
    agg.current_streak > 0 ? "pos" : agg.current_streak < 0 ? "neg" : "neutral";
  const streakValue = agg.current_streak === 0 ? "0" : formatStreak(agg.current_streak);
  const win = agg.biggest_win;

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-5 py-6 sm:px-7 sm:py-7">
      {scopeLabel && (
        <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] font-bold mb-4">
          {scopeLabel}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-[minmax(160px,1.1fr)_minmax(160px,1.1fr)_minmax(180px,1fr)] gap-x-6 sm:gap-x-9 gap-y-6 sm:gap-y-7 items-end">
        <Headline label="Net profit" value={`${formatUnits(agg.units_profit)}u`} positive={unitsPositive} />
        <Headline label="ROI" value={formatRoi(agg.roi_pct)} positive={roiPositive} />
        {trajectorySeries.length >= 2 && (
          <div className="col-span-2 md:hidden">
            <RecentTrajectory
              series={trajectorySeries}
              window={window}
              hideLabel
              fullWidth
              height={120}
            />
          </div>
        )}
        <div className="col-span-2 md:col-span-1 md:text-right">
          <Eyebrow className="mb-2.5 md:text-right">Last 10</Eyebrow>
          <FormStrip cells={formCells} />
        </div>
      </div>

      <div className="mt-7 pt-6 border-t border-[var(--color-border)] grid grid-cols-2 md:grid-cols-4 gap-x-9 gap-y-6">
        <Stat label="Record" value={recordText} />
        <Stat label="Picks" value={String(agg.picks_count)} />
        <Stat label="Win rate" value={formatWinRate(agg.win_rate)} />
        {!marketScoped && <Stat label="Streak" value={streakValue} tone={streakTone} />}
      </div>

      {!marketScoped && win && (
        <div className="mt-6 pt-5 border-t border-[var(--color-border)] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-wrap">
            <Eyebrow>Biggest win</Eyebrow>
            {win.palace_slug && (
              // Gold crown badge: this biggest-win is a parlay enshrined
              // in Parlay Palace. mix-blend-mode: screen drops the source
              // PNG's black bg over the dark stat band.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/parlay-palace-crown.png"
                alt=""
                aria-hidden
                width={26}
                height={26}
                title="In the Parlay Palace"
                className="w-[26px] h-[26px] object-contain shrink-0"
                style={{
                  mixBlendMode: "screen",
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.55))",
                  transform: "rotate(-10deg)",
                }}
              />
            )}
            <span className="text-[16px] font-extrabold text-[var(--color-pos)] tabular-nums leading-none tracking-[-0.01em]">
              {formatUnitsSmart(win.units)}u
            </span>
            {(win.selection || win.game_label) && (
              <span className="text-[12px] text-[var(--color-text-soft)] font-medium truncate min-w-0">
                {[
                  win.selection,
                  win.odds_taken != null
                    ? `${win.odds_taken > 0 ? "+" : ""}${win.odds_taken}`
                    : null,
                  win.game_label,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 whitespace-nowrap">
            {win.tweet_url && (
              <a
                href={win.tweet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] uppercase tracking-[0.14em] font-extrabold
                           text-[var(--color-text-soft)] hover:text-[var(--color-text)]
                           transition-colors"
              >
                View on X
              </a>
            )}
            {win.palace_slug && (
              <Link
                href={`/parlay-palace/${win.palace_slug}`}
                className="text-[10px] uppercase tracking-[0.14em] font-extrabold
                           transition-colors hover:brightness-110"
                style={{ color: "#caa45a" }}
              >
                View in Parlay Palace →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Headline({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div>
      <Eyebrow className="mb-2.5">{label}</Eyebrow>
      <div
        className={`text-[36px] sm:text-[44px] font-extrabold tabular-nums leading-none tracking-[-0.025em]
                   ${positive ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"}`}
      >
        {value}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg" | "neutral";
}) {
  const cls =
    tone === "pos"
      ? "text-[var(--color-pos)]"
      : tone === "neg"
        ? "text-[var(--color-neg)]"
        : "text-[var(--color-text)]";
  return (
    <div>
      <Eyebrow className="mb-2">{label}</Eyebrow>
      <div className={`text-[18px] font-extrabold tabular-nums leading-none tracking-[-0.015em] ${cls}`}>
        {value}
      </div>
    </div>
  );
}

function Eyebrow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] font-bold ${className}`}
    >
      {children}
    </div>
  );
}

function FormStrip({ cells }: { cells: (FormOutcome | null)[] }) {
  return (
    <div className="flex md:justify-end gap-[3px]">
      {cells.map((o, i) => {
        const cls =
          o === "W"
            ? "bg-[var(--color-pos)]"
            : o === "L"
              ? "bg-[var(--color-neg)]"
              : o === "P"
                ? "bg-[rgba(255,255,255,0.28)]"
                : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]";
        return <span key={i} aria-hidden="true" className={`w-[14px] h-[20px] rounded-[2px] ${cls}`} />;
      })}
    </div>
  );
}
