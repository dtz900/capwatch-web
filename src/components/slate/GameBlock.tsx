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

function shortPitcher(name: string | null): string | null {
  if (!name) return null;
  // "Gerrit Cole" -> "G. Cole"; single-word names pass through.
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  const first = parts[0];
  const last = parts.slice(1).join(" ");
  return `${first[0]}. ${last}`;
}

export function GameBlock({ game }: { game: SlateGame }) {
  const matchup =
    game.away_team && game.home_team ? `${game.away_team} @ ${game.home_team}` : "Game";
  const time = formatGameTime(game.game_time);
  const pitchers =
    game.away_starter && game.home_starter
      ? `${shortPitcher(game.away_starter)} vs ${shortPitcher(game.home_starter)}`
      : null;
  const n = game.picks.length;

  return (
    <section
      className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)]
                 px-5 pt-5 pb-3 hover:border-[rgba(255,255,255,0.10)] transition-colors"
    >
      <header className="flex items-end justify-between mb-3 gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold mb-1">
            MLB
          </div>
          <h2 className="text-[20px] font-extrabold tracking-[-0.01em] leading-none">{matchup}</h2>
          {pitchers && (
            <div className="text-[11px] text-[var(--color-text-muted)] font-medium mt-1.5 truncate">
              {pitchers}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          {time && (
            <div className="text-[12px] font-semibold text-[var(--color-text-soft)] tabular-nums">
              {time}
            </div>
          )}
          <div className="text-[10px] uppercase tracking-[0.10em] text-[var(--color-text-muted)] font-bold">
            {n === 0 ? "Quiet" : n === 1 ? "1 sharp on it" : `${n} sharps on it`}
          </div>
        </div>
      </header>
      {n === 0 ? (
        <div className="text-[12px] italic text-[var(--color-text-muted)] py-3">
          Quiet. No one has tweeted on this one yet.
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
