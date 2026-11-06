/**
 * Pure model for the NCAAB slate view. The API returns every D1 game with its
 * raw picks and the Pinnacle full-game line (platform contract
 * ncaab-c4-slate-contract); sides, sharps, the biggest bet and the order are
 * computed here so the view stays a thin render.
 */
import { formatPickText, inferMarketBucket, isFirstHalf, pickTeamSide } from "./bet-format";
import { ncaabLogoUrlForId, ncaabTeam, ncaabTeamLogoUrl, legibleTeamColor } from "./ncaab-teams";
import type { SlateGame, SlatePick } from "./types";

export type NcaabGroup =
  | "SPREAD"
  | "TOTAL"
  | "ML"
  | "1H SPREAD"
  | "1H TOTAL"
  | "1H ML"
  | "TEAM TOTAL"
  | "OTHER";

/** Back-of-card section order. */
export const GROUP_ORDER: readonly NcaabGroup[] = [
  "SPREAD",
  "TOTAL",
  "ML",
  "1H SPREAD",
  "1H TOTAL",
  "1H ML",
  "TEAM TOTAL",
  "OTHER",
];

export type PickSide = "away" | "home" | "over" | "under";

export interface ClassifiedPick {
  pick: SlatePick;
  group: NcaabGroup;
  /** Which side of the market the pick backs, or null when it cannot be told. */
  side: PickSide | null;
}

function overUnder(selection: string | null | undefined): "over" | "under" | null {
  const sel = selection ?? "";
  const m = sel.match(/\b(over|under)\b/i) ?? sel.match(/\b([oOuU])\s?\d/);
  if (!m) return null;
  return m[1].toLowerCase().startsWith("o") ? "over" : "under";
}

/**
 * Group for a platform key: a stat name (win, first_half_spread, team_points)
 * or a display market (ML, 1h_spread, team_total). Null when the key says
 * nothing; OTHER for game props and second-half bets, which must never feed
 * the full-game counts.
 */
function groupFromKey(raw: string | null | undefined): NcaabGroup | null {
  const k = (raw ?? "").trim().toLowerCase();
  if (!k) return null;
  if (k === "game_prop" || /^(second_half|2h|h2)_/.test(k)) return "OTHER";
  const firstHalf = /^(first_half|1h|h1)_/.test(k);
  const base = k.replace(/^(first_half|1h|h1)_/, "");
  if (base === "team_points" || base === "team_total") return "TEAM TOTAL";
  if (base === "win" || base === "ml") return firstHalf ? "1H ML" : "ML";
  if (base === "spread") return firstHalf ? "1H SPREAD" : "SPREAD";
  if (base === "total") return firstHalf ? "1H TOTAL" : "TOTAL";
  return null;
}

function directionOf(pick: SlatePick): "over" | "under" | null {
  const d = (pick.direction ?? "").trim().toLowerCase();
  if (d === "over" || d === "under") return d;
  return overUnder(pick.selection);
}

/**
 * Group and side for one pick of one game. Order: stat_name, then market, then
 * raw first_half_* (both handled by groupFromKey), then the selection text.
 */
export function classifyPick(pick: SlatePick, game: SlateGame): ClassifiedPick {
  const names = { away: game.away_name, home: game.home_name };
  const teamSide = () => pickTeamSide(pick.selection, game.away_team, game.home_team, "NCAAB", names);

  let group: NcaabGroup | null = null;
  if ((pick.stat_name ?? "").trim()) group = groupFromKey(pick.stat_name) ?? "OTHER";
  if (group == null) group = groupFromKey(pick.market);

  if (group == null) {
    const text = pick.selection ?? "";
    if (/\b(2h|2nd\s+half|second\s+half)\b/i.test(text)) {
      group = "OTHER";
    } else {
      // A "1H" tag in the text would hide the market from the text heuristics.
      const bare = text.replace(/\b(1h|1st\s+half|first\s+half)\b/gi, " ").replace(/\s+/g, " ").trim();
      const bucket = inferMarketBucket(null, bare);
      const firstHalf = isFirstHalf(pick);
      if (bucket === "Spread") group = firstHalf ? "1H SPREAD" : "SPREAD";
      else if (bucket === "Total") group = firstHalf ? "1H TOTAL" : "TOTAL";
      else if (bucket === "Moneyline") group = firstHalf ? "1H ML" : "ML";
      else group = "OTHER";
    }
  }

  if (group === "SPREAD" || group === "1H SPREAD" || group === "ML" || group === "1H ML") {
    return { pick, group, side: teamSide() };
  }
  if (group === "TOTAL" || group === "1H TOTAL" || group === "TEAM TOTAL") {
    return { pick, group, side: directionOf(pick) };
  }
  return { pick, group: "OTHER", side: null };
}

function distinctCappers(picks: ReadonlyArray<{ pick: SlatePick }>): number {
  return new Set(picks.map((c) => c.pick.capper_id)).size;
}

