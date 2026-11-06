import { describe, expect, it } from "vitest";
import { buildNcaabVolume, smallLogoUrl, wholeShares } from "./ncaab-og-volume";
import type { SlateGame, SlatePick } from "./types";

function pick(over: Partial<SlatePick>): SlatePick {
  return {
    capper_id: 1,
    capper_rank: null,
    handle: "a",
    display_name: null,
    profile_image_url: null,
    tier: null,
    has_paid_program: false,
    kind: "straight",
    leg_count: null,
    market: null,
    selection: null,
    line: null,
    odds_taken: -110,
    stake_units: 1,
    posted_at: null,
    tweet_url: null,
    source: null,
    outcome: null,
    profit_units: null,
    ...over,
  };
}

function game(id: number, away: string, home: string, picks: SlatePick[]): SlateGame {
  return {
    game_id: id,
    away_team: away,
    home_team: home,
    away_starter: null,
    home_starter: null,
    game_date: null,
    game_time: "2026-11-07T00:00:00Z",
    game_state: "scheduled",
    away_score: null,
    home_score: null,
    inning: null,
    inning_half: null,
    outs: null,
    sport: "NCAAB",
    away_team_id: String(id * 10),
    home_team_id: String(id * 10 + 1),
    market: { spread_home: -3.5, total: 150.5, source: "pinnacle_latest" },
    picks,
  };
}

describe("wholeShares", () => {
  it("always sums to 100", () => {
    expect(wholeShares([1, 1, 1])).toEqual([34, 33, 33]);
    expect(wholeShares([136, 88, 23, 18]).reduce((a, b) => a + b, 0)).toBe(100);
  });
  it("is all zeros when empty", () => {
    expect(wholeShares([0, 0])).toEqual([0, 0]);
  });
});

describe("buildNcaabVolume", () => {
  const games = [
    game(1, "CONN", "MICH", [
      pick({ capper_id: 1, stat_name: "spread", selection: "CONN +3.5", line: 3.5 }),
      pick({ capper_id: 2, stat_name: "spread", selection: "CONN +3.5", line: 3.5 }),
      pick({ capper_id: 3, stat_name: "total", selection: "Over 150.5", direction: "over", line: 150.5 }),
      pick({ capper_id: 4, stat_name: "win", selection: "MICH ML", kind: "parlay_leg", parlay_id: 9 }),
    ]),
    game(2, "SLU", "MIZ", [
      pick({ capper_id: 1, stat_name: "total", selection: "Under 150.5", direction: "under", line: 150.5 }),
      pick({ capper_id: 4, stat_name: "spread", selection: "MIZ -3.5", line: -3.5, kind: "parlay_leg", parlay_id: 9 }),
    ]),
    game(3, "YALE", "UCF", []),
  ];
  const v = buildNcaabVolume(games);

  it("counts bets with a parlay once, distinct cappers and games with action", () => {
    expect(v.bets).toBe(5); // 4 straights + 1 parlay across two games
    expect(v.cappers).toBe(4);
    expect(v.gamesWithAction).toBe(2);
    expect(v.totalGames).toBe(3);
  });

  it("splits the market mix by pick row and drops empty slices", () => {
    expect(v.mix.map((s) => [s.key, s.count])).toEqual([
      ["SPREAD", 3],
      ["TOTAL", 2],
      ["ML", 1],
    ]);
    expect(v.mix.reduce((a, s) => a + s.pct, 0)).toBe(100);
  });

  it("ranks games by cappers, skips empty games, names the most-backed side", () => {
    expect(v.top.map((g) => g.away)).toEqual(["CONN", "SLU"]);
    expect(v.top[0].cappers).toBe(4);
    expect(v.top[0].lean).toBe("CONN +3.5");
    expect(v.top[0].leanCount).toBe(2);
  });

  it("caps the list at topN", () => {
    expect(buildNcaabVolume(games, 1).top).toHaveLength(1);
  });
});

describe("smallLogoUrl", () => {
  it("routes ESPN team logos through the combiner", () => {
    expect(smallLogoUrl("https://a.espncdn.com/i/teamlogos/ncaa/500/41.png")).toBe(
      "https://a.espncdn.com/combiner/i?img=/i/teamlogos/ncaa/500/41.png&w=96&h=96",
    );
  });
  it("passes other URLs and null through", () => {
    expect(smallLogoUrl("https://x.test/a.png")).toBe("https://x.test/a.png");
    expect(smallLogoUrl(null)).toBeNull();
  });
});
