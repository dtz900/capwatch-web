/* Board API payloads -> the shapes the approved builder UI renders. */
import { NBA_EXTRA_ALIASES, NBA_TEAM_NAMES } from "@/lib/nba-teams";
import { NFL_TEAM_NAMES } from "@/lib/nfl-teams";
import type {
  BoardGame,
  BoardPeriod,
  BoardPeriodKey,
  BoardProp,
  BoardSide,
  BoardSlateGame,
  VipSport,
} from "@/lib/vip/types";

export type Period = BoardPeriodKey;
export const PERIODS: Array<[Period, string]> = [
  ["Game", "Full game"], ["1H", "1st half"], ["2H", "2nd half"],
  ["1Q", "1st qtr"], ["2Q", "2nd qtr"], ["3Q", "3rd qtr"], ["4Q", "4th qtr"],
];

export interface Lines {
  spread: [BoardSide, BoardSide] | null;
  total: [BoardSide, BoardSide] | null;
  ml: [BoardSide, BoardSide] | null;
  altSpreads: BoardSide[];
  altTotals: BoardSide[];
  /** Per team: main over/under first, then other captured rungs. */
  teamTotals: { away: BoardSide[]; home: BoardSide[] };
}

export interface PropMarket {
  player: string;
  team: string;
  stat: string;
  group: string;
  sides: [BoardSide, BoardSide] | null;
  alts: BoardSide[];
}

export interface BuilderGame {
  sport: VipSport;
  id: string;
  /** Day pill: "Tonight", "Tomorrow", "Sat"... */
  day: string;
  time: string;
  startMs: number;
  started: boolean;
  thin: boolean;
  away: string;
  home: string;
  /** False until the game's board has loaded. */
  loaded: boolean;
  periods: Partial<Record<Period, Lines>>;
  props: PropMarket[];
  slate: BoardSlateGame;
}

export function teamName(sport: VipSport, abbr: string): string {
  return (sport === "NFL" ? NFL_TEAM_NAMES : NBA_TEAM_NAMES)[abbr] ?? abbr;
}

/** Abbreviation, mascot and the nicknames cappers type. */
export function teamTerms(sport: VipSport, abbr: string): string[] {
  return [abbr, teamName(sport, abbr), ...(sport === "NBA" ? NBA_EXTRA_ALIASES[abbr] ?? [] : [])];
}

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ymd = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function dayLabel(ms: number, now: Date): string {
  const d = new Date(ms);
  if (ymd(d) === ymd(now)) return "Tonight";
  if (ymd(d) === ymd(new Date(now.getTime() + 864e5))) return "Tomorrow";
  return SHORT_DAYS[d.getDay()];
}

export const timeLabel = (ms: number) =>
  new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

const PROP_LABEL: Record<string, string> = {
  points: "Points", rebounds: "Rebounds", assists: "Assists", threes_made: "Threes",
  pra: "Pts + Reb + Ast", points_rebounds: "Pts + Reb", points_assists: "Pts + Ast",
  rebounds_assists: "Reb + Ast", steals: "Steals", blocks: "Blocks", steals_blocks: "Steals + Blocks",
  turnovers: "Turnovers", double_double: "Double double", triple_double: "Triple double",
  first_basket: "First basket", passing_yards: "Passing Yards", passing_tds: "Passing TDs",
  pass_attempts: "Pass Attempts", completions: "Completions", interceptions_thrown: "Interceptions",
  longest_completion: "Longest Completion", pass_rush_yards: "Pass + Rush Yards",
  rushing_yards: "Rushing Yards", rushing_attempts: "Rush Attempts", rushing_tds: "Rushing TDs",
  longest_rush: "Longest Rush", rush_rec_yards: "Rush + Rec Yards", receiving_yards: "Receiving Yards",
  receptions: "Receptions", receiving_tds: "Receiving TDs", longest_reception: "Longest Reception",
  anytime_td: "Anytime TD", first_td: "First TD", sacks: "Sacks", solo_tackles: "Solo Tackles",
  tackles: "Tackles + Assists", field_goals_made: "Field Goals", kicking_points: "Kicking Points",
  extra_points_made: "Extra Points",
};

