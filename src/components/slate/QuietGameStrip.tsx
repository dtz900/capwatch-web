import { TeamLogo } from "./TeamLogo";
import type { SlateGame } from "@/lib/types";

function formatGameTime(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const t = new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    });
    return `${t} ET`;
  } catch {
    return null;
  }
}

function shortPitcher(name: string | null): string | null {
  if (!name) return null;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

export function QuietGameStrip({ game }: { game: SlateGame }) {
  const time = formatGameTime(game.game_time);
  const pitchers =
    game.away_starter && game.home_starter
      ? `${shortPitcher(game.away_starter)} vs ${shortPitcher(game.home_starter)}`
      : null;

  return (
    <div
      id={`game-${game.game_id}`}
      className="flex items-center justify-between gap-3 py-2 text-[12px]"
    >
      <div className="flex items-center gap-2 min-w-0 text-[var(--color-text-muted)]">
        <TeamLogo abbr={game.away_team} size={16} />
        <span className="font-bold text-[13px] text-[var(--color-text-soft)]">{game.away_team}</span>
        <span className="opacity-50 mx-0.5">@</span>
        <TeamLogo abbr={game.home_team} size={16} />
        <span className="font-bold text-[13px] text-[var(--color-text-soft)]">{game.home_team}</span>
        {pitchers && <span className="ml-2 truncate font-medium">{pitchers}</span>}
      </div>
      <div className="shrink-0 text-[var(--color-text-muted)] tabular-nums font-medium">
        {time}
      </div>
    </div>
  );
}
