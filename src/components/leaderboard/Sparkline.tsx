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
 * polarity is readable at a glance.
 */
export function Sparkline({ values, width = 84, height = 24, color }: Props) {
  if (!values || values.length < 2) {
    return (
      <div
        aria-hidden="true"
        className="text-[var(--color-text-muted)]"
        style={{ width, height, opacity: 0.25 }}
      />
    );
  }

  const final = values[values.length - 1];
  const lineColor = color ?? (final >= 0 ? "var(--color-pos)" : "var(--color-neg)");

  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;

  const stepX = width / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / span) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  // Zero baseline (only render if zero is inside the y-range).
  const zeroY = min < 0 && max > 0
    ? height - ((0 - min) / span) * height
    : null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="overflow-visible"
    >
      {zeroY !== null && (
        <line
          x1={0}
          x2={width}
          y1={zeroY}
          y2={zeroY}
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      )}
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
