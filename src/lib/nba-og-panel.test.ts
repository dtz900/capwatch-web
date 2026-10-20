import { describe, expect, it } from "vitest";
import { buildNbaPanel, displaySurname } from "./nba-og-panel";
import { slateBetCount } from "./slate-bet-count";
import type { SlateGame, SlatePick } from "./types";

// BOS @ DET, 2026-10-20: the slate payload shape (trimmed).
const row = (o: Partial<SlatePick> & { capper_id: number }): SlatePick =>
  ({
    capper_rank: null,
    handle: `h${o.capper_id}`,
    display_name: null,
    profile_image_url: null,
    tier: null,
    has_paid_program: false,
    kind: "straight",
    leg_count: null,
    market: null,
    selection: null,
    line: null,
    odds_taken: null,
    stake_units: 1,
    posted_at: null,
    tweet_url: null,
    source: null,
    outcome: null,
    profit_units: null,
    ...o,
  }) as SlatePick;

const TATUM = { player_id: 100, player_name: "Jayson Tatum", market: "player_prop" };
const CADE = { player_id: 200, player_name: "Cade Cunningham", market: "player_prop" };

const picks: SlatePick[] = [
  row({ capper_id: 1, handle: "alpha", market: "ml", selection: "Celtics ML", odds_taken: -130 }),
  row({ capper_id: 2, handle: "bravo", market: "ml", selection: "Boston Celtics ML", odds_taken: -120 }),
  row({ capper_id: 3, handle: "winwhenhot", market: "ml", selection: "Celtics ML", odds_taken: -125 }),
  row({ capper_id: 4, handle: "delta", market: "ml", selection: "Pistons ML", odds_taken: 110 }),
  row({ capper_id: 1, handle: "alpha", market: "spread", selection: "Detroit Pistons +1.5", line: 1.5 }),
  row({ capper_id: 2, handle: "bravo", market: "spread", selection: "Detroit Pistons +1.5", line: 1.5 }),
  row({ capper_id: 3, handle: "winwhenhot", market: "spread", selection: "Celtics -1.5", line: -1.5 }),
  row({ capper_id: 1, handle: "alpha", market: "total", selection: "Under 221.5", line: 221.5 }),
  row({ capper_id: 2, handle: "bravo", market: "total", selection: "Under 221.5", line: 221.5 }),
  row({ capper_id: 3, handle: "winwhenhot", market: "total", selection: "Under 221.5", line: 221.5 }),
  row({ capper_id: 4, handle: "delta", market: "total", selection: "Over 222.5", line: 222.5 }),
  row({ capper_id: 1, handle: "alpha", ...TATUM, selection: "Jayson Tatum TO SCORE 20+ POINTS" }),
  row({ capper_id: 2, handle: "bravo", ...TATUM, selection: "Jayson Tatum TO SCORE 20+ POINTS" }),
  row({ capper_id: 3, handle: "winwhenhot", ...TATUM, selection: "Jayson Tatum OVER 8.5 Rebounds" }),
  row({ capper_id: 1, handle: "alpha", ...TATUM, selection: "Jayson Tatum 4+ AST" }),
  row({ capper_id: 1, handle: "alpha", ...CADE, selection: "Cade Cunningham 25+ POINTS" }),
  row({ capper_id: 4, handle: "delta", ...CADE, selection: "Cade Cunningham 6+ AST" }),
  row({ capper_id: 5, handle: "echo", kind: "parlay_leg", parlay_id: 9, market: "game_prop", selection: "First to 20 BOS" }),
  row({ capper_id: 5, handle: "echo", kind: "parlay_leg", parlay_id: 9, market: "game_prop", selection: "Game goes to OT" }),
];

const game: SlateGame = {
  game_id: 1,
  away_team: "BOS",
  home_team: "DET",
  away_starter: null,
  home_starter: null,
  game_date: "2026-10-20",
  game_time: null,
  game_state: "scheduled",
  away_score: null,
  home_score: null,
  inning: null,
  inning_half: null,
  outs: null,
  sport: "NBA",
  picks,
};

const withVariants: SlateGame = {
  ...game,
  picks: [
    ...picks,
    row({ capper_id: 6, handle: "foxtrot", player_name: "J. Tatum", market: "player_prop", selection: "J. Tatum o5.5 Assists" }),
    row({ capper_id: 7, handle: "golf", player_name: "Tatum", market: "player_prop", selection: "Tatum 20+ PTS" }),
  ],
};

