import { describe, it, expect } from "vitest";
import { buildRailGames, railLifecycle, type RailGame } from "@/lib/rail";
import type { SlateGame, SlatePick } from "@/lib/types";

function pick(capper_id: number): SlatePick {
  // Only capper_id is read by buildRailGames; cast the rest.
  return { capper_id } as SlatePick;
}

function game(over: Partial<SlateGame> & { game_id: number }): SlateGame {
  return {
    game_id: over.game_id,
    away_team: over.away_team ?? "AWY",
    home_team: over.home_team ?? "HOM",
    away_starter: null,
    home_starter: null,
    game_date: null,
    game_time: over.game_time ?? null,
    game_state: over.game_state ?? "scheduled",
    away_score: over.away_score ?? null,
    home_score: over.home_score ?? null,
    inning: over.inning ?? null,
    inning_half: over.inning_half ?? null,
    outs: null,
    picks: over.picks ?? [],
  };
}

describe("railLifecycle", () => {
  it("maps scheduled and null to pre", () => {
    expect(railLifecycle("scheduled")).toBe("pre");
    expect(railLifecycle(null)).toBe("pre");
    expect(railLifecycle(undefined)).toBe("pre");
  });
  it("maps in_progress to live and final to final", () => {
    expect(railLifecycle("in_progress")).toBe("live");
    expect(railLifecycle("final")).toBe("final");
  });
});

describe("buildRailGames", () => {
  it("orders with-picks games before quiet games", () => {
    const withPicks = [game({ game_id: 1, picks: [pick(10)] })];
    const quiet = [game({ game_id: 2 })];
    const rail = buildRailGames(withPicks, quiet);
    expect(rail.map((r: RailGame) => r.game_id)).toEqual([1, 2]);
  });
  it("counts unique cappers, deduping a capper with multiple picks", () => {
    const withPicks = [game({ game_id: 1, picks: [pick(10), pick(10), pick(20)] })];
    const rail = buildRailGames(withPicks, []);
    expect(rail[0].sharp_count).toBe(2);
  });
  it("reports sharp_count 0 for quiet games", () => {
    const rail = buildRailGames([], [game({ game_id: 5 })]);
    expect(rail[0].sharp_count).toBe(0);
  });
  it("copies only serializable primitives", () => {
    const rail = buildRailGames(
      [game({ game_id: 1, away_team: "PHI", home_team: "MIA", picks: [pick(1)] })],
      [],
    );
    expect(rail[0]).toEqual({
      game_id: 1,
      away_team: "PHI",
      home_team: "MIA",
      game_state: "scheduled",
      away_score: null,
      home_score: null,
      game_time: null,
      inning: null,
      inning_half: null,
      sharp_count: 1,
    });
  });
});
