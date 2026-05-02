import { SlatePickRow } from "./SlatePickRow";
import { TeamLogo } from "./TeamLogo";
import { SharpSideSplit } from "./SharpSideSplit";
import { LiveCountdown } from "./LiveCountdown";
import { teamColor } from "@/lib/mlb-teams";
import type { SlateGame } from "@/lib/types";

function shortPitcher(name: string | null): string | null {
  if (!name) return null;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

export function GameBlock({ game }: { game: SlateGame }) {
  const pitchers =
    game.away_starter && game.home_starter
      ? `${shortPitcher(game.away_starter)} vs ${shortPitcher(game.home_starter)}`
      : null;
  const n = game.picks.length;
  const awayColor = teamColor(game.away_team);
  const homeColor = teamColor(game.home_team);

  return (
    <section
      className="relative rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)]
                 px-5 pt-5 pb-3 hover:border-[rgba(255,255,255,0.10)] transition-colors overflow-hidden"
      style={{
        backgroundImage:
          `linear-gradient(90deg, ${awayColor}14 0%, transparent 12%, transparent 88%, ${homeColor}14 100%)`,
      }}
    >
      <span
        aria-hidden="true"
        className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r"
        style={{
          background: `linear-gradient(180deg, ${awayColor} 0%, ${homeColor} 100%)`,
        }}
      />
      <header className="flex items-end justify-between mb-3 gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold mb-1.5">
            MLB
          </div>
          <div className="flex items-center gap-2.5">
            <TeamLogo abbr={game.away_team} size={28} />
            <span className="text-[20px] font-extrabold tracking-[-0.01em] leading-none">{game.away_team}</span>
            <span className="text-[14px] font-bold text-[var(--color-text-muted)] mx-0.5">@</span>
            <TeamLogo abbr={game.home_team} size={28} />
            <span className="text-[20px] font-extrabold tracking-[-0.01em] leading-none">{game.home_team}</span>
          </div>
          {pitchers && (
            <div className="text-[11px] text-[var(--color-text-muted)] font-medium mt-2 truncate">
              {pitchers}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <LiveCountdown iso={game.game_time} className="text-[12px]" />
          <div className="text-[10px] uppercase tracking-[0.10em] text-[var(--color-text-muted)] font-bold mt-1">
            {n === 0 ? "Quiet" : n === 1 ? "1 sharp on it" : `${n} sharps on it`}
          </div>
        </div>
      </header>
      {n >= 3 && (
        <SharpSideSplit picks={game.picks} awayTeam={game.away_team} homeTeam={game.home_team} />
      )}
      {n === 0 ? (
        <div className="text-[12px] italic text-[var(--color-text-muted)] py-3">
          Quiet. No one has tweeted on this one yet.
        </div>
      ) : (
        <div className="flex flex-col">
          {game.picks.map((pick, i) => (
            <SlatePickRow
              key={`${pick.capper_id}-${i}`}
              pick={pick}
              awayTeam={game.away_team}
              homeTeam={game.home_team}
            />
          ))}
        </div>
      )}
    </section>
  );
}
