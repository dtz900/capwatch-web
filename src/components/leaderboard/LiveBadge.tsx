export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[var(--color-pos)]">
      <span
        className="w-1.5 h-1.5 rounded-full bg-[var(--color-pos)]"
        style={{ animation: "pulse 1.6s ease-out infinite" }}
      />
      LIVE
    </span>
  );
}
