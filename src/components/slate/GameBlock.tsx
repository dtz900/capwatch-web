import { SlatePickRow } from "./SlatePickRow";
import { VersusPickRow } from "./VersusPickRow";
import { TeamLogo } from "./TeamLogo";
import { type ScoreStatusState } from "./ScoreStatus";
import { BookieAction } from "./BookieAction";
import { pickMlSide } from "@/lib/bet-format";
import { teamColor } from "@/lib/mlb-teams";
import type { InningHalf, SlateGame, SlatePick } from "@/lib/types";

const HEADER_HALF_LABEL: Record<InningHalf, string> = {
  top: "TOP",
  bot: "BOT",
  mid: "MID",
  end: "END",
};

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

function StatusChip({
  lifecycle,
  inningHalf,
  inning,
  gameTime,
}: {
  lifecycle: ScoreStatusState;
  inningHalf: InningHalf | null;
  inning: number | null;
  gameTime: string | null;
}) {
  if (lifecycle === "pre") {
    const time = formatGameTime(gameTime);
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.04)] text-[var(--color-text-muted)] ring-1 ring-inset ring-[rgba(255,255,255,0.08)] text-[10px] uppercase tracking-[0.18em] font-bold tabular-nums whitespace-nowrap">
        {time ?? ""}
      </span>
    );
  }
  if (lifecycle === "live") {
    const label =
      inningHalf && inning !== null
        ? `${HEADER_HALF_LABEL[inningHalf]} ${inning}`
        : "LIVE";
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-pos-soft)] text-[var(--color-pos)] ring-1 ring-inset ring-[rgba(25,245,124,0.25)] text-[10px] uppercase tracking-[0.18em] font-bold whitespace-nowrap">
        <span
          className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"
          aria-hidden
        />
        {label}
      </span>
    );
  }
  if (lifecycle === "final_pending") {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.06)] text-[var(--color-text-soft)] ring-1 ring-inset ring-[rgba(255,255,255,0.14)] text-[10px] uppercase tracking-[0.18em] font-bold">
          FINAL
        </span>
        <span className="text-[10px] italic text-[var(--color-text-muted)] tracking-wider">
          grading…
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.06)] text-[var(--color-text-soft)] ring-1 ring-inset ring-[rgba(255,255,255,0.14)] text-[10px] uppercase tracking-[0.18em] font-bold whitespace-nowrap">
    FINAL
    </span>
  );
}

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
  // ISR-cached responses from before the backend started emitting
  // game_state may deliver undefined. Treat that as pre-game so we never
  // flash "FINAL · grading…" on a scheduled card during the cache turnover.
  if (!game.game_state) return "pre";
  if (game.game_state === "scheduled") return "pre";
  if (game.game_state === "in_progress") return "live";
  // Only straight picks gate the "grading…" suffix. Parlay legs stay
  // outcome=null until the parent parlay resolves, which depends on OTHER
  // games on the slate finishing. Waiting on them would leave this card
  // stuck in final_pending long after the game itself is decided.
  const anyStraightPending = game.picks.some(
    (p) => p.kind === "straight" && p.outcome === null,
  );
  return anyStraightPending ? "final_pending" : "final_graded";
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
        className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-y-0.5 pb-2 mb-1 border-b-2"
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
        <span className="text-[10.5px] tabular-nums font-bold text-[var(--color-text-muted)] whitespace-normal sm:whitespace-nowrap">
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
      className="relative rounded-2xl
                 bg-gradient-to-b from-[#15151a] via-[#101015] to-[#0b0b0f]
                 border border-[rgba(255,255,255,0.07)]
                 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.55)]"
    >
      {/* Sticky matchup: compact scoreboard pins to the top of the viewport
          (below the global TopNav at top-16) as the user scrolls through
          this card's picks. iOS section-header pattern. */}
      <div
        className="sticky top-16 z-20 rounded-t-2xl overflow-hidden
                   bg-[#13131a]/95 backdrop-blur-md
                   border-b border-[rgba(255,255,255,0.06)]"
      >
        <div className="px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-center gap-3 sm:gap-5">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <TeamLogo
                abbr={game.away_team}
                size={88}
                className="!w-10 !h-10 sm:!w-12 sm:!h-12"
              />
              <div className="flex flex-col items-end leading-none gap-0.5">
                <span className="text-[13px] sm:text-[14px] font-extrabold tracking-tight">
                  {game.away_team}
                </span>
                {lifecycle !== "pre" && (
                  <span
                    className="text-[24px] sm:text-[30px] font-extrabold tabular-nums leading-none"
                    style={{ color: awayColor }}
                  >
                    {game.away_score ?? "—"}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 px-1 sm:px-2 shrink-0">
              <StatusChip
                lifecycle={lifecycle}
                inningHalf={game.inning_half}
                inning={game.inning}
                gameTime={game.game_time}
              />
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="flex flex-col items-start leading-none gap-0.5">
                <span className="text-[13px] sm:text-[14px] font-extrabold tracking-tight">
                  {game.home_team}
                </span>
                {lifecycle !== "pre" && (
                  <span
                    className="text-[24px] sm:text-[30px] font-extrabold tabular-nums leading-none"
                    style={{ color: homeColor }}
                  >
                    {game.home_score ?? "—"}
                  </span>
                )}
              </div>
              <TeamLogo
                abbr={game.home_team}
                size={88}
                className="!w-10 !h-10 sm:!w-12 sm:!h-12"
              />
            </div>
          </div>
          {pitchers && (
            <div className="text-[11px] text-[var(--color-text-muted)] font-medium mt-3 text-center">
              {pitchers}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 sm:px-7 pt-6 pb-7 sm:pb-8">

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