/** Sharps on each side of one market row. Parlay legs and straights both count. */
export interface SideCount {
  /** Distinct cappers on this side. */
  n: number;
  /** Bright on the card: the side has sharps and at least as many as the other. */
  lead: boolean;
}

export type SideLabel = SideCount & {
  text: string;
  /** "no line" when neither the market nor the sharps on this side give a line. */
  note?: string;
};

export interface MarketRow {
  label: "SPREAD" | "TOTAL";
  left: SideLabel;
  right: SideLabel;
}

/** Most common value; the first one seen wins a tie. Null when empty. */
export function modeOf(values: ReadonlyArray<number>): number | null {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: number | null = null;
  let bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  }
  return best;
}

function pickLine(p: SlatePick): number | null {
  if (p.line != null) return p.line;
  const m = (p.selection ?? "").match(/(?:over|under|\b[ou])\s*(\d+(?:\.\d+)?)/i);
  return m ? parseFloat(m[1]) : null;
}

export function tallySides(counts: { left: number; right: number }): { left: SideCount; right: SideCount } {
  return {
    left: { n: counts.left, lead: counts.left > 0 && counts.left >= counts.right },
    right: { n: counts.right, lead: counts.right > 0 && counts.right >= counts.left },
  };
}

/** "PK", "+2", "-2.5". */
export function fmtLine(x: number): string {
  if (x === 0) return "PK";
  return x > 0 ? `+${x}` : String(x);
}

function fmtUnits(u: number): string {
  return `${Number.isInteger(u) ? u : Number(u.toFixed(2))}u`;
}

export function fmtPrice(odds: number | null | undefined): string {
  if (odds == null) return "NO PRICE";
  return odds > 0 ? `+${odds}` : String(odds);
}

export interface BackRow {
  key: string;
  group: NcaabGroup;
  /** True on the first row of each group (renders the section heading). */
  head: boolean;
  handle: string;
  avatar: string | null;
  bet: string;
  /** "-110 · 1u", "NO PRICE", or "PARLAY". */
  price: string;
  parlay: boolean;
}

export interface BiggestBet {
  units: string;
  bet: string;
  who: string;
}

export interface NcaabCard {
  game: SlateGame;
  id: number;
  away: string;
  home: string;
  awayName: string;
  homeName: string;
  awayLogo: string | null;
  homeLogo: string | null;
  awayColor: string;
  homeColor: string;
  /** Distinct cappers with any pick on the game. */
  cappers: number;
  /** Pick rows on the card back. */
  pickCount: number;
  spread: MarketRow;
  total: MarketRow;
  biggest: BiggestBet | null;
  /** Count chips: pick rows in ML, any 1H market, and TEAM TOTAL. */
  chips: string[];
  rows: BackRow[];
}

function handleOf(p: SlatePick): string {
  const h = (p.handle ?? "").replace(/^@/, "");
  return h ? `@${h}` : `Capper ${p.capper_id}`;
}

