import { SlatePickRow } from "./SlatePickRow";
import { VersusPickRow } from "./VersusPickRow";
import { TeamLogo } from "./TeamLogo";
import { pickMlSide } from "@/lib/bet-format";
import { teamColor } from "@/lib/mlb-teams";
import type { SlateGame, SlatePick } from "@/lib/types";

function shortPitcher(name: string | null): string | null {
  if (!name) return null;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

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

interface BucketedPicks {
  awayMl: SlatePick[];
  homeMl: SlatePick[];
  other: SlatePick[];
}

function bucketPicks(picks: SlatePick[], awayTeam: string | null, homeTeam: string | null): BucketedPicks {
  const awayMl: SlatePick[] = [];
  const homeMl: SlatePick[] = [];
  const other: SlatePick[] = [];
  for (const p of picks) {
    const side = pickMlSide(p, awayTeam, homeTeam);
    if (side === "away") awayMl.push(p);
    else if (side === "home") homeMl.push(p);
    else other.push(p);
  }
  return { awayMl, homeMl, other };
}

function Side({
  team,
  picks,
}: {
  team: string | null;
  picks: SlatePick[];
}) {
  const color = teamColor(team);
  return (
    <div>
      <div
        className="flex items-baseline justify-between pb-2 mb-1 border-b-2"
        style={{ borderColor: color }}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-[var(--color-text-muted)]">
            On
          </span>
          <span className="text-[14px] font-extrabold tracking-tight" style={{ color }}>
            {team ?? "—"}
          </span>
        </div>
        <span className="text-[11px] tabular-nums font-bold text-[var(--color-text-muted)]">
          {picks.length}
        </span>
      </div>
      {picks.length === 0 ? (
        <div className="text-[11px] italic text-[var(--color-text-muted)] py-2">
          No sharps on {team ?? "this side"}
        </div>
      ) : (
        <div className="flex flex-col">
          {picks.map((pick, i) => (
            <VersusPickRow key={`${pick.capper_id}-${i}`} pick={pick} />
          ))}
        </div>
      )}
    </div>
  );
}

export function GameBlock({ game }: { game: SlateGame }) {
  const time = formatGameTime(game.game_time);
  const pitchers =
    game.away_starter && game.home_starter
      ? `${shortPitcher(game.away_starter)} vs ${shortPitcher(game.home_starter)}`
      : null;
  const buckets = bucketPicks(game.picks, game.away_team, game.home_team);
  const hasMlAction = buckets.awayMl.length + buckets.homeMl.length > 0;
  const hasOther = buckets.other.length > 0;
  const isSilent = game.picks.length === 0;

  return (
    <section id={`game-${game.game_id}`} className="py-10 border-t border-[rgba(255,255,255,0.07)]">
      {/* Hero matchup */}
      <div className="text-center">
        <div className="text-[11px] tabular-nums font-semibold text-[var(--color-text-muted)] mb-4">
          {time}
        </div>
        <div className="flex items-center justify-center gap-6 sm:gap-10">
          <div className="flex flex-col items-center gap-3">
            <TeamLogo abbr={game.away_team} size={88} />
            <span className="text-[30px] font-extrabold tracking-[-0.03em] leading-none">
              {game.away_team}
            </span>
          </div>
          <span className="text-[12px] uppercase tracking-[0.22em] font-bold text-[var(--color-text-muted)] mt-10">
            vs
          </span>
          <div className="flex flex-col items-center gap-3">
            <TeamLogo abbr={game.home_team} size={88} />
            <span className="text-[30px] font-extrabold tracking-[-0.03em] leading-none">
              {game.home_team}
            </span>
          </div>
        </div>
        {pitchers && (
          <div className="text-[12px] text-[var(--color-text-muted)] font-medium mt-4">{pitchers}</div>
        )}
      </div>

      {/* Versus: cappers face off on either side */}
      {hasMlAction && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6 mt-8 max-w-[640px] mx-auto">
          <Side team={game.away_team} picks={buckets.awayMl} />
          <Side team={game.home_team} picks={buckets.homeMl} />
        </div>
      )}

      {/* Other markets: totals, props, parlay legs, etc. */}
      {hasOther && (
        <div className="mt-8 max-w-[640px] mx-auto">
          <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-[var(--color-text-muted)] mb-2 pb-2 border-b border-[rgba(255,255,255,0.06)]">
            Other markets · {buckets.other.length}
          </div>
          <div className="flex flex-col">
            {buckets.other.map((pick, i) => (
              <SlatePickRow
                key={`${pick.capper_id}-${i}`}
                pick={pick}
                awayTeam={game.away_team}
                homeTeam={game.home_team}
              />
            ))}
          </div>
        </div>
      )}

      {isSilent && (
        <div className="text-[12px] italic text-[var(--color-text-muted)] mt-6 text-center">
          Quiet. No one has tweeted on this one yet.
        </div>
      )}
    </section>
  );
}
