import { inferMarketBucket, pickMlSide, pickTeamSide } from "@/lib/bet-format";
import { displayName } from "@/lib/slate-players";
import type { SlatePick, Sport } from "@/lib/types";

// Organizes one game's picks for the slate card. NFL games carry dozens of
// props per game, so a flat list turns into a long scroll. Game lines split
// into side-vs-side columns, props fold under the player they are on, and the
// leftovers (game props, team totals, unresolved text) land in one list.

export interface SidePair {
  away: SlatePick[];
  home: SlatePick[];
}

export interface TotalPair {
  over: SlatePick[];
  under: SlatePick[];
}

export interface PlayerGroup {
  key: string;
  name: string;
  picks: SlatePick[];
}

export interface MarketGroups {
  ml: SidePair;
  spread: SidePair;
  total: TotalPair;
  players: PlayerGroup[];
  other: SlatePick[];
}

export interface CapperGroup {
  capperId: number;
  picks: SlatePick[];
}

// "Jalen Hurts 15+ Rushing Yards", "Prescott o33.5 Pass Att", "Hurts Anytime TD".
const PLAYER_PREFIX_RE =
  /^([A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*){0,3}?)\s+(?:\d+\+|over\b|under\b|[oOuU]\d|anytime\b|to\s+score\b|first\s+td\b)/i;

/** The player a prop is on, from the parse-time name or the selection text. */
export function propPlayerName(pick: Pick<SlatePick, "player_name" | "selection">): string | null {
  const named = pick.player_name?.trim();
  if (named) return named;
  const m = (pick.selection ?? "").trim().match(PLAYER_PREFIX_RE);
  return m ? m[1].trim() : null;
}

function totalSide(selection: string | null): "over" | "under" | null {
  const sel = selection ?? "";
  const m = sel.match(/\b(over|under)\b/i) ?? sel.match(/\b([oOuU])\d/);
  if (!m) return null;
  return m[1].toLowerCase().startsWith("o") ? "over" : "under";
}

