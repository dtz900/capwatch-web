interface Props {
  breakdown: Record<string, number>;
}

export function SpecialtyPills({ breakdown }: Props) {
  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  return (
    <div className="flex gap-1 flex-wrap">
      {entries.map(([market, share]) => (
        <span key={market}
              className="text-[11px] font-semibold px-2 py-[3px] rounded-md
                         bg-[rgba(255,255,255,0.04)] text-[var(--color-text-soft)]">
          <span data-testid="spec-label">{market}</span>
          <span className="text-[var(--color-text-muted)] ml-1">{Math.round(share * 100)}%</span>
        </span>
      ))}
    </div>
  );
}
