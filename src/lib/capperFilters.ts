import type { BetTypeFilter, CapperAggregate, MarketSlice, Window } from "./types";
import { normalizeMarket } from "./markets";

export interface MarketOption {
  /** Raw display_market key. Doubles as the history `market` param value. */
  value: string;
  /** Prettified bucket label for the button. */
  label: string;
  /** Graded pick count, for ordering and display. */
  count: number;
}

/** Build Market filter options from an aggregate's market_slices, ordered by
 * graded pick count descending. The "All markets" option is added by the UI. */
export function buildMarketOptions(
  slices: Record<string, MarketSlice> | null | undefined,
): MarketOption[] {
  if (!slices) return [];
  return Object.entries(slices)
    .map(([value, s]) => ({ value, label: normalizeMarket(value), count: s.picks_count }))
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
