import type { PalaceLeg } from "@/lib/types";
import { teamColor } from "./teamColors";

export function LegRow({ leg, position }: { leg: PalaceLeg; position: number }) {
  const odds =
    leg.odds_taken == null
      ? null
      : `${leg.odds_taken > 0 ? "+" : ""}${leg.odds_taken}`;
  const isTeamLogo = !!leg.team_logo_url;
  const img = leg.team_logo_url ?? leg.headshot_url;
  const label = leg.player_name ?? leg.selection ?? "Leg";
  const sub =
    leg.player_name && leg.line != null
      ? `${leg.selection ?? ""} ${leg.line}`.trim()
      : null;
  const chipBg = isTeamLogo
    ? teamColor(leg.team_abbr)
    : "#171a20";

  return (
    <div
      className="flex items-center gap-3.5 py-3.5 border-b border-[rgba(255,255,255,0.055)] last:border-b-0"
    >
      <div
        className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center overflow-hidden ring-1 ring-[rgba(255,255,255,0.10)]"
        style={{ background: chipBg }}
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={leg.team_abbr ?? leg.player_name ?? leg.selection ?? "leg"}
            width={44}
            height={44}
            className={
              isTeamLogo
                ? "w-7 h-7 object-contain brightness-0 invert"
                : "w-11 h-11 object-cover"
            }
          />
        ) : (
          <span className="text-[11px] font-black text-[rgba(255,255,255,0.6)]">
            {leg.team_abbr ?? "TOT"}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold text-white truncate leading-tight">
          {label}
          {sub && (
            <span className="text-[rgba(255,255,255,0.42)] font-medium">
              {" "}
              {sub}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] font-bold">
          <span className="text-[rgba(255,255,255,0.38)]">Leg {position}</span>
          {leg.is_clincher && (
            <span className="text-[#e3c787]">· Clincher</span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        {leg.score_text ? (
          <div className="inline-flex items-center gap-1.5 rounded-md bg-[rgba(255,255,255,0.045)] ring-1 ring-[rgba(255,255,255,0.07)] px-2 py-1">
            <span className="text-[12px] font-bold text-[rgba(255,255,255,0.86)] tabular-nums">
              {leg.score_text}
            </span>
            {leg.won && (
              <span className="text-[#5fd39b]" aria-hidden="true">
                ✓
              </span>
            )}
          </div>
        ) : leg.result_text ? (
          <div className="inline-flex items-center gap-1.5 rounded-md bg-[rgba(255,255,255,0.045)] ring-1 ring-[rgba(255,255,255,0.07)] px-2 py-1">
            <span className="text-[12px] font-bold text-[rgba(255,255,255,0.86)] tabular-nums">
              {leg.result_text}
            </span>
            <span className="text-[#5fd39b]" aria-hidden="true">
              ✓
            </span>
          </div>
        ) : null}
        {odds && (
          <div className="mt-1 text-[10px] font-bold tracking-wide text-[rgba(255,255,255,0.34)] tabular-nums">
            {odds}
          </div>
        )}
      </div>
    </div>
  );
}