export function buildCard(game: SlateGame): NcaabCard {
  const away = game.away_team ?? "AWAY";
  const home = game.home_team ?? "HOME";
  const classified = game.picks.map((p) => classifyPick(p, game));

  const sideCappers = (group: NcaabGroup, side: PickSide): number =>
    distinctCappers(classified.filter((c) => c.group === group && c.side === side));

  const line = game.market?.spread_home ?? null;
  const total = game.market?.total ?? null;
  const spreadTally = tallySides({ left: sideCappers("SPREAD", "away"), right: sideCappers("SPREAD", "home") });
  const totalTally = tallySides({ left: sideCappers("TOTAL", "over"), right: sideCappers("TOTAL", "under") });

  // Label a side at the market line. With no market line, use the most common
  // line among the sharps on the side with more takers, mirrored onto the other
  // side (spread flips sign, a total repeats), so both sides read one line.
  // With no line anywhere: the bare side plus a muted "no line" note.
  const takers = (group: NcaabGroup, side: PickSide) => {
    const lines = classified
      .filter((c) => c.group === group && c.side === side)
      .map((c) => pickLine(c.pick))
      .filter((v): v is number => v != null);
    return { line: modeOf(lines), n: lines.length };
  };
  const fallbackLine = (group: NcaabGroup, left: PickSide, right: PickSide, flip: boolean): number | null => {
    const l = takers(group, left);
    const r = takers(group, right);
    if (l.line == null && r.line == null) return null;
    if (r.line == null || (l.line != null && l.n >= r.n)) return l.line; // line as the left side wears it
    return flip ? -(r.line as number) : (r.line as number);
  };
  const spreadLeft = line == null ? fallbackLine("SPREAD", "away", "home", true) : -line;
  const totalLine = total ?? fallbackLine("TOTAL", "over", "under", false);
  const label = (tally: SideCount, name: string, value: number | null, signed: boolean): SideLabel =>
    value == null
      ? { ...tally, text: name, note: "no line" }
      : { ...tally, text: `${name} ${signed ? fmtLine(value) : value}` };
  const spread: MarketRow = {
    label: "SPREAD",
    left: label(spreadTally.left, away, spreadLeft, true),
    right: label(spreadTally.right, home, spreadLeft == null ? null : -spreadLeft, true),
  };
  const totalRow: MarketRow = {
    label: "TOTAL",
    left: label(totalTally.left, "Over", totalLine, false),
    right: label(totalTally.right, "Under", totalLine, false),
  };

  const textCtx = { awayTeam: game.away_team, homeTeam: game.home_team, sport: "NCAAB" as const, awayName: game.away_name, homeName: game.home_name };
  const betText = (p: SlatePick) =>
    formatPickText({ pick: { ...p, kind: p.kind === "parlay_leg" ? "parlay_leg" : "straight" }, ...textCtx });

  // Largest straight; ties go to the earliest post, then list order.
  const postedMs = (p: SlatePick) => (p.posted_at ? Date.parse(p.posted_at) || Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER);
  let top: SlatePick | null = null;
  for (const p of game.picks) {
    if (p.kind !== "straight" || !(p.stake_units > 0)) continue;
    if (!top || p.stake_units > top.stake_units || (p.stake_units === top.stake_units && postedMs(p) < postedMs(top))) {
      top = p;
    }
  }
  const biggest: BiggestBet | null = top ? { units: fmtUnits(top.stake_units), bet: betText(top), who: handleOf(top) } : null;

  const count = (pred: (c: ClassifiedPick) => boolean) => classified.filter(pred).length;
  const chips: string[] = [];
  const ml = count((c) => c.group === "ML");
  const h1 = count((c) => c.group === "1H SPREAD" || c.group === "1H TOTAL" || c.group === "1H ML");
  const tt = count((c) => c.group === "TEAM TOTAL");
  if (ml > 0) chips.push(`${ml} ML`);
  if (h1 > 0) chips.push(`${h1} 1H`);
  if (tt > 0) chips.push(`${tt} TT`);

  const rows: BackRow[] = [];
  for (const group of GROUP_ORDER) {
    const inGroup = classified.filter((c) => c.group === group);
    inGroup.forEach((c, i) => {
      const parlay = c.pick.kind === "parlay_leg";
      const units = c.pick.stake_units > 0 ? ` · ${fmtUnits(c.pick.stake_units)}` : "";
      rows.push({
        key: `${group}-${i}-${c.pick.capper_id}-${c.pick.parlay_id ?? ""}-${c.pick.selection ?? ""}`,
        group,
        head: i === 0,
        handle: handleOf(c.pick),
        avatar: c.pick.profile_image_url,
        bet: betText(c.pick),
        price: parlay ? "PARLAY" : `${fmtPrice(c.pick.odds_taken)}${units}`,
        parlay,
      });
    });
  }

  const awayRow = ncaabTeam(away);
  const homeRow = ncaabTeam(home);
  return {
    game,
    id: game.game_id,
    away,
    home,
    awayName: game.away_name ?? awayRow?.name ?? away,
    homeName: game.home_name ?? homeRow?.name ?? home,
    // The payload's team id wins; the generated map covers payloads without one.
    awayLogo: ncaabLogoUrlForId(game.away_team_id) ?? ncaabTeamLogoUrl(away),
    homeLogo: ncaabLogoUrlForId(game.home_team_id) ?? ncaabTeamLogoUrl(home),
    awayColor: legibleTeamColor(game.away_color ?? awayRow?.color),
    homeColor: legibleTeamColor(game.home_color ?? homeRow?.color),
    cappers: new Set(game.picks.map((p) => p.capper_id)).size,
    pickCount: game.picks.length,
    spread,
    total: totalRow,
    biggest,
    chips,
    rows,
  };
}

/** Distinct cappers on a game. */
export function gameCappers(game: SlateGame): number {
  return new Set(game.picks.map((p) => p.capper_id)).size;
}

function tipMs(game: SlateGame): number {
  const t = game.game_time ? Date.parse(game.game_time) : NaN;
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
}

/** Most sharps first, then earliest tip, then game id for a stable order. */
export function orderGames(games: readonly SlateGame[]): SlateGame[] {
  const done = (g: SlateGame) => (g.game_state === "final" ? 1 : 0);
  return [...games].sort(
    (a, b) => done(a) - done(b) || gameCappers(b) - gameCappers(a) || tipMs(a) - tipMs(b) || a.game_id - b.game_id,
  );
}

export interface NcaabBoard {
  withPicks: SlateGame[];
  /** Zero-pick games, earliest tip first, collapsed behind one row. */
  quiet: SlateGame[];
}

export function splitBoard(games: readonly SlateGame[]): NcaabBoard {
  const ordered = orderGames(games);
  return {
    withPicks: ordered.filter((g) => g.picks.length > 0),
    quiet: ordered.filter((g) => g.picks.length === 0),
  };
}