/** Fallback key for rows without a player_id: "Jalen Hurts", "J. Hurts" and "J.Hurts" -> "j hurts". */
function playerTextKey(name: string): string {
  const parts = name.toLowerCase().replace(/'/g, "").replace(/\./g, " ").split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0][0]} ${parts.slice(1).join(" ")}`;
}

/** Most common full spelling, so one capper's typo cannot title the row (#183). */
function bestName(names: string[]): string {
  const counts = new Map<string, number>();
  for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
  return displayName(counts);
}

function totalStake(picks: SlatePick[]): number {
  return picks.reduce((acc, p) => acc + (p.stake_units ?? 0), 0);
}

export function groupByMarket(
  picks: SlatePick[],
  awayTeam: string | null,
  homeTeam: string | null,
  sport: Sport = "MLB",
): MarketGroups {
  const groups: MarketGroups = {
    ml: { away: [], home: [] },
    spread: { away: [], home: [] },
    total: { over: [], under: [] },
    players: [],
    other: [],
  };
  const propRows: { pick: SlatePick; name: string; textKey: string }[] = [];

  for (const p of picks) {
    // Same rule the card used before, so the moneyline tallies and the
    // BookieAction split do not move.
    const mlSide = pickMlSide(p, awayTeam, homeTeam, sport);
    if (mlSide) {
      groups.ml[mlSide].push(p);
      continue;
    }

    const bucket = inferMarketBucket(p.market, p.selection);
    if (bucket === "Spread") {
      const side = pickTeamSide(p.selection, awayTeam, homeTeam, sport);
      if (side) {
        groups.spread[side].push(p);
        continue;
      }
    }

    if (bucket === "Total" && (p.market ?? "").toLowerCase() !== "team_total") {
      const side = totalSide(p.selection);
      if (side) {
        groups.total[side].push(p);
        continue;
      }
    }

    if (bucket === "Player prop" || p.player_id != null || p.player_name) {
      const name = propPlayerName(p);
      if (name) {
        propRows.push({ pick: p, name, textKey: playerTextKey(name) });
        continue;
      }
    }

    groups.other.push(p);
  }

  // The roster id is canonical: it splits two players who share an initial
  // and surname, and joins spellings ("P.Mahomes", "Patrick Mahomes"). Rows
  // without one join the id group their name matches, else group by name.
  const idByText = new Map<string, number>();
  for (const r of propRows) {
    if (r.pick.player_id != null && !idByText.has(r.textKey)) idByText.set(r.textKey, r.pick.player_id);
  }
  const players = new Map<string, { names: string[]; picks: SlatePick[] }>();
  for (const r of propRows) {
    const id = r.pick.player_id ?? idByText.get(r.textKey);
    const key = id != null ? `id:${id}` : `name:${r.textKey}`;
    const entry = players.get(key) ?? { names: [], picks: [] };
    entry.names.push(r.name);
    entry.picks.push(r.pick);
    players.set(key, entry);
  }

  groups.players = [...players.entries()]
    .map(([key, e]) => ({ key, name: bestName(e.names), picks: e.picks }))
    .sort(
      (a, b) =>
        new Set(b.picks.map((p) => p.capper_id)).size - new Set(a.picks.map((p) => p.capper_id)).size ||
        b.picks.length - a.picks.length ||
        totalStake(b.picks) - totalStake(a.picks) ||
        a.name.localeCompare(b.name),
    );

  return groups;
}

/** One entry per capper, best-ranked first, unranked by volume. */
export function groupByCapper(picks: SlatePick[]): CapperGroup[] {
  const byCapper = new Map<number, SlatePick[]>();
  for (const p of picks) {
    const list = byCapper.get(p.capper_id) ?? [];
    list.push(p);
    byCapper.set(p.capper_id, list);
  }
  const rank = (g: CapperGroup) => g.picks[0].capper_rank ?? Number.POSITIVE_INFINITY;
  return [...byCapper.entries()]
    .map(([capperId, list]) => ({ capperId, picks: list }))
    .sort((a, b) => rank(a) - rank(b) || b.picks.length - a.picks.length || a.capperId - b.capperId);
}

// First match wins, so the specific stats sit above the generic ones.
const STAT_RULES: [RegExp, string][] = [
  [/\brush(ing)?\s*(\+|and|&)\s*rec/i, "Rush+rec yds"],
  [/\blongest\b/i, "Longest"],
  [/\brec(eiving)?\.?\s*(yards|yds|yd)\b/i, "Rec yds"],
  [/\brush(ing)?\s*(yards|yds|yd)\b/i, "Rush yds"],
  [/\bpass(ing)?\s*(yards|yds|yd)\b/i, "Pass yds"],
  [/\brush(ing)?\s*att/i, "Rush att"],
  [/\bpass(ing)?\s*att/i, "Pass att"],
  [/\bcomplet/i, "Completions"],
  [/\bpass(ing)?\s*(tds?|touchdowns?)\b/i, "Pass TDs"],
  [/\b(interceptions?|ints?)\b/i, "INTs"],
  [/\b(first|1st)\s+(td|touchdown)/i, "First TD"],
  [/\b(anytime|any\s+time|to\s+score|scorer|touchdowns?|tds?)\b/i, "TD"],
  [/\b(receptions?|catches|rec)\b/i, "Receptions"],
  [/\b(strikeouts?|ks?)\b/i, "Strikeouts"],
  [/\b(home\s*runs?|hrs?)\b/i, "Home runs"],
  [/\b(total\s+bases|tb)\b/i, "Total bases"],
  [/\bh\s*\+\s*r\s*\+\s*rbi|hits\s*\+\s*runs/i, "H+R+RBI"],
  [/\brbis?\b/i, "RBIs"],
  [/\bhits?\b/i, "Hits"],
  [/\bwalks?\b/i, "Walks"],
  [/\bouts\b/i, "Outs"],
  [/\bruns?\b/i, "Runs"],
  [/\b(yards|yds)\b/i, "Yards"],
];

/** The stat a prop is on: "50+ Receiving Yards -114" -> "Rec yds". */
export function propStat(text: string | null | undefined): string {
  const t = text ?? "";
  for (const [re, label] of STAT_RULES) if (re.test(t)) return label;
  return "Other";
}

/** "Rec yds 9 · Receptions 8 · TD 3", busiest stat first. */
export function propStatSummary(picks: Pick<SlatePick, "selection">[]): { stat: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of picks) {
    const s = propStat(p.selection);
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([stat, count]) => ({ stat, count }))
    .sort((a, b) => b.count - a.count || (a.stat === "Other" ? 1 : b.stat === "Other" ? -1 : a.stat.localeCompare(b.stat)));
}

/**
 * A parlay is one wager however many of its legs land on this game. Legs of
 * the same ticket share a key (same rule as slateBetCount).
 */
export function betKey(p: Pick<SlatePick, "kind" | "parlay_id" | "tweet_url" | "capper_id" | "posted_at">, i: number): string {
  if (p.kind !== "parlay_leg") return `s:${i}`;
  return p.parlay_id != null ? `id:${p.parlay_id}` : (p.tweet_url ?? `${p.capper_id}:${p.posted_at ?? ""}`);
}

export interface BetResult {
  stake: number;
  profit: number | null;
  result: "W" | "L" | "P" | "V" | null;
}

/**
 * One entry per wager. A parlay leg's outcome is the leg's own, but its
 * profit_units is the ticket's, so a parlay grades off its profit.
 */
export function toBets(picks: SlatePick[]): BetResult[] {
  const seen = new Set<string>();
  const bets: BetResult[] = [];
  picks.forEach((p, i) => {
    const key = betKey(p, i);
    if (seen.has(key)) return;
    seen.add(key);
    if (p.kind !== "parlay_leg") {
      bets.push({ stake: p.stake_units ?? 0, profit: p.profit_units, result: p.outcome });
      return;
    }
    const profit = p.profit_units;
    const result = profit == null ? null : profit > 0 ? "W" : profit < 0 ? "L" : p.outcome === "V" ? "V" : "P";
    bets.push({ stake: p.stake_units ?? 0, profit, result });
  });
  return bets;
}
