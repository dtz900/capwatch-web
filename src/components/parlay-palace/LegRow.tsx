import type { PalaceLeg } from "@/lib/types";

export function LegRow({ leg }: { leg: PalaceLeg }) {
  const odds =
    leg.odds_taken == null
      ? null
      : `${leg.odds_taken > 0 ? "+" : ""}${leg.odds_taken}`;
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-[var(--color-border)] last:border-b-0">
      <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] overflow-hidden shrink-0">
        {leg.headshot_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={leg.headshot_url} alt={leg.player_name ?? ""}
               width={40} height={40} className="w-10 h-10 object-cover" />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-[var(--color-text)] truncate">
          {leg.player_name ?? leg.selection}
          {leg.line != null && (
            <span className="text-[var(--color-text-muted)] font-medium">
              {" "}{leg.selection} {leg.line}
            </span>
          )}
        </div>
        <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
          {leg.is_clincher ? "clincher" : `Leg ${leg.leg_index + 1}`}
        </div>
      </div>
      {leg.result_text && (
        <div className="text-[12px] font-bold text-[var(--color-pos)] shrink-0">
          {leg.result_text}&nbsp;✓
        </div>
      )}
      {odds && (
        <div className="text-[12px] font-bold text-[var(--color-text-soft)] shrink-0 w-12 text-right">
          {odds}
        </div>
      )}
    </div>
  );
}
