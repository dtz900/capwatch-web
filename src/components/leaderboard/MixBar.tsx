interface Props {
  parlayShare: number;
}

export function MixBar({ parlayShare }: Props) {
  const parlayPct = Math.round(parlayShare * 100);
  const straightPct = 100 - parlayPct;

  return (
    <div className="flex items-center gap-2.5 text-[11px] font-semibold">
      <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.04)]">
        <div className="bg-[rgba(245,197,74,0.65)]" style={{ width: `${parlayPct}%` }} />
        <div className="bg-[rgba(255,255,255,0.20)]" style={{ width: `${straightPct}%` }} />
      </div>
      <span className="text-[var(--color-text-soft)] whitespace-nowrap tabular-nums">
        <span className="text-[var(--color-gold)]">{parlayPct}%</span>
        <span className="text-[var(--color-text-muted)] mx-1">parlays</span>
        <span className="opacity-40">·</span>
        <span className="ml-1">{straightPct}%</span>
        <span className="text-[var(--color-text-muted)] ml-1">straight</span>
      </span>
    </div>
  );
}
