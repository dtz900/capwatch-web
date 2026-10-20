import { groupByMarket, type PlayerGroup } from "@/lib/slate-groups";
import { nbaBetLabel } from "@/lib/nba-bet-label";
import { feedsConsensusOdds, medianInt } from "@/lib/slate-consensus";
import { slateBetCount } from "@/lib/slate-bet-count";
import type { SlateGame, SlatePick } from "@/lib/types";

/**
 * Numbers for the NBA game OG card panel, from one slate game. Pure data: the
 * renderer picks colors, logos and layout.
 */

export interface NbaLean {
  side: "away" | "home" | "over" | "under";
  line: number | null;
  /** Distinct sharps on the lean side. */
  count: number;
  /** Distinct sharps on the market. */
  of: number;
}

export interface NbaBackedPlayer {
  key: string;
  name: string;
  sharps: number;
  legs: number;
  topBet: string | null;
  team: "away" | "home" | null;
}

export interface NbaPanel {
  ml: {
    away: number;
    home: number;
    awayPct: number | null;
    homePct: number | null;
    favored: "away" | "home" | null;
    medianOdds: number | null;
  };
  spread: NbaLean | null;
  total: NbaLean | null;
  propCount: number;
  players: NbaBackedPlayer[];
  capperCount: number;
  betCount: number;
  chips: { handles: string[]; more: number };
}

// Mirrors SUPPRESSED in slate-players.ts: counted everywhere, never named.
const SUPPRESSED = new Set(["winwhenhot"]);
const CHIP_LIMIT = 3;
const NAME_SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv"]);

const sharpCount = (picks: SlatePick[]): number => new Set(picks.map((p) => p.capper_id)).size;

function mostCommonLine(picks: SlatePick[], tieBreak: "low" | "high" | "first"): number | null {
  const counts = new Map<number, number>();
  for (const p of picks) if (p.line != null) counts.set(p.line, (counts.get(p.line) ?? 0) + 1);
  let best: number | null = null;
  for (const [line, n] of counts) {
    if (best === null) {
      best = line;
      continue;
    }
    const bn = counts.get(best) ?? 0;
    if (n > bn) best = line;
    else if (n === bn && tieBreak === "low" && line < best) best = line;
    else if (n === bn && tieBreak === "high" && line > best) best = line;
  }
  return best;
}

function lean<S extends NbaLean["side"]>(
  a: { side: S; picks: SlatePick[] },
  b: { side: S; picks: SlatePick[] },
  tieBreak: (side: S) => "low" | "high" | "first",
): NbaLean | null {
  const all = [...a.picks, ...b.picks];
  if (all.length === 0) return null;
  const winner = sharpCount(b.picks) > sharpCount(a.picks) ? b : a;
  return {
    side: winner.side,
    line: mostCommonLine(winner.picks, tieBreak(winner.side)),
    count: sharpCount(winner.picks),
    of: sharpCount(all),
  };
}

/** "Jayson Tatum Jr." -> "tatum": lowercase, accents and dots out, suffixes dropped. */
function surnameOf(name: string): string {
  const tokens = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\./g, "")
    .split(/\s+/)
    .filter(Boolean);
  while (tokens.length > 1 && NAME_SUFFIXES.has(tokens[tokens.length - 1])) tokens.pop();
  return tokens[tokens.length - 1] ?? "";
}

/**
 * Display surname, case and accents kept, generational suffix dropped:
 * "Jaren Jackson Jr." -> "Jackson", "Nikola Jokić" -> "Jokić", "Tatum" -> "Tatum".
 */
export function displaySurname(name: string): string {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  while (tokens.length > 1 && NAME_SUFFIXES.has(tokens[tokens.length - 1].toLowerCase().replace(/\./g, ""))) tokens.pop();
  return tokens[tokens.length - 1] ?? "";
}

const isSingleToken = (name: string): boolean => name.trim().split(/\s+/).length === 1;

/**
 * groupByMarket keys a prop by first initial + surname, so a bare surname row
 * ("Tatum 20+ PTS") lands alone. Fold each single-token group into the unique
 * multi-token group with that surname; zero or several matches stay separate.
 */