describe("buildNbaPanel", () => {
  it("tallies the ML split with suppressed handles counted but unnamed", () => {
    const p = buildNbaPanel(game);
    expect(p.ml).toMatchObject({ away: 3, home: 1, awayPct: 75, homePct: 25, favored: "away", medianOdds: -125 });
    expect(p.chips.handles).not.toContain("winwhenhot");
    expect(p.chips.handles).toEqual(["alpha", "bravo", "delta"]);
    expect(p.chips.more).toBe(1);
  });
  it("spread lean prints the line as taken on that side", () => {
    expect(buildNbaPanel(game).spread).toEqual({ side: "home", line: 1.5, count: 2, of: 3 });
  });
  it("total lean picks the direction with more sharps and its most common line", () => {
    expect(buildNbaPanel(game).total).toEqual({ side: "under", line: 221.5, count: 3, of: 4 });
  });
  it("players sort by distinct cappers and carry the most common bet", () => {
    const p = buildNbaPanel(game);
    const [tatum, cade] = p.players;
    expect(tatum).toMatchObject({ name: "Jayson Tatum", sharps: 3, legs: 4, topBet: "20+ PTS", team: null });
    expect(cade.name).toBe("Cade Cunningham");
    expect(p.propCount).toBe(6);
  });
  it("counts bets not rows and cappers once", () => {
    const p = buildNbaPanel(game);
    expect(p.betCount).toBe(slateBetCount(game.picks));
    expect(p.betCount).toBe(game.picks.length - 1);
    expect(p.capperCount).toBe(new Set(game.picks.map((x) => x.capper_id)).size);
  });
  it("empty markets produce null leans and null percents, never NaN", () => {
    const p = buildNbaPanel({ ...game, picks: game.picks.filter((x) => x.player_name) });
    expect(p.ml.awayPct).toBeNull();
    expect(p.ml.favored).toBeNull();
    expect(p.ml.medianOdds).toBeNull();
    expect(p.spread).toBeNull();
    expect(p.total).toBeNull();
  });
  it("groups an initial-form and a surname-only row with the full name", () => {
    expect(buildNbaPanel(withVariants).players[0]).toMatchObject({ name: "Jayson Tatum", sharps: 5 });
    expect(buildNbaPanel(withVariants).players).toHaveLength(2);
  });
  it("PROPS counts a parlay once, per player and in total", () => {
    const g: SlateGame = {
      ...game,
      picks: [
        row({ capper_id: 1, ...TATUM, kind: "parlay_leg", parlay_id: 77, selection: "Jayson Tatum 20+ PTS" }),
        row({ capper_id: 1, ...TATUM, kind: "parlay_leg", parlay_id: 77, selection: "Jayson Tatum 8+ REB" }),
        row({ capper_id: 2, ...TATUM, selection: "Jayson Tatum 4+ AST" }),
      ],
    };
    const p = buildNbaPanel(g);
    expect(p.propCount).toBe(2);
    expect(p.players[0]).toMatchObject({ name: "Jayson Tatum", bets: 2, legs: 3 });
    expect(p.propCount).toBeLessThanOrEqual(p.betCount);
  });
  it("leaves a surname that matches two players as its own row", () => {
    const g: SlateGame = {
      ...game,
      picks: [
        row({ capper_id: 1, player_id: 1, player_name: "Jabari Smith", market: "player_prop", selection: "Jabari Smith 10+ REB" }),
        row({ capper_id: 2, player_id: 2, player_name: "Jalen Smith", market: "player_prop", selection: "Jalen Smith 10+ REB" }),
        row({ capper_id: 3, player_name: "Smith", market: "player_prop", selection: "Smith 10+ REB" }),
      ],
    };
    expect(buildNbaPanel(g).players).toHaveLength(3);
  });
});

describe("displaySurname", () => {
  it("drops a generational suffix and keeps the display spelling", () => {
    expect(["Jaren Jackson Jr.", "Gary Trent Jr", "Nikola Jokić", "Tatum"].map(displaySurname)).toEqual(["Jackson", "Trent", "Jokić", "Tatum"]);
  });
});
