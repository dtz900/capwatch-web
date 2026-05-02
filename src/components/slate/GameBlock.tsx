import { SlatePickRow } from "./SlatePickRow";
import { TeamLogo } from "./TeamLogo";
import { inferMarketBucket } from "@/lib/bet-format";
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

interface SideSummary {
  awayLabel: string;
  homeLabel: string;
  awayCount: number;
  homeCount: number;
  market: string;
}

function classifyMlSide(selection: string | null, away: string | null, home: string | null): "away" | "home" | null {
  if (!selection) return null;
  const s = selection.toLowerCase();
  if (away && new RegExp(`\\b${away.toLowerCase()}\\b`).test(s)) return "away";
  if (home && new RegExp(`\\b${home.toLowerCase()}\\b`).test(s)) return "home";
  return null;
}

function sideSummary(picks: SlatePick[], awayTeam: string | null, homeTeam: string | null): SideSummary | null {
  const ml: SlatePick[] = [];
  for (const p of picks) {
    if (inferMarketBucket(p.market, p.selection) === "Moneyline") ml.push(p);
  }
  if (ml.length < 2) return null;
  let a = 0;
  let h = 0;
  for (const p of ml) {
    const side = classifyMlSide(p.selection, awayTeam, homeTeam);
    if (side === "away") a++;
    else if (side === "home") h++;
  }
  if (a + h < 2) return null;
  return {
    awayLabel: awayTeam ?? "Away",
    homeLabel: homeTeam ?? "Home",
    awayCount: a,
    homeCount: h,
    market: "ML",
  };
}

export function GameBlock({ game }: { game: SlateGame }) {
  const time = formatGameTime(game.game_time);
  const pitchers =
    game.away_starter && game.home_starter
      ? `${shortPitcher(game.away_starter)} vs ${shortPitcher(game.home_starter)}`
      : null;
  const n = game.picks.length;
  const split = sideSummary(game.picks, game.away_team, game.home_team);

  return (
    <section id={`game-${game.game_id}`} className="py-7 border-t border-[rgba(255,255,255,0.06)]">
      <header className="flex items-baseline justify-between gap-6 mb-1">
        <div className="flex items-center gap-3 min-w-0">
          <TeamLogo abbr={game.away_team} size={26} />
          <span className="text-[26px] font-extrabold tracking-[-0.02em] leading-none">
            {game.away_team}
          </span>
          <span className="text-[18px] font-bold text-[var(--color-text-muted)] mx-0.5 leading-none">@</span>
          <TeamLogo abbr={game.home_team} size={26} />
          <span className="text-[26px] font-extrabold tracking-[-0.02em] leading-none">
            {game.home_team}
          </span>
        </div>
        {time && (
          <div className="text-[12px] font-semibold text-[var(--color-text-soft)] tabular-nums whitespace-nowrap">
            {time}
          </div>
        )}
      </header>

      <div className="text-[12px] text-[var(--color-text-muted)] font-medium tabular-nums">
        {pitchers && <span>{pitchers}</span>}
        {pitchers && (n > 0 || split) && <span className="opacity-60"> · </span>}
        {n > 0 && (
          <span>
            {n} {n === 1 ? "pick" : "picks"}
          </span>
        )}
        {split && (
          <>
            <span className="opacity-60"> · </span>
            <span>
              ML split{" "}
              <span className="text-[var(--color-text-soft)] font-semibold">
                {split.awayCount} {split.awayLabel}
              </span>{" "}
              /{" "}
              <span className="text-[var(--color-text-soft)] font-semibold">
                {split.homeCount} {split.homeLabel}
              </span>
            </span>
          </>
        )}
      </div>

      {n === 0 ? (
        <div className="text-[12px] italic text-[var(--color-text-muted)] mt-3">
          Quiet. No one has tweeted on this one yet.
        </div>
      ) : (
        <div className="mt-3 flex flex-col">
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
