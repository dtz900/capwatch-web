interface Props {
  count: number;
}

// Inline live signal: pulsing dot + count + "live tonight". No background or
// border, so it reads as live status text rather than a label/pill like
// PaidProgramPill or DeletedPicksPill.
export function LivePicksIndicator({ count }: Props) {
  if (!count || count <= 0) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--color-pos)] tabular-nums whitespace-nowrap"
      title={`${count} pending ${count === 1 ? "bet" : "bets"} on tonight's slate`}
    >
      <span
        aria-hidden="true"
        className="w-1.5 h-1.5 rounded-full bg-[var(--color-pos)]"
        style={{ animation: "pulse 1.6s ease-out infinite" }}
      />
      {count} live tonight
    </span>
  );
}
