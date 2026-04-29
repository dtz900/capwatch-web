import { normalizeBreakdown } from "@/lib/markets";

const PALETTE = [
  "bg-[var(--color-pos)]",
  "bg-[var(--color-gold)]",
  "bg-[#60a5fa]",
  "bg-[#f472b6]",
  "bg-[#a78bfa]",
  "bg-[#fb7185]",
  "bg-[#94a3b8]",
];

export function MarketMixBar({
  breakdown,
}: {
  breakdown: Record<string, number> | null | undefined;
}) {
  if (!breakdown) return null;
  const normalized = normalizeBreakdown(breakdown);
  const entries = Object.entries(normalized).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-5 py-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold mb-3">
        Market mix
      </div>
      <div className="flex h-2 w-full rounded-full overflow-hidden bg-[rgba(255,255,255,0.04)] mb-3">
        {entries.map(([market, share], i) => (
          <span
            key={market}
            className={PALETTE[i % PALETTE.length]}
            style={{ width: `${share * 100}%` }}
            title={`${market}: ${Math.round(share * 100)}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {entries.map(([market, share], i) => (
          <div key={market} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`inline-block w-2 h-2 rounded-full ${PALETTE[i % PALETTE.length]}`}
            />
            <span className="text-[11px] font-semibold text-[var(--color-text-soft)]">
              {market}
            </span>
            <span className="text-[11px] tabular-nums text-[var(--color-text-muted)]">
              {Math.round(share * 100)}%
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
