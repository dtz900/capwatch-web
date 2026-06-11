import { describe, it, expect } from "vitest";
import {
  buildMarketOptions,
  marketSliceToAggregate,
  scopeLabel,
} from "@/lib/capperFilters";
import type { CapperAggregate, MarketSlice } from "@/lib/types";

const slice = (over: Partial<MarketSlice>): MarketSlice => ({
  picks_count: 0, wins: 0, losses: 0, pushes: 0,
  units_profit: 0, roi_pct: null, win_rate: null, trajectory: [],
  ...over,
});

const baseAgg: CapperAggregate = {
  time_window: "season", picks_count: 50, wins: 28, losses: 20, pushes: 2,
  units_profit: 6.4, roi_pct: 3.1, win_rate: 0.58, clv_avg: null,
  clv_beat_pct: null, clv_count: null, current_streak: 4, refreshed_at: null,
  bet_type_breakdown: null,
  biggest_win: { units: 5, market: "ML", selection: null, line: null,
    odds_taken: null, game_label: null, game_date: null, tweet_url: null },
  tracked_since: "2026-04-01", tweets_parsed: 100, parlay_share: 0.1,
  deleted_picks_count: 0,
};

describe("buildMarketOptions", () => {
  it("orders by picks_count desc and labels via normalizeMarket", () => {
    const opts = buildMarketOptions({
      spread: slice({ picks_count: 5 }),
      ML: slice({ picks_count: 12 }),
      total: slice({ picks_count: 8 }),
    });
    expect(opts.map((o) => o.value)).toEqual(["ML", "total", "spread"]);
    expect(opts.map((o) => o.label)).toEqual(["Moneyline", "Total", "Spread"]);
    expect(opts[0].count).toBe(12);
  });

  it("returns [] for null/empty slices", () => {
    expect(buildMarketOptions(null)).toEqual([]);
    expect(buildMarketOptions({})).toEqual([]);
    expect(buildMarketOptions(undefined)).toEqual([]);
  });
});

describe("marketSliceToAggregate", () => {
  it("overlays slice numbers and clears streak/biggest_win", () => {
    const s = slice({ picks_count: 10, wins: 6, losses: 4, units_profit: 2.5, roi_pct: 4, win_rate: 0.6 });
    const out = marketSliceToAggregate(baseAgg, s);
    expect(out.picks_count).toBe(10);
    expect(out.wins).toBe(6);
    expect(out.units_profit).toBe(2.5);
    expect(out.roi_pct).toBe(4);
    expect(out.win_rate).toBe(0.6);
    expect(out.current_streak).toBe(0);
    expect(out.biggest_win).toBeNull();
    expect(out.tracked_since).toBe("2026-04-01"); // base fields preserved
  });

  it("coerces null roi/win_rate to 0", () => {
    const out = marketSliceToAggregate(baseAgg, slice({ roi_pct: null, win_rate: null }));
    expect(out.roi_pct).toBe(0);
    expect(out.win_rate).toBe(0);
  });
});

describe("scopeLabel", () => {
  it("uses market label when set", () => {
    expect(scopeLabel("season", "straights", "Spread")).toBe("Season · Spread");
  });
  it("falls back to bet type when no market", () => {
    expect(scopeLabel("last_30", "straights", null)).toBe("Last 30 · Straights");
    expect(scopeLabel("all_time", "parlays", null)).toBe("All-time · Parlays");
    expect(scopeLabel("season", "all", null)).toBe("Season");
  });
  it("handles last_7 window", () => {
    expect(scopeLabel("last_7", "all", null)).toBe("Last 7");
  });
});
