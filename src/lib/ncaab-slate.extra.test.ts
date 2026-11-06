import "./ncaab-teams-register";
import { describe, expect, it } from "vitest";
import { buildCard, classifyPick, orderGames } from "./ncaab-slate";
import type { SlateGame, SlatePick } from "./types";

const base = (o: Partial<SlatePick>): SlatePick => ({
  capper_id: 1, capper_rank: null, handle: "a", display_name: null, profile_image_url: null, tier: null,
  has_paid_program: false, kind: "straight", leg_count: null, market: "spread", selection: "McNeese", line: -2,
  odds_taken: -110, stake_units: 1, posted_at: null, tweet_url: null, source: null, outcome: null, profit_units: null, ...o,
});
const game = (picks: SlatePick[], o: Partial<SlateGame> = {}): SlateGame => ({
  game_id: 1, sport: "NCAAB", away_team: "MCN", home_team: "UNT", away_name: "McNeese", home_name: "North Texas",
  away_starter: null, home_starter: null, game_date: "2026-11-05", game_time: "2026-11-05T22:00:00Z",
  game_state: "scheduled", away_score: null, home_score: null, inning: null, inning_half: null, outs: null,
  market: { spread_home: 2, total: 139, source: "pinnacle_close" }, picks, ...o,
});

describe("platform market vocabulary", () => {
  const g = game([]);
  it("accepts first_half_*, win and team_points, keeping 1h_*/team_total as aliases", () => {
    expect(classifyPick(base({ market: "first_half_spread" }), g)).toMatchObject({ group: "1H SPREAD", side: "away" });
    expect(classifyPick(base({ market: "first_half_total", selection: "Under 70" }), g)).toMatchObject({ group: "1H TOTAL", side: "under" });
    expect(classifyPick(base({ market: "first_half_win", selection: "North Texas" }), g)).toMatchObject({ group: "1H ML", side: "home" });
    expect(classifyPick(base({ market: "win", selection: "McNeese" }), g)).toMatchObject({ group: "ML", side: "away" });
    expect(classifyPick(base({ market: "team_points", selection: "UNT Over 70.5" }), g)).toMatchObject({ group: "TEAM TOTAL", side: "over" });
    expect(classifyPick(base({ market: "first_half_team_points", selection: "UNT Over 30.5" }), g).group).toBe("TEAM TOTAL");
    expect(classifyPick(base({ market: "1h_spread" }), g).group).toBe("1H SPREAD");
    expect(classifyPick(base({ market: "team_total", selection: "UNT Over 70.5" }), g).group).toBe("TEAM TOTAL");
  });

  it("accepts the display_market strings and keeps game_prop out of the full-game counts", () => {
    expect(classifyPick(base({ market: "ML", selection: "McNeese" }), g)).toMatchObject({ group: "ML", side: "away" });
    expect(classifyPick(base({ market: "1h_ml", selection: "McNeese" }), g)).toMatchObject({ group: "1H ML", side: "away" });
    const c = buildCard(game([base({ market: "game_prop", selection: "McNeese to lead at half", line: -3 })]));
    expect(c.spread.left.n + c.spread.right.n + c.total.left.n + c.total.right.n).toBe(0);
    expect(c.rows[0].group).toBe("OTHER");
  });

  it("first-half picks never feed full-game counts or the fallback line", () => {
    const c = buildCard(game([
      base({ capper_id: 1, market: "first_half_spread", selection: "MCN", line: -9 }),
      base({ capper_id: 2, market: "first_half_total", selection: "Over 70", line: 70 }),
    ], { market: null }));
    expect(c.spread.left).toMatchObject({ n: 0, text: "MCN", note: "no line" });
    expect(c.total.left).toMatchObject({ n: 0, text: "Over", note: "no line" });
    expect(c.chips).toEqual(["2 1H"]);
  });
});

describe("stat_name first classification", () => {
  const g = game([]);
  it("prefers stat_name over market and keeps unknown stats in OTHER", () => {
    expect(classifyPick(base({ stat_name: "first_half_spread", market: "spread" }), g).group).toBe("1H SPREAD");
    expect(classifyPick(base({ stat_name: "team_points", market: "total", selection: "UNT Under 70", direction: "under" }), g)).toMatchObject({ group: "TEAM TOTAL", side: "under" });
    expect(classifyPick(base({ stat_name: "total", market: "total", selection: "139", direction: "over" }), g)).toMatchObject({ group: "TOTAL", side: "over" });
    expect(classifyPick(base({ stat_name: "second_half_spread", market: "spread" }), g).group).toBe("OTHER");
    expect(classifyPick(base({ stat_name: "game_prop", market: "game_prop" }), g).group).toBe("OTHER");
  });

  it("keeps game_prop and 2H out of the full-game counts", () => {
    const c = buildCard(game([
      base({ stat_name: null, market: "game_prop", selection: "McNeese -3" }),
      base({ stat_name: null, market: null, selection: "McNeese 2H -3" }),
      base({ stat_name: "second_half_total", market: "total", selection: "Over 70" }),
    ]));
    expect(c.spread.left.n + c.spread.right.n + c.total.left.n + c.total.right.n).toBe(0);
    expect(c.rows.every((r) => r.group === "OTHER")).toBe(true);
  });

  it("falls back to the selection text with no stat_name or market", () => {
    expect(classifyPick(base({ market: null, selection: "North Texas +2" }), g)).toMatchObject({ group: "SPREAD", side: "home" });
  });
});

