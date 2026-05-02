import type { SlateGame } from "@/lib/types";

function formatGameTime(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
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
  const matchup =
    game.away_team && game.home_team ? `${game.away_team} @ ${game.home_team}` : "Game";
  const time = formatGameTime(game.game_time);
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
      <div className="min-w-0 flex items-baseline gap-2.5 flex-wrap">
        <span className="text-[13px] font-bold tracking-tight text-[var(--color-text)]">{matchup}</span>
        {pitchers && (
          <span className="text-[11px] text-[var(--color-text-muted)] font-medium truncate">{pitchers}</span>
        )}
        {time && (
          <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums">· {time}</span>
        )}
      </div>
      <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] font-bold text-[var(--color-text-muted)] opacity-70">
        Quiet
      </span>
    </div>
  );
}
