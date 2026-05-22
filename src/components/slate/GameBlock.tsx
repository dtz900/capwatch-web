import { SlatePickRow } from "./SlatePickRow";
import { VersusPickRow } from "./VersusPickRow";
import { TeamLogo } from "./TeamLogo";
import { ScoreStatus, type ScoreStatusState } from "./ScoreStatus";
import { BookieAction } from "./BookieAction";
import { pickMlSide } from "@/lib/bet-format";
import { teamColor } from "@/lib/mlb-teams";
import type { SlateGame, SlatePick } from "@/lib/types";

function shortPitcher(name: string | null): string | null {
  if (!name) return null;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

interface BucketedPicks {
  awayMl: SlatePick[];
  homeMl: SlatePick[];
  other: SlatePick[];
}

function bucketPicks(
  picks: SlatePick[],
  awayTeam: string | null,
  homeTeam: string | null,
): BucketedPicks {
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

function sumRisked(picks: SlatePick[]): number {
  // Voided picks drop out; pushes and pending picks keep their stake.
  return picks
    .filter((p) => p.outcome !== "V")
    .reduce((acc, p) => acc + (p.stake_units ?? 0), 0);
}

function sumProfit(picks: SlatePick[]): number {
  return picks.reduce((acc, p) => acc + (p.profit_units ?? 0), 0);
}

function deriveLifecycle(game: SlateGame): ScoreStatusState {
  if (game.game_state === "scheduled") return "pre";
  if (game.game_state === "in_progress") return "live";
  const anyPending = game.picks.some((p) => p.outcome === null);
  return anyPending ? "final_pending" : "final_graded";
}

function formatRiskedAndPnl(risked: number, pnl: number, showPnl: boolean): string {
  const r = `${risked.toFixed(2)}u risked`;
  if (!showPnl) return r;
  const sign = pnl > 0 ? "+" : pnl < 0 ? "−" : "±";
  const p = `${sign}${Math.abs(pnl).toFixed(2)}u`;
  return `${r} · ${p}`;
}

function Side({
  team,
  picks,
  awayTeam,
  homeTeam,
  showPnl,
}: {
  team: string | null;
  picks: SlatePick[];
  awayTeam: string | null;
  homeTeam: string | null;
  showPnl: boolean;
}) {
  const color = teamColor(team);
  const risked = sumRisked(picks);
  const pnl = sumProfit(picks);
  const tally =
    picks.length === 0
      ? "0 sharps"
      : `${picks.length} ${picks.length === 1 ? "sharp" : "sharps"} · ${formatRiskedAndPnl(risked, pnl, showPnl)}`;
  return (
    <div>
      <div
        className="flex items-baseline justify-between pb-2 mb-1 border-b-2"
        style={{ borderColor: color }}
      >
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-[var(--color-text-muted)]">
            Backing
          </span>
          <span className="text-[15px] font-extrabold tracking-tight" style={{ color }}>
            {team ?? "—"}
          </span>
          <span className="text-[10px] uppercase tracking-[0.10em] font-semibold text-[var(--color-text-muted)] truncate">
            moneyline
          </span>
        </div>
        <span className="text-[11px] tabular-nums font-bold text-[var(--color-text-muted)] whitespace-nowrap">
          {tally}
        </span>
      </div>
      {picks.length === 0 ? (
        <div className="text-[11px] italic text-[var(--color-text-muted)] py-2">
          No sharps backing {team ?? "this side"} on the moneyline.
        </div>
      ) : (
        <div className="flex flex-col">
          {picks.map((pick, i) => (
            <VersusPickRow
              key={`${pick.capper_id}-${i}`}
              pick={pick}
              awayTeam={awayTeam}
              homeTeam={homeTeam}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function GameBlock({ game }: { game: SlateGame }) {
  const pitchers =
    game.away_starter && game.home_starter
      ? `${shortPitcher(game.away_starter)} vs ${shortPitcher(game.home_starter)}`
      : null;
  const buckets = bucketPicks(game.picks, game.away_team, game.home_team);
  const hasMlAction = buckets.awayMl.length + buckets.homeMl.length > 0;
  const hasOther = buckets.other.length > 0;
  const isSilent = game.picks.length === 0;
  const awayColor = teamColor(game.away_team);
  const homeColor = teamColor(game.home_team);

  const lifecycle = deriveLifecycle(game);
  const showPnl = lifecycle === "final_graded";

  const awayPnl = sumProfit(buckets.awayMl);
  const homePnl = sumProfit(buckets.homeMl);
  const otherPnl = sumProfit(buckets.other);
  const allVoided =
    game.picks.length > 0 && game.picks.every((p) => p.outcome === "V");

  return (
    <section
      id={`game-${game.game_id}`}
      className="relative rounded-2xl overflow-hidden
                 bg-gradient-to-b from-[#15151a] via-[#101015] to-[#0b0b0f]
                 border border-[rgba(255,255,255,0.07)]
                 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.55)]"
    >
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] flex">
        <span className="flex-1" style={{ backgroundColor: awayColor }} />
        <span className="flex-1" style={{ backgroundColor: homeColor }} />
      </div>

      <header
        className="flex items-center justify-between px-5 sm:px-7 py-3
                   border-b border-[rgba(255,255,255,0.06)]
                   text-[10px] uppercase tracking-[0.18em] font-bold
                   text-[var(--color-text-muted)]"
      >
        <span>Matchup</span>
        <span className="text-[var(--color-text-soft)]">
          <ScoreStatus
            state={lifecycle}
            awayTeam={game.away_team}
            homeTeam={game.home_team}
            awayScore={game.away_score}
            homeScore={game.home_score}
            inning={game.inning}
            inningHalf={game.inning_half}
            gameTime={game.game_time}
          />
        </span>
      </header>

      <div className="px-5 sm:px-7 py-7 sm:py-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-4 sm:gap-10">
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <TeamLogo
                abbr={game.away_team}
                size={88}
                className="!w-14 !h-14 sm:!w-[88px] sm:!h-[88px]"
              />
              <span className="text-[24px] sm:text-[30px] font-extrabold tracking-[-0.03em] leading-none">
                {game.away_team}
              </span>
            </div>
            <span className="text-[11px] sm:text-[12px] uppercase tracking-[0.22em] font-bold text-[var(--color-text-muted)] mt-7 sm:mt-10">
              vs
            </span>
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <TeamLogo
                abbr={game.home_team}
                size={88}
                className="!w-14 !h-14 sm:!w-[88px] sm:!h-[88px]"
              />
              <span className="text-[24px] sm:text-[30px] font-extrabold tracking-[-0.03em] leading-none">
                {game.home_team}
              </span>
            </div>
          </div>
          {pitchers && (
            <div className="text-[12px] text-[var(--color-text-muted)] font-medium mt-4">
              {pitchers}
            </div>
          )}
        </div>

        {hasMlAction && (
          <div className="grid grid-cols-2 gap-x-3 sm:gap-x-10 gap-y-6 mt-8 max-w-[680px] mx-auto">
            <Side
              team={game.away_team}
              picks={buckets.awayMl}
              awayTeam={game.away_team}
              homeTeam={game.home_team}
              showPnl={showPnl}
            />
            <Side
              team={game.home_team}
              picks={buckets.homeMl}
              awayTeam={game.away_team}
              homeTeam={game.home_team}
              showPnl={showPnl}
            />
          </div>
        )}

        {hasOther && (
          <div className="mt-8 max-w-[680px] mx-auto">
            <div className="flex items-baseline justify-between pb-2 mb-1 border-b border-[rgba(255,255,255,0.10)]">
              <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-[var(--color-text-muted)]">
                Totals, props & parlays
              </span>
              <span className="text-[11px] tabular-nums font-bold text-[var(--color-text-muted)]">
                {buckets.other.length} {buckets.other.length === 1 ? "pick" : "picks"}
              </span>
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

        {lifecycle === "final_graded" && !isSilent && (
          <BookieAction
            awayUnits={awayPnl}
            homeUnits={homePnl}
            otherUnits={otherPnl}
            allVoided={allVoided}
          />
        )}
      </div>
    </section>
  );
}
