interface Props {
  breakdown: Record<string, number>;
  maxPills?: number;
  minShare?: number;
}

export function SpecialtyPills({ breakdown, maxPills = 4, minShare = 0.05 }: Props) {
  const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  const visible = sorted.filter(([, share]) => share >= minShare).slice(0, maxPills);
  const hiddenCount = sorted.length - visible.length;
  if (visible.length === 0) return null;
  return (
    <div className="flex gap-1 flex-wrap">
      {visible.map(([market, share]) => (
        <span key={market}
              className="text-[11px] font-semibold px-2 py-[3px] rounded-md
                         bg-[rgba(255,255,255,0.04)] text-[var(--color-text-soft)]">
          <span data-testid="spec-label">{market}</span>
          <span className="text-[var(--color-text-muted)] ml-1">{Math.round(share * 100)}%</span>
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="text-[11px] font-semibold px-2 py-[3px] rounded-md
                         bg-[rgba(255,255,255,0.02)] text-[var(--color-text-muted)]">
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
}
