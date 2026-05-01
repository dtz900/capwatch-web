import type { HistoryPick } from "@/lib/types";
import { formatUnitsSmart } from "@/lib/formatters";

interface Props {
  history: HistoryPick[];
  width?: number;
  height?: number;
  maxPoints?: number;
}

/**
 * Compact cumulative-units sparkline. Reads recent picks (most-recent-first
 * input), reverses to oldest-first, and accumulates profit_units to draw the
 * trajectory. Intended for the capper hero header to fill horizontal space
 * with a contextual visualization.
 */
export function RecentTrajectory({
  history,
  width = 320,
  height = 76,
  maxPoints = 25,
}: Props) {
  const graded = history
    .filter((p) => p.profit_units != null)
    .slice(0, maxPoints)
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

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-baseline gap-2">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] font-bold">
          Last {graded.length} picks
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