describe("abbreviation versus school name", () => {
  const cases: Array<[string, string, string, string, string, string]> = [
    ["IOWA", "ISU", "Iowa", "Iowa State", "Iowa State -3", "Iowa -3"],
    ["UTAH", "USU", "Utah", "Utah State", "Utah State +4", "Utah +4"],
    ["OHIO", "OSU", "Ohio", "Ohio State", "Ohio State -5", "Ohio -5"],
    ["MICH", "MSU", "Michigan", "Michigan State", "Michigan State -2", "Michigan -2"],
    ["WASH", "WSU", "Washington", "Washington State", "Washington State +1", "Washington +1"],
    ["PENN", "PSU", "Penn", "Penn State", "Penn State -6", "Penn -6"],
  ];
  it.each(cases)("%s @ %s resolves the longer school name", (a, h, an, hn, longer, shorter) => {
    const g = game([], { away_team: a, home_team: h, away_name: an, home_name: hn });
    expect(classifyPick(base({ selection: longer }), g).side).toBe("home");
    expect(classifyPick(base({ selection: shorter }), g).side).toBe("away");
  });

  it("abbreviation hits are case-sensitive whole words", () => {
    const g = game([], { away_team: "IOWA", home_team: "ISU", away_name: "Iowa", home_name: "Iowa State" });
    expect(classifyPick(base({ selection: "ISU -3" }), g).side).toBe("home");
    expect(classifyPick(base({ selection: "IOWA +3" }), g).side).toBe("away");
  });

  it("strips apostrophes and periods and folds saint and mount", () => {
    const sj = game([], { away_team: "SJU", home_team: "VILL", away_name: "St. John’s", home_name: "Villanova" });
    expect(classifyPick(base({ selection: "St Johns +4" }), sj).side).toBe("away");
    const sm = game([], { away_team: "SMC", home_team: "GONZ", away_name: "Saint Mary's", home_name: "Gonzaga" });
    expect(classifyPick(base({ selection: "Saint Marys +9" }), sm).side).toBe("away");
    expect(classifyPick(base({ selection: "St Marys +9" }), sm).side).toBe("away");
    const ms = game([], { away_team: "MSM", home_team: "SJU", away_name: "Mount St. Mary's", home_name: "St. John's" });
    expect(classifyPick(base({ selection: "Mount St Marys +20" }), ms).side).toBe("away");
  });

  it("knows common nicknames", () => {
    const side = (a: string, h: string, sel: string) =>
      classifyPick(base({ selection: sel }), game([], { away_team: a, home_team: h, away_name: null, home_name: null })).side;
    expect(side("CONN", "MARQ", "UConn -3")).toBe("away");
    expect(side("GONZ", "MARQ", "Zags -3")).toBe("away");
    expect(side("VILL", "MARQ", "Nova -3")).toBe("away");
    expect(side("MISS", "MARQ", "Ole Miss -3")).toBe("away");
    expect(side("PITT", "MARQ", "Pitt -3")).toBe("away");
    expect(side("UCF", "MARQ", "UCF -3")).toBe("away");
    expect(side("MARQ", "UNC", "UNC -3")).toBe("home");
  });
});

describe("line mirroring, tiebreaks and order", () => {
  it("mirrors the line of the side with more takers onto the other side", () => {
    const c = buildCard(game([
      base({ capper_id: 1, selection: "MCN", line: -4 }),
      base({ capper_id: 2, selection: "MCN", line: -4 }),
      base({ capper_id: 3, selection: "UNT", line: 3.5 }),
      base({ capper_id: 4, market: "total", selection: "Under 141", line: 141 }),
    ], { market: null }));
    expect(c.spread.left.text).toBe("MCN -4");
    expect(c.spread.right.text).toBe("UNT +4");
    expect(c.total.right.text).toBe("Under 141");
    expect(c.total.left.text).toBe("Over 141");
  });

  it("shows a muted no-line note only when no line exists anywhere", () => {
    const c = buildCard(game([base({ capper_id: 1, selection: "MCN", line: null, market: "ml" })], { market: null }));
    expect(c.spread.right).toMatchObject({ text: "UNT", note: "no line" });
    expect(c.total.left).toMatchObject({ text: "Over", note: "no line" });
  });

  it("biggest bet ties go to the earliest post", () => {
    const c = buildCard(game([
      base({ capper_id: 1, handle: "late", stake_units: 3, posted_at: "2026-11-05T18:00:00Z" }),
      base({ capper_id: 2, handle: "early", stake_units: 3, posted_at: "2026-11-05T12:00:00Z" }),
    ]));
    expect(c.biggest?.who).toBe("@early");
  });

  it("puts finals after live and upcoming games, then orders by sharps", () => {
    const fin = game([base({ capper_id: 1 }), base({ capper_id: 2 }), base({ capper_id: 3 })], { game_id: 1, game_state: "final" });
    const live = game([base({ capper_id: 1 })], { game_id: 2, game_state: "in_progress" });
    const soon = game([base({ capper_id: 1 }), base({ capper_id: 2 })], { game_id: 3 });
    expect(orderGames([fin, live, soon]).map((g) => g.game_id)).toEqual([3, 2, 1]);
  });
});
