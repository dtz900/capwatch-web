import type { HistoryPick, Window } from "@/lib/types";
import { formatUnitsSmart } from "@/lib/formatters";

interface Props {
  history: HistoryPick[];
  /**
   * Selected performance window. Drives both which picks are visualized
   * (date filter) and the title label. When omitted, falls back to the
   * legacy "last 25 picks" behavior.
   */
  window?: Window;
  width?: number;
  height?: number;
}

const WINDOW_LABEL: Record<Window, string> = {
  last_7: "Last 7 days",
  last_30: "Last 30 days",
  season: "Season",
  all_time: "All-time",
};

/**
 * Cutoff in ms-since-epoch for a given window. last_7 / last_30 are rolling
 * day windows; "season" anchors to Jan 1 of the current year as a workable
 * proxy for an MLB season (active April through October but pre-season /
 * spring training picks are rare on TailSlips); "all_time" returns 0.
 */
function cutoffFor(window: Window): number {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  switch (window) {
    case "last_7": return now - 7 * day;
    case "last_30": return now - 30 * day;
    case "season": return new Date(new Date().getUTCFullYear(), 0, 1).getTime();
    case "all_time": return 0;
  }
}

/**
 * Compact cumulative-units sparkline. Reads recent picks (most-recent-first
 * input), filters to the selected window's date range, reverses to oldest-
 * first, and accumulates profit_units to draw the trajectory.
 *
 * Note: respects whatever depth of history was fetched into `history`. If
 * the profile page only fetched 25 picks but the user selected the season
 * window with 80 picks, the sparkline shows whatever subset of those 25
 * fall inside the date range. A bigger fetch on longer windows would be
 * a follow-up; for now the trajectory is visually consistent with the
 * window's intent (line stops at the boundary) without forcing a separate
 * round-trip.
 */
export function RecentTrajectory({
  history,
  window,
  width = 320,
  height = 76,
}: Props) {
  const cutoff = window ? cutoffFor(window) : 0;
  const graded = history
    .filter((p) => p.profit_units != null)
    .filter((p) => {
      if (!window || cutoff === 0) return true;
      if (!p.posted_at) return true;
      const ts = new Date(p.posted_at).getTime();
      return Number.isFinite(ts) && ts >= cutoff;
    })
    .reverse();

  if (graded.length < 2) return null;

  let running = 0;
  const series: number[] = [0];
  for (const p of graded) {
    running += p.profit_units ?? 0;
    series.push(running);
  }

  const last = series[series.length - 1];
  const min = Math.min(0, ...series);
  const max = Math.max(0, ...series);
  const range = max - min || 1;

  const padX = 2;
  const padY = 6;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const stepX = innerW / (series.length - 1);
  const yFor = (v: number) => padY + innerH - ((v - min) / range) * innerH;
  const zeroY = yFor(0);

  const linePoints = series.map((v, i) => `${padX + i * stepX},${yFor(v)}`).join(" ");
  const areaPath =
    `M ${padX},${zeroY} ` +
    series.map((v, i) => `L ${padX + i * stepX},${yFor(v)}`).join(" ") +
    ` L ${padX + (series.length - 1) * stepX},${zeroY} Z`;

  const positive = last >= 0;
  const stroke = positive ? "var(--color-pos)" : "var(--color-neg)";
  const fillId = positive ? "trajectory-fill-pos" : "trajectory-fill-neg";
  const fillStop = positive ? "rgba(25,245,124," : "rgba(239,68,68,";
  const lastX = padX + (series.length - 1) * stepX;
  const lastY = yFor(last);

  const label = window
    ? `${WINDOW_LABEL[window]} · ${graded.length} picks`
    : `Last ${graded.length} picks`;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-baseline gap-2">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] font-bold">
          {label}
        </div>
        <div className={`text-[13px] font-extrabold tabular-nums leading-none tracking-[-0.01em]
                        ${positive ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"}`}>
          {formatUnitsSmart(last)}u
        </div>
      </div>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
        className="block"
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`${fillStop}0.18)`} />
            <stop offset="100%" stopColor={`${fillStop}0)`} />
          </linearGradient>
        </defs>
        <line
          x1={padX}
          y1={zeroY}
          x2={width - padX}
          y2={zeroY}
          stroke="rgba(255,255,255,0.08)"
          strokeDasharray="3 3"
        />
        <path d={areaPath} fill={`url(#${fillId})`} />
        <polyline
          points={linePoints}
          fill="none"
          stroke={stroke}
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={lastX} cy={lastY} r={3} fill={stroke} />
        <circle cx={lastX} cy={lastY} r={6} fill={stroke} opacity={0.18} />
      </svg>
    </div>
  );
}
