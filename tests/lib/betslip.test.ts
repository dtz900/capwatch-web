import { describe, it, expect, vi, afterEach } from "vitest";
import {
  netOdds, slipProfit, clampOdds, clampStake, slipInsertFromPick, slipTotals,
  type SlipEntry,
} from "@/lib/betslip";
import { fetchPickOutcomes } from "@/lib/api";
import type { TodayPickEntry } from "@/lib/types";

afterEach(() => vi.restoreAllMocks());

const basePick: TodayPickEntry = {
  capper_id: 69, handle: "tonestakes", display_name: "TonesTakes",
  profile_image_url: null, kind: "straight", matchup: "PHI @ CIN",
  market: "ML", market_group: "ML", selection: "Reds ML", line: null,
  odds_taken: 142, posted_at: "2026-07-09T16:00:00Z", outcome: null,
  profit_units: null, pick_id: 9001, parlay_id: null,
};

function entry(over: Partial<SlipEntry> = {}): SlipEntry {
  return {
    id: 1, pick_id: 9001, parlay_id: null, stake: 1.0, odds: 142, capper_id: 69,
    capper_handle: "tonestakes", matchup: "PHI @ CIN", market: "ML",
    selection: "Reds ML", line: null, game_date: "2026-07-09",
    created_at: "2026-07-09T16:05:00Z", outcome: null, ...over,
  };
}

describe("betslip math", () => {
  it("netOdds converts American both ways", () => {
    expect(netOdds(150)).toBeCloseTo(1.5);
    expect(netOdds(-200)).toBeCloseTo(0.5);
  });

  it("slipProfit pays wins at the user's odds and stake", () => {
    expect(slipProfit("W", 2, -110)).toBeCloseTo(2 * (100 / 110));
    expect(slipProfit("W", 0.5, 142)).toBeCloseTo(0.71);
    expect(slipProfit("L", 2, -110)).toBe(-2);
    expect(slipProfit("P", 3, 142)).toBe(0);
    expect(slipProfit("V", 3, 142)).toBe(0);
    expect(slipProfit(null, 3, 142)).toBeNull();
  });

  it("clampOdds accepts American 100..10000 absolute (parlay combineds), rejects the rest", () => {
    expect(clampOdds(-110)).toBe(-110);
    expect(clampOdds(2000)).toBe(2000);
    expect(clampOdds(9500)).toBe(9500);
    expect(clampOdds(99)).toBeNull();
    expect(clampOdds(-99)).toBeNull();
    expect(clampOdds(0)).toBeNull();
    expect(clampOdds(10001)).toBeNull();
    expect(clampOdds(NaN)).toBeNull();
  });

  it("clampStake bounds 0.1..10", () => {
    expect(clampStake(1)).toBe(1);
    expect(clampStake(0.05)).toBeNull();
    expect(clampStake(11)).toBeNull();
    expect(clampStake(NaN)).toBeNull();
  });
});

describe("slipInsertFromPick", () => {
  it("builds the insert payload with snapshot fields", () => {
    const row = slipInsertFromPick("user-1", basePick, "2026-07-09");
    expect(row).toEqual({
      user_id: "user-1", pick_id: 9001, parlay_id: null, stake: 1.0, odds: 142,
      capper_id: 69, capper_handle: "tonestakes", matchup: "PHI @ CIN",
      market: "ML", selection: "Reds ML", line: null, game_date: "2026-07-09",
    });
  });

  it("defaults odds to -110 when the pick has none", () => {
    const row = slipInsertFromPick("user-1", { ...basePick, odds_taken: null }, "2026-07-09");
    expect(row?.odds).toBe(-110);
  });

  it("builds a parlay payload binding parlay_id at the combined odds", () => {
    const parlay: TodayPickEntry = {
      ...basePick, kind: "parlay", pick_id: null, parlay_id: 501,
      matchup: null, market: "parlay", market_group: null,
      selection: "3-leg parlay", line: null, odds_taken: 450,
    };
    const row = slipInsertFromPick("user-1", parlay, "2026-07-09");
    expect(row).toEqual({
      user_id: "user-1", pick_id: null, parlay_id: 501, stake: 1.0, odds: 450,
      capper_id: 69, capper_handle: "tonestakes", matchup: null,
      market: "parlay", selection: "3-leg parlay", line: null, game_date: "2026-07-09",
    });
  });

  it("refuses picks without an id to bind to", () => {
    expect(
      slipInsertFromPick("u", { ...basePick, kind: "parlay", parlay_id: null }, "2026-07-09")
    ).toBeNull();
    expect(slipInsertFromPick("u", { ...basePick, pick_id: null }, "2026-07-09")).toBeNull();
  });
});

describe("slipTotals", () => {
  it("splits today vs all-time and counts pending", () => {
    const entries = [
      entry({ id: 1, outcome: "W", stake: 1, odds: 100, game_date: "2026-07-09" }),  // +1.0 today
      entry({ id: 2, outcome: "L", stake: 2, odds: -110, game_date: "2026-07-01" }), // -2.0 older
      entry({ id: 3, outcome: null, game_date: "2026-07-09" }),                       // pending
      entry({ id: 4, outcome: "V", stake: 5, odds: 500, game_date: "2026-07-02" }),  // 0
    ];
    const t = slipTotals(entries, "2026-07-09");
    expect(t.today).toBeCloseTo(1.0);
    expect(t.allTime).toBeCloseTo(-1.0);
    expect(t.pending).toBe(1);
  });
});

describe("fetchPickOutcomes", () => {
  it("maps pick and parlay outcomes by id and returns empty maps for no ids", async () => {
    const payload = {
      outcomes: [
        { pick_id: 1, outcome: "W", graded_at: "2026-07-09T05:00:00Z" },
        { pick_id: 2, outcome: "V", graded_at: null },
      ],
      parlay_outcomes: [{ parlay_id: 501, outcome: "L", graded_at: null }],
    };
    const spy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true, json: async () => payload,
    } as unknown as Response);
    const out = await fetchPickOutcomes([1, 2], [501]);
    expect(out.picks[1]).toEqual({ outcome: "W", graded_at: "2026-07-09T05:00:00Z" });
    expect(out.picks[2].outcome).toBe("V");
    expect(out.parlays[501].outcome).toBe("L");
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/public\/picks\/outcomes\?pick_ids=1%2C2/),
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/public\/picks\/outcomes\?parlay_ids=501/),
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(await fetchPickOutcomes([])).toEqual({ picks: {}, parlays: {} });
  });
});
