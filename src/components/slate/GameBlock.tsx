import { SlatePickRow } from "./SlatePickRow";
import type { SlateGame } from "@/lib/types";

function formatGameTime(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  } catch {
    return null;
  }
}

export function GameBlock({ game }: { game: SlateGame }) {
  const matchup =
    game.away_team && game.home_team ? `${game.away_team} @ ${game.home_team}` : "Game";
  const time = formatGameTime(game.game_time);

  return (
    <section
      className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)]
                 px-5 pt-5 pb-3"
    >
      <header className="flex items-end justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold mb-1">
            MLB
          </div>
          <h2 className="text-[20px] font-extrabold tracking-[-0.01em] leading-none">{matchup}</h2>
        </div>
        <div className="text-right">
          {time && (
            <div className="text-[12px] font-semibold text-[var(--color-text-soft)] tabular-nums">
              {time}
            </div>
          )}
          <div className="text-[10px] uppercase tracking-[0.10em] text-[var(--color-text-muted)] font-bold">
            {game.picks.length} pick{game.picks.length === 1 ? "" : "s"}
          </div>
        </div>
      </header>
      {game.picks.length === 0 ? (
        <div className="text-[12px] italic text-[var(--color-text-muted)] py-3">
          No picks tweeted on this game yet.
        </div>
      ) : (
        <div className="flex flex-col">
          {game.picks.map((pick, i) => (
            <SlatePickRow key={`${pick.capper_id}-${i}`} pick={pick} />
          ))}
        </div>
      )}
    </section>
  );
}
