import type { BetTypeFilter, CapperAggregate, MarketSlice, Window } from "./types";

export interface MarketOption {
  /** Raw display_market key. Doubles as the history `market` param value. */
  value: string;
  /** Distinct readable label for the button. */
  label: string;
  /** Graded pick count, for ordering and display. */
  count: number;
}

const MARKET_LABELS: Record<string, string> = {
  ml: "Moneyline",
  f5_ml: "F5 ML",
  spread: "Spread",
  f5_spread: "F5 Spread",
  run_line: "Run Line",
  runline: "Run Line",
  total: "Total",
  f5_total: "F5 Total",
  team_total: "Team Total",
  f5_team_total: "F5 Team Total",
  nrfi: "NRFI",
  yrfi: "YRFI",
  game_prop: "Game Prop",
  player_prop: "Player Prop",
  prop: "Prop",
  first_5: "First 5",
};

const PROP_STAT_LABELS: Record<string, string> = {
  h: "Hits",
  hr: "Home Runs",
  hrr: "Hits+Runs+RBI",
  tb: "Total Bases",
  k: "Strikeouts",
  outs: "Outs",
  er: "Earned Runs",
  rbi: "RBI",
  r: "Runs",
  bb: "Walks",
  sb: "Stolen Bases",
};

/** Distinct, readable label for a raw display_market value used as a Market
 * filter button. Unlike normalizeMarket (which buckets team_total and total
 * together for the market-mix bar), this keeps every market distinct so the
 * filter never shows two buttons sharing one label (e.g. Total vs Team Total).
 * The button value stays the raw key, so the history/slice lookups are
 * unaffected. */
export function marketFilterLabel(raw: string): string {
  const key = raw.toLowerCase();
  if (MARKET_LABELS[key]) return MARKET_LABELS[key];
  const prop = /^prop_(batter|pitcher)_(.+)$/.exec(key);
  if (prop) {
    const role = prop[1] === "batter" ? "Batter" : "Pitcher";
    const stat =
      PROP_STAT_LABELS[prop[2]] ??
      prop[2].replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return `${role} ${stat}`;
  }
  // Generic humanizer for any unmapped token; degrades gracefully.
  return key
    .replace(/^f5_/, "F5 ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Build Market filter options from an aggregate's market_slices, ordered by
 * graded pick count descending. The "All markets" option is added by the UI. */
export function buildMarketOptions(
  slices: Record<string, MarketSlice> | null | undefined,
): MarketOption[] {
  if (!slices) return [];
  return Object.entries(slices)
    .map(([value, s]) => ({ value, label: marketFilterLabel(value), count: s.picks_count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Overlay a market slice's numeric stats onto the headline aggregate so the
 * StatBand can render a market-scoped view. Trajectory is handled separately
 * (see displayTrajectory in CapperFilterProvider). Streak and biggest-win are
 * not computed per market, so they are cleared (the StatBand hides them when
 * marketScoped). */
export function marketSliceToAggregate(
  base: CapperAggregate,
  slice: MarketSlice,
): CapperAggregate {
  return {
    ...base,
    picks_count: slice.picks_count,
    wins: slice.wins,
    losses: slice.losses,
    pushes: slice.pushes,
    units_profit: slice.units_profit,
    roi_pct: slice.roi_pct ?? 0,
    win_rate: slice.win_rate ?? 0,
    current_streak: 0,
    biggest_win: null,
  };
}

const WINDOW_LABEL: Record<Window, string> = {
  last_7: "Last 7",
  last_30: "Last 30",
  season: "Season",
  all_time: "All-time",
};

/** Human scope label for the stat band, sticky strip, and sparkline, e.g.
 * "Season · Spread" or "Last 30 · Straights". Window-only when bet type is
 * "all" and no market is selected. */
export function scopeLabel(
  window: Window,
  betType: BetTypeFilter,
  marketLabel: string | null,
): string {
  const parts: string[] = [WINDOW_LABEL[window]];
  if (marketLabel) parts.push(marketLabel);
  else if (betType === "straights") parts.push("Straights");
  else if (betType === "parlays") parts.push("Parlays");
  return parts.join(" · ");
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** "Jun 8 - 14" (same month), "May 28 - Jun 3" (cross month), "Jun 8" (one day).
 * Inputs are YYYY-MM-DD (ET game_date). Parsed as plain calendar parts, no
 * timezone math. Uses a single hyphen only (no em dash / double hyphen). */
export function formatRangeLabel(start: string, end: string): string {
  const [sy, sm, sd] = start.split("-").map((n) => parseInt(n, 10));
  const [ey, em, ed] = end.split("-").map((n) => parseInt(n, 10));
  const s = `${MONTHS[sm - 1]} ${sd}`;
  if (sy === ey && sm === em && sd === ed) return s;
  if (sy === ey && sm === em) return `${s} - ${ed}`;
  return `${s} - ${MONTHS[em - 1]} ${ed}`;
}

/** Range scope label for the stat band / sticky strip, e.g. "Jun 8 - 14 ·
 * Straights". Market scoping mirrors scopeLabel's bullet style. */
export function rangeScopeLabel(
  start: string,
  end: string,
  betType: BetTypeFilter,
  marketLabel: string | null = null,
): string {
  const parts: string[] = [formatRangeLabel(start, end)];
  if (marketLabel) parts.push(marketLabel);
  else if (betType === "straights") parts.push("Straights");
  else if (betType === "parlays") parts.push("Parlays");
  return parts.join(" · ");
}
