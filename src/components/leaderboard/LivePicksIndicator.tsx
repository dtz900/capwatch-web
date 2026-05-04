interface Props {
  count: number;
}

// Inline live signal: pulsing dot + count + "live picks". Soft teal so it
// reads as a separate channel from the dominant green/red P&L palette and
// doesn't add to the visual noise on the row.
const LIVE_TEAL = "#5eead4";

export function LivePicksIndicator({ count }: Props) {
  if (!count || count <= 0) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-bold tabular-nums whitespace-nowrap"
      style={{ color: LIVE_TEAL }}
      title={`${count} pending ${count === 1 ? "bet" : "bets"} on tonight's slate`}
    >
      <span
        aria-hidden="true"
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: LIVE_TEAL, animation: "pulse 1.6s ease-out infinite" }}
      />
      {count} live
    </span>
  );
}
