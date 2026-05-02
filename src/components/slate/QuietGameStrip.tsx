import { TeamLogo } from "./TeamLogo";
import { LiveCountdown } from "./LiveCountdown";
import type { SlateGame } from "@/lib/types";

function shortPitcher(name: string | null): string | null {
  if (!name) return null;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

export function QuietGameStrip({ game }: { game: SlateGame }) {
  const pitchers =
    game.away_starter && game.home_starter
      ? `${shortPitcher(game.away_starter)} vs ${shortPitcher(game.home_starter)}`
      : null;

  return (
    <div
      id={`game-${game.game_id}`}
      className="flex items-center justify-between gap-3 rounded-xl px-4 py-2.5
                 border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.008)]
                 hover:border-[rgba(255,255,255,0.08)] transition-colors"
    >
      <div className="min-w-0 flex items-center gap-2 flex-wrap">
        <TeamLogo abbr={game.away_team} size={20} />
        <span className="text-[13px] font-bold tracking-tight text-[var(--color-text)]">
          {game.away_team}
        </span>
        <span className="text-[11px] font-bold text-[var(--color-text-muted)] mx-0.5">@</span>
        <TeamLogo abbr={game.home_team} size={20} />
        <span className="text-[13px] font-bold tracking-tight text-[var(--color-text)]">
          {game.home_team}
        </span>
        {pitchers && (
          <span className="text-[11px] text-[var(--color-text-muted)] font-medium truncate ml-1.5">
            {pitchers}
          </span>
        )}
        <LiveCountdown iso={game.game_time} className="text-[11px] ml-1" />
      </div>
      <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] font-bold text-[var(--color-text-muted)] opacity-70">
        Quiet
      </span>
    </div>
  );
}