export const PROP_GROUPS: Record<string, string[]> = {
  NBA: ["Points", "Rebounds", "Assists", "Threes", "Combos", "Defense", "Specials"],
  NFL: ["Passing", "Rushing", "Receiving", "Touchdowns", "Defense", "Kicking"],
};

/** Game totals read "CHA/WSH Over 219.5" on the slip and to subscribers. */
function withMatchup(s: BoardSide, away: string, home: string): BoardSide {
  return { ...s, label: `${away}/${home} ${s.label}` };
}

const pairWithMatchup = (p: [BoardSide, BoardSide] | null, away: string, home: string) =>
  p ? ([withMatchup(p[0], away, home), withMatchup(p[1], away, home)] as [BoardSide, BoardSide]) : null;

/** A rung's distance from the main line: spreads measured from the away
 *  side, so both teams' versions of one line sit together. */
function altDistance(s: BoardSide, away: string, main: number | null): number {
  const line = s.leg.line ?? 0;
  const own = s.leg.stat_name.endsWith("spread") && s.leg.selection !== away ? -line : line;
  return main === null ? Math.abs(own) : Math.abs(own - main);
}

/** The alt rungs within the `steps` nearest distances of the main line
 *  (either side, so about 2 * steps lines), in the board's own order. */
export function nearAlts(alts: BoardSide[], away: string, main: number | null, steps = 2): BoardSide[] {
  const dists = [...new Set(alts.map((s) => altDistance(s, away, main)))].sort((a, b) => a - b);
  const cut = dists[Math.min(steps, dists.length) - 1] ?? Infinity;
  const keep = new Set(
    alts.filter((s) => altDistance(s, away, main) <= cut).map((s) => s.key),
  );
  return alts.filter((s) => keep.has(s.key));
}

function lines(p: BoardPeriod, away: string, home: string): Lines {
  return {
    spread: p.spread,
    total: pairWithMatchup(p.total, away, home),
    ml: p.ml,
    altSpreads: p.alt_spreads,
    altTotals: p.alt_totals.map((s) => withMatchup(s, away, home)),
    teamTotals: {
      away: p.team_totals.filter((s) => s.leg.selection === away),
      home: p.team_totals.filter((s) => s.leg.selection !== away),
    },
  };
}

const prop = (p: BoardProp): PropMarket => ({
  player: p.player,
  team: p.team,
  stat: PROP_LABEL[p.stat_name] ?? p.stat_name.replace(/_/g, " "),
  group: p.group,
  sides: p.sides,
  alts: p.alts,
});

export function fromSlate(g: BoardSlateGame, now: Date): BuilderGame {
  const startMs = g.commence_time ? Date.parse(g.commence_time) : now.getTime();
  return {
    sport: g.sport, id: g.game_id, day: dayLabel(startMs, now), time: timeLabel(startMs), startMs,
    started: g.started, thin: true, away: g.away, home: g.home, loaded: false, periods: {}, props: [],
    slate: g,
  };
}

export function fromBoard(b: BoardGame, now: Date): BuilderGame {
  const base = fromSlate(b, now);
  const periods: Partial<Record<Period, Lines>> = {};
  for (const [key, p] of Object.entries(b.periods) as Array<[Period, BoardPeriod | undefined]>) {
    if (p) periods[key] = lines(p, b.away, b.home);
  }
  return { ...base, thin: b.thin, started: b.started, loaded: true, periods, props: b.props.map(prop) };
}

/** Distinct books quoting anything on the given boards. */
export function bookCount(games: BuilderGame[]): number {
  const books = new Set<string>();
  for (const g of games) {
    for (const l of Object.values(g.periods)) {
      for (const s of [...(l?.spread ?? []), ...(l?.total ?? []), ...(l?.ml ?? [])]) {
        for (const b of Object.keys(s.quotes)) books.add(b);
      }
    }
  }
  return books.size;
}