function mergeSurnameGroups(groups: PlayerGroup[]): PlayerGroup[] {
  const merged = new Map<string, PlayerGroup>();
  for (const g of groups) merged.set(g.key, g);
  for (const g of groups) {
    if (!isSingleToken(g.name)) continue;
    const surname = surnameOf(g.name);
    const targets = groups.filter((o) => o.key !== g.key && !isSingleToken(o.name) && surnameOf(o.name) === surname);
    if (targets.length !== 1) continue;
    const target = merged.get(targets[0].key);
    if (!target) continue;
    merged.set(target.key, { ...target, picks: [...target.picks, ...g.picks] });
    merged.delete(g.key);
  }
  return [...merged.values()];
}

function topBetOf(group: PlayerGroup): string | null {
  const byLabel = new Map<string, { cappers: Set<number>; rows: number }>();
  for (const p of group.picks) {
    const label = nbaBetLabel(p.selection, p.player_name?.trim() || group.name);
    if (!label) continue;
    const e = byLabel.get(label) ?? { cappers: new Set<number>(), rows: 0 };
    e.cappers.add(p.capper_id);
    e.rows += 1;
    byLabel.set(label, e);
  }
  let best: string | null = null;
  let bestE: { cappers: Set<number>; rows: number } | null = null;
  for (const [label, e] of byLabel) {
    if (!bestE || e.cappers.size > bestE.cappers.size || (e.cappers.size === bestE.cappers.size && e.rows > bestE.rows)) {
      best = label;
      bestE = e;
    }
  }
  return best;
}

function toBackedPlayers(groups: PlayerGroup[]): NbaBackedPlayer[] {
  return groups
    .map((g) => ({
      key: g.key,
      name: g.name,
      sharps: sharpCount(g.picks),
      legs: g.picks.length,
      topBet: topBetOf(g),
      team: null as "away" | "home" | null,
    }))
    .sort((a, b) => b.sharps - a.sharps || b.legs - a.legs || a.name.localeCompare(b.name));
}

function buildChips(orderedPicks: SlatePick[]): { handles: string[]; more: number } {
  const seen = new Set<string>();
  const named: string[] = [];
  for (const p of orderedPicks) {
    const h = p.handle?.trim();
    if (!h || SUPPRESSED.has(h.toLowerCase()) || seen.has(h.toLowerCase())) continue;
    seen.add(h.toLowerCase());
    named.push(h);
  }
  return { handles: named.slice(0, CHIP_LIMIT), more: Math.max(0, named.length - CHIP_LIMIT) };
}

export function buildNbaPanel(game: SlateGame): NbaPanel {
  const g = groupByMarket(game.picks, game.away_team, game.home_team, "NBA");

  const away = sharpCount(g.ml.away);
  const home = sharpCount(g.ml.home);
  const total = away + home;
  const awayPct = total > 0 ? Math.round((away / total) * 100) : null;
  const favored = away === home ? null : away > home ? "away" : "home";
  const favoredPicks = favored ? g.ml[favored] : [];

  const players = mergeSurnameGroups(g.players);
  const other = favored ? (favored === "away" ? "home" : "away") : null;
  const rest = new Set<SlatePick>([...g.ml.away, ...g.ml.home]);
  const ordered = favored
    ? [...favoredPicks, ...g.ml[other as "away" | "home"], ...game.picks.filter((p) => !rest.has(p))]
    : game.picks;

  return {
    ml: {
      away,
      home,
      awayPct,
      homePct: awayPct == null ? null : 100 - awayPct,
      favored,
      medianOdds: medianInt(favoredPicks.filter(feedsConsensusOdds).map((p) => p.odds_taken as number)),
    },
    spread: lean({ side: "away", picks: g.spread.away }, { side: "home", picks: g.spread.home }, () => "first"),
    total: lean(
      { side: "over", picks: g.total.over },
      { side: "under", picks: g.total.under },
      (side) => (side === "under" ? "low" : "high"),
    ),
    propCount: players.reduce((n, p) => n + p.picks.length, 0),
    players: toBackedPlayers(players),
    capperCount: sharpCount(game.picks),
    betCount: slateBetCount(game.picks),
    chips: buildChips(ordered),
  };
}
