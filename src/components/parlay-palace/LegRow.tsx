import type { PalaceLeg } from "@/lib/types";

export function LegRow({ leg, position }: { leg: PalaceLeg; position: number }) {
  const odds =
    leg.odds_taken == null
      ? null
      : `${leg.odds_taken > 0 ? "+" : ""}${leg.odds_taken}`;
  const img = leg.team_logo_url ?? leg.headshot_url;
  const label = leg.player_name ?? leg.selection ?? "Leg";
  const sub =
    leg.player_name && leg.line != null
      ? `${leg.selection ?? ""} ${leg.line}`.trim()
      : null;
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-[var(--color-border)] last:border-b-0">
      <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] overflow-hidden shrink-0 flex items-center justify-center">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={leg.team_abbr ?? leg.player_name ?? "leg"}
               width={40} height={40}
               className={leg.team_logo_url ? "w-7 h-7 object-contain" : "w-10 h-10 object-cover"} />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-[var(--color-text)] truncate">
          {label}
          {sub && (
            <span className="text-[var(--color-text-muted)] font-medium">
              {" "}{sub}
            </span>
          )}
        </div>
        <div className="text-[11px] mt-0.5 flex items-center gap-1.5">
          <span className="text-[var(--color-text-muted)]">Leg {position}</span>
          {leg.is_clincher && (
            <span className="text-[var(--color-pos)] font-bold uppercase tracking-wide text-[10px]">
              · clincher
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        {leg.score_text && (
          <div className="text-[12px] font-bold text-[var(--color-text-soft)] flex items-center gap-1 justify-end">
            <span>{leg.score_text}</span>
            {leg.won && <span className="text-[var(--color-pos)]">✓</span>}
          </div>
        )}
        {!leg.score_text && leg.result_text && (
          <div className="text-[12px] font-bold text-[var(--color-pos)]">
            <span>{leg.result_text}</span>{" "}✓
          </div>
        )}
        {odds && (
          <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
            {odds}
          </div>
        )}
      </div>
    </div>
  );
}
