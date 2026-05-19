import type { PalaceLeg } from "@/lib/types";

// Clean light logo tile so the real full-color MLB marks stay crisp (no
// silhouette/wash). Total legs show both teams in the matchup.
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center overflow-hidden bg-[#f3f4f6] ring-1 ring-[rgba(0,0,0,0.08)] shadow-[inset_0_-1px_2px_rgba(0,0,0,0.06)]">
      {children}
    </div>
  );
}

export function LegRow({ leg, position }: { leg: PalaceLeg; position: number }) {
  const odds =
    leg.odds_taken == null
      ? null
      : `${leg.odds_taken > 0 ? "+" : ""}${leg.odds_taken}`;
  const label = leg.player_name ?? leg.selection ?? "Leg";
  const sub =
    leg.player_name && leg.line != null
      ? `${leg.selection ?? ""} ${leg.line}`.trim()
      : null;

  const single = leg.team_logo_url ?? leg.headshot_url;
  const isHeadshot = !leg.team_logo_url && !!leg.headshot_url;
  const pair =
    !leg.team_logo_url && leg.away_logo_url && leg.home_logo_url
      ? [
          { src: leg.away_logo_url, a: leg.away_abbr ?? "away" },
          { src: leg.home_logo_url, a: leg.home_abbr ?? "home" },
        ]
      : null;

  return (
    <div className="flex items-center gap-3.5 py-3.5 border-b border-[rgba(255,255,255,0.055)] last:border-b-0">
      {pair ? (
        <Chip>
          <div className="flex items-center -space-x-1.5">
            {pair.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={p.src}
                alt={p.a}
                width={22}
                height={22}
                className="w-[22px] h-[22px] object-contain drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]"
              />
            ))}
          </div>
        </Chip>
      ) : single ? (
        <Chip>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={single}
            alt={leg.team_abbr ?? leg.player_name ?? leg.selection ?? "leg"}
            width={44}
            height={44}
            className={
              isHeadshot
                ? "w-11 h-11 object-cover"
                : "w-[30px] h-[30px] object-contain"
            }
          />
        </Chip>
      ) : (
        <Chip>
          <span className="text-[11px] font-black text-[#5b606b]">
            {leg.team_abbr ?? "TOT"}
          </span>
        </Chip>
      )}

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
        {leg.score_text || leg.result_text ? (
          <div className="inline-flex items-center gap-1.5 rounded-md bg-[rgba(255,255,255,0.045)] ring-1 ring-[rgba(255,255,255,0.07)] px-2 py-1">
            <span className="text-[12px] font-bold text-[rgba(255,255,255,0.86)] tabular-nums">
              {leg.score_text ?? leg.result_text}
            </span>
            {(leg.won || (!leg.score_text && leg.result_text)) && (
              <span className="text-[#5fd39b]" aria-hidden="true">
                ✓
              </span>
            )}
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
