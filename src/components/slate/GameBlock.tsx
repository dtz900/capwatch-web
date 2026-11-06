import { GamePicks } from "./GamePicks";
import { TeamLogo } from "./TeamLogo";
import { StatusChip, deriveLifecycle } from "./StatusChip";
import { BookieAction } from "./BookieAction";
import { ShareLinkButton } from "@/components/share/ShareLinkButton";
import type { SlateGameShareLink } from "@/lib/slate-share";
import { pickMlSide } from "@/lib/bet-format";
import { teamColor } from "@/lib/teams";
import type { SlateGame, SlatePick, Sport } from "@/lib/types";

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
  sport: Sport = "MLB",
): BucketedPicks {
  const awayMl: SlatePick[] = [];
  const homeMl: SlatePick[] = [];
  const other: SlatePick[] = [];
  for (const p of picks) {
    const side = pickMlSide(p, awayTeam, homeTeam, sport);
    if (side === "away") awayMl.push(p);
    else if (side === "home") homeMl.push(p);
    else other.push(p);
  }
  return { awayMl, homeMl, other };
}

function sumProfit(picks: SlatePick[]): number {
  return picks.reduce((acc, p) => acc + (p.profit_units ?? 0), 0);
}

export function GameBlock({
  game,
  share,
}: {
  game: SlateGame;
  /** Share link for this card; the button is omitted when absent. */
  share?: SlateGameShareLink;
}) {
  const pitchers =
    game.away_starter && game.home_starter
      ? `${shortPitcher(game.away_starter)} vs ${shortPitcher(game.home_starter)}`
      : null;
  const sport: Sport = game.sport ?? "MLB";
  const buckets = bucketPicks(game.picks, game.away_team, game.home_team, sport);
  const isSilent = game.picks.length === 0;
  const awayColor = teamColor(game.away_team, sport);
  const homeColor = teamColor(game.home_team, sport);

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
      data-slate-game={game.game_id}
      className="relative scroll-mt-[118px] xl:scroll-mt-[96px] rounded-2xl
                 bg-gradient-to-b from-[#15151a] via-[#101015] to-[#0b0b0f]
                 border border-[rgba(255,255,255,0.07)]
                 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.55)]"
    >
      {/* Buffer above the sticky strip so the section's rounded-2xl top
          corners are visible above the sticky at rest. */}
      <div className="h-3 sm:h-4" />

      {/* Sticky matchup: a flat horizontal scoreboard strip — section-header
          style. No rounded corners on the sticky element itself; the rounded
          card chrome belongs to the section, which scrolls away. When pinned
          below the TopNav, the strip is just a clean horizontal bar. Top
          hairline plus 2px team-color split at the bottom frame it. */}
      <div
        data-card-strip
        className="sticky top-[110px] xl:top-16 z-10 bg-[#15151a]
                   border-t border-[rgba(255,255,255,0.10)]"
      >
        <div className="relative px-4 sm:px-6 py-4 sm:py-5">
          {share && (
            <div className="absolute right-3 sm:right-5 top-3 sm:top-4">
              <ShareLinkButton
                basePath="/slate"
                queryParams={share.queryParams}
                hash={share.hash}
                compact
                ariaLabel={`Copy share link for ${game.away_team ?? "away"} at ${game.home_team ?? "home"}`}
              />
            </div>
          )}
          <div className="flex items-center justify-center gap-3 sm:gap-5">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <TeamLogo
                abbr={game.away_team}
                sport={sport}
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
                game={game}
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
                sport={sport}
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
        <div aria-hidden="true" className="h-[2px] w-full flex">
          <span className="flex-1" style={{ backgroundColor: awayColor }} />
          <span className="flex-1" style={{ backgroundColor: homeColor }} />
        </div>
      </div>

      <div className="px-5 sm:px-7 pt-6 pb-7 sm:pb-8">

        <GamePicks
          picks={game.picks}
          sport={sport}
          awayTeam={game.away_team}
          homeTeam={game.home_team}
          showPnl={showPnl}
        />

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
