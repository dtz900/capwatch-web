import { useId } from "react";

interface Props {
  values: number[];
  width?: number;
  height?: number;
  /** Optional override; default colors from final value sign. */
  color?: string;
}

/**
 * Cumulative units profit sparkline. CMC-style: a single thin line, color
 * derived from whether the capper finishes the window in the green or red.
 * Includes a faint zero baseline if the trajectory crosses zero so the
 * polarity is readable at a glance, plus a gradient area fill anchored on
 * the zero baseline so the red/green tone reads at a glance against the
 * dark card.
 */
export function Sparkline({ values, width = 84, height = 24, color }: Props) {
  // Hook calls must precede any early return (rules-of-hooks).
  const uid = useId();
  if (!values || values.length < 2) {
    return (
      <div
        aria-hidden="true"
        className="text-[var(--color-text-muted)]"
        style={{ width, height, opacity: 0.25 }}
      />
    );
  }

  // A sparkline can't show more than ~1 point per 2px, and trajectories run
  // to 500 points; every point is markup (twice per row, desktop + mobile)
  // in both the HTML and the RSC payload. Evenly spaced samples that always
  // keep the first and last point, so the line still ends on the real value.
  values = downsample(values, Math.max(2, Math.floor(width / 2)));

  const final = values[values.length - 1];
  const positive = final >= 0;
  const lineColor = color ?? (positive ? "var(--color-pos)" : "var(--color-neg)");

  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;

  const stepX = width / (values.length - 1);
  const xy = values.map((v, i) => ({
    x: i * stepX,
    y: height - ((v - min) / span) * height,
  }));
  const points = xy.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

  // Zero baseline — Math.min(...values, 0) clamps min<=0 and
  // Math.max(..., 0) clamps max>=0, so zeroY is always in-bounds. We can
  // anchor the area fill to it unconditionally.
  const zeroY = height - ((0 - min) / span) * height;
  const firstX = xy[0].x;
  const lastX = xy[xy.length - 1].x;
  const areaPath =
    `M ${firstX.toFixed(2)},${zeroY.toFixed(2)} ` +
    xy.map((p) => `L ${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ") +
    ` L ${lastX.toFixed(2)},${zeroY.toFixed(2)} Z`;

  // Unique gradient id per Sparkline instance. The leaderboard renders 25+
  // sparklines on one page; without useId, all SVGs with the same fill id
  // would clash and the browser picks the first one in DOM order.
  const fillId = `${uid}-${positive ? "pos" : "neg"}`;
  const fillStop = positive ? "rgba(25,245,124," : "rgba(239,68,68,";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`${fillStop}0.36)`} />
          <stop offset="100%" stopColor={`${fillStop}0.06)`} />
        </linearGradient>
      </defs>
      <line
        x1={0}
        x2={width}
        y1={zeroY}
        y2={zeroY}
        stroke="rgba(255,255,255,0.10)"
        strokeWidth={1}
        strokeDasharray="2 2"
      />
      <path d={areaPath} fill={`url(#${fillId})`} />
      <polyline
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

/** Evenly spaced subset of `values` with at most `max` points, always
 *  including the first and last. Returns the input when already small. */
export function downsample(values: number[], max: number): number[] {
  if (values.length <= max) return values;
  const out: number[] = [];
  const step = (values.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) out.push(values[Math.round(i * step)]);
  return out;
}
