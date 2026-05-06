import type { Window } from "@/lib/types";
import { formatUnitsSmart } from "@/lib/formatters";

interface Props {
  /** Cumulative profit_units series, oldest-first. Comes from the
   * profile endpoint's per-window precomputed trajectory so the
   * sparkline reflects the FULL window's depth (not just the page's
   * paginated history). When the series has < 2 points, nothing is
   * rendered. */
  series: number[];
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

export function RecentTrajectory({
  series,
  window,
  width = 320,
  height = 76,
}: Props) {
  if (series.length < 2) return null;

  // The backend sends running totals only (no leading 0). Prepend 0 so the
  // first segment renders from baseline -- mirrors the original component's
  // shape and keeps the area path anchored on the zero line.
  const points = [0, ...series];

  const last = points[points.length - 1];
  const min = Math.min(0, ...points);
  const max = Math.max(0, ...points);
  const range = max - min || 1;

  const padX = 2;
  const padY = 6;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const stepX = innerW / (points.length - 1);
  const yFor = (v: number) => padY + innerH - ((v - min) / range) * innerH;
  const zeroY = yFor(0);

  const linePoints = points.map((v, i) => `${padX + i * stepX},${yFor(v)}`).join(" ");
  const areaPath =
    `M ${padX},${zeroY} ` +
    points.map((v, i) => `L ${padX + i * stepX},${yFor(v)}`).join(" ") +
    ` L ${padX + (points.length - 1) * stepX},${zeroY} Z`;

  const positive = last >= 0;
  const stroke = positive ? "var(--color-pos)" : "var(--color-neg)";
  const fillId = positive ? "trajectory-fill-pos" : "trajectory-fill-neg";
  const fillStop = positive ? "rgba(25,245,124," : "rgba(239,68,68,";
  const lastX = padX + (points.length - 1) * stepX;
  const lastY = yFor(last);

  // series.length is the actual graded pick count (excludes the prepended 0).
  const label = window
    ? `${WINDOW_LABEL[window]} · ${series.length} picks`
    : `${series.length} picks`;

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
