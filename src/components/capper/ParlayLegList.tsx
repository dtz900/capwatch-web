import type { HistoryPickLeg } from "@/lib/types";

function formatOdds(odds: number | null): string {
  if (odds == null) return "";
  return odds > 0 ? `+${odds}` : String(odds);
}

function GlyphFor({ outcome }: { outcome: HistoryPickLeg["outcome"] }) {
  const cls =
    outcome === "W"
      ? "text-[var(--color-pos)]"
      : outcome === "L"
        ? "text-[var(--color-neg)]"
        : outcome === "P"
          ? "text-[var(--color-text-muted)] font-bold"
          : "text-[var(--color-text-muted)] opacity-40";
  const glyph =
    outcome === "W" ? "✓"
      : outcome === "L" ? "✗"
      : outcome === "P" ? "–"
      : "·";
  return <span className={`inline-block w-3 text-[11px] ${cls}`}>{glyph}</span>;
}

export function ParlayLegList({ legs }: { legs: HistoryPickLeg[] }) {
  if (!legs || legs.length === 0) return null;
  return (
    <div className="pl-[76px] pr-5 pb-3 pt-1 text-[12px] border-b border-[rgba(255,255,255,0.035)] bg-[rgba(255,255,255,0.012)]">
      {legs.map((leg) => (
        <div
          key={leg.leg_index}
          className="grid grid-cols-[18px_minmax(0,1fr)_auto_90px] gap-3 items-center py-1 text-[var(--color-text-soft)]"
        >
          <GlyphFor outcome={leg.outcome} />
          <span className="truncate">{leg.selection ?? ""}</span>
          <span className="tabular-nums text-[var(--color-text-muted)] text-[11px]">
            {formatOdds(leg.odds_taken)}
          </span>
          <span className="text-right text-[10px] text-[var(--color-text-muted)]">
            {leg.game_label ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}
