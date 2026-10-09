import { describe, expect, it } from "vitest";
import { groupByCapper, groupByMarket, propPlayerName, propStat, propStatSummary, toBets } from "./slate-groups";
import type { SlatePick } from "./types";

let seq = 0;
function pick(over: Partial<SlatePick>): SlatePick {
  seq += 1;
  return {
    capper_id: seq,
    capper_rank: null,
    handle: `c${seq}`,
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
    ...over,
  };
}

describe("groupByMarket (PHI @ JAX shape)", () => {
  const picks = [
    pick({ market: "ml", selection: "JAX ML" }),
    pick({ market: "ml", selection: "PHI ML" }),
    pick({ market: "spread", selection: "PHI +6", line: 6 }),
    pick({ market: "spread", selection: "Jaguars -6", line: -6 }),
    pick({ market: "total", selection: "Over 45", line: 45 }),
    pick({ market: "total", selection: "u45", line: 45 }),
    pick({ market: "team_total", selection: "PHI over 21.5" }),
    pick({ market: "player_prop", selection: "Jalen Hurts 15+ Rushing Yards", player_name: "Jalen Hurts" }),
    pick({ market: "player_prop", selection: "J. Hurts Anytime TD" }),
    pick({ market: "player_prop", selection: "Brenton Strange 50+ Receiving Yards" }),
    pick({ market: "game_prop", selection: "First score TD" }),
  ];
  const g = groupByMarket(picks, "PHI", "JAX", "NFL");

  it("splits game lines into sides", () => {
    expect(g.ml.away.map((p) => p.selection)).toEqual(["PHI ML"]);
    expect(g.ml.home.map((p) => p.selection)).toEqual(["JAX ML"]);
    expect(g.spread.away.map((p) => p.selection)).toEqual(["PHI +6"]);
    expect(g.spread.home.map((p) => p.selection)).toEqual(["Jaguars -6"]);
    expect(g.total.over.map((p) => p.selection)).toEqual(["Over 45"]);
    expect(g.total.under.map((p) => p.selection)).toEqual(["u45"]);
  });

  it("folds props under one player and labels with the fullest name", () => {
    expect(g.players.map((x) => [x.name, x.picks.length])).toEqual([
      ["Jalen Hurts", 2],
      ["Brenton Strange", 1],
    ]);
  });

  it("leaves team totals and game props in other", () => {
    expect(g.other.map((p) => p.selection)).toEqual(["PHI over 21.5", "First score TD"]);
  });
});

describe("propPlayerName", () => {
  it("reads the name ahead of the stat", () => {
    expect(propPlayerName({ selection: "D. Prescott o33.5 Pass Att", player_name: null })).toBe("D. Prescott");
    expect(propPlayerName({ selection: "Over 45", player_name: null })).toBeNull();
  });
});

describe("groupByCapper", () => {
  it("puts ranked cappers first, then volume", () => {
    const a = pick({ capper_id: 900, capper_rank: null });
    const b1 = pick({ capper_id: 901, capper_rank: 7 });
    const b2 = pick({ capper_id: 901, capper_rank: 7 });
    const c = pick({ capper_id: 902, capper_rank: 2 });
    expect(groupByCapper([a, b1, b2, c]).map((x) => [x.capperId, x.picks.length])).toEqual([
      [902, 1],
      [901, 2],
      [900, 1],
    ]);
  });
});

describe("propStat", () => {
  it.each([
    ["RB Jaguars 60+ Rush Yards", "Rush yds"],
    ["Bhayshul Tuten 50+ Rushing Yards", "Rush yds"],
    ["C. Lamb 100+ REC YARDS", "Rec yds"],
    ["T. Hurst 20+ longest reception", "Longest"],
    ["D. Prescott o33.5 Pass Att", "Pass att"],
    ["D. Prescott 4+ rushing attempts", "Rush att"],
    ["G. Pickens 5+ Receptions", "Receptions"],
    ["Jalen Hurts Anytime TD", "TD"],
    ["Any Time Touchdown Scorer", "TD"],
    ["Parker Washington 80+ Yards", "Yards"],
    ["Cole o5.5 K", "Strikeouts"],
    ["Judge 1+ Hit", "Hits"],
    ["J. Ferguson +1300", "Other"],
  ])("%s -> %s", (sel, stat) => {
    expect(propStat(sel)).toBe(stat);
  });

  it("summarizes busiest first", () => {
    const s = propStatSummary([
      { selection: "Lamb 5+ Receptions" },
      { selection: "Lamb 6+ Receptions" },
      { selection: "Lamb 50+ Receiving Yards" },
    ]);
    expect(s).toEqual([
      { stat: "Receptions", count: 2 },
      { stat: "Rec yds", count: 1 },
    ]);
  });
});

describe("player keys", () => {
  it("joins spellings that share a player_id and splits same-initial players", () => {
    const g = groupByMarket(
      [
        pick({ market: "player_prop", selection: "P.Mahomes 250+ Passing Yards", player_name: "P.Mahomes", player_id: 1 }),
        pick({ market: "player_prop", selection: "Patrick Mahomes Anytime TD", player_name: "Patrick Mahomes", player_id: 1 }),
        pick({ market: "player_prop", selection: "J. Williams 2+ Receptions", player_name: "Jameson Williams", player_id: 2 }),
        pick({ market: "player_prop", selection: "J. Williams 50+ Rushing Yards", player_name: "Javonte Williams", player_id: 3 }),
        pick({ market: "player_prop", selection: "P. Mahomes 1+ Pass TD" }),
      ],
      "KC",
      "LV",
      "NFL",
    );
    expect(g.players.map((x) => [x.name, x.picks.length])).toEqual([
      ["Patrick Mahomes", 3],
      ["Jameson Williams", 1],
      ["Javonte Williams", 1],
    ]);
  });
});

describe("toBets", () => {
  it("counts a parlay once and grades it off the ticket profit", () => {
    const legA = pick({ capper_id: 50, kind: "parlay_leg", leg_count: 3, parlay_id: 9, outcome: "W", profit_units: -1 });
    const legB = pick({ capper_id: 50, kind: "parlay_leg", leg_count: 3, parlay_id: 9, outcome: "L", profit_units: -1 });
    const straight = pick({ capper_id: 50, outcome: "W", profit_units: 0.91 });
    expect(toBets([legA, legB, straight])).toEqual([
      { stake: 1, profit: -1, result: "L" },
      { stake: 1, profit: 0.91, result: "W" },
    ]);
  });
});
