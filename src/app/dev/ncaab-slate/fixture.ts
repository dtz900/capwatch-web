import type { SlateGame, SlatePick } from "@/lib/types";

/* Hard-coded NCAAB slate payload in the platform contract shape
   (ncaab-c4-slate-contract). Dev and test only; nothing here is real data. */

let nextCapper = 100;
const cappers = new Map<string, number>();
const capperId = (h: string) => {
  if (!cappers.has(h)) cappers.set(h, nextCapper++);
  return cappers.get(h) as number;
};

function pick(
  handle: string,
  market: string | null,
  selection: string,
  o: Partial<SlatePick> = {},
): SlatePick {
  return {
    capper_id: capperId(handle),
    capper_rank: null,
    handle,
    display_name: handle,
    profile_image_url: null,
    tier: null,
    has_paid_program: false,
    kind: "straight",
    leg_count: null,
    market,
    selection,
    line: null,
    odds_taken: -110,
    stake_units: 1,
    posted_at: null,
    tweet_url: null,
    source: null,
    outcome: null,
    profit_units: null,
    ...o,
  };
}

const leg = (handle: string, market: string, selection: string, line: number | null = null): SlatePick =>
  pick(handle, market, selection, { kind: "parlay_leg", leg_count: 3, line, odds_taken: null, stake_units: 0.5 });

function game(
  id: number,
  away: string,
  home: string,
  awayName: string,
  homeName: string,
  tipUtc: string,
  market: SlateGame["market"],
  picks: SlatePick[],
  o: Partial<SlateGame> = {},
): SlateGame {
  return {
    game_id: id,
    sport: "NCAAB",
    away_team: away,
    home_team: home,
    away_name: awayName,
    home_name: homeName,
    away_starter: null,
    home_starter: null,
    game_date: "2026-11-05",
    game_time: tipUtc,
    game_state: "scheduled",
    away_score: null,
    home_score: null,
    inning: null,
    inning_half: null,
    outs: null,
    market,
    picks,
    ...o,
  };
}

const pin = (spread_home: number | null, total: number | null) => ({
  spread_home,
  total,
  source: "pinnacle_close" as const,
});

export const NCAAB_FIXTURE_GAMES: SlateGame[] = [
  game(401925031, "MCN", "UNT", "McNeese", "North Texas", "2026-11-05T22:00:00Z", pin(2, 139), [
    pick("dai_bets", "spread", "North Texas", { line: 2.5, stake_units: 2 }),
    pick("dbunk_picks", "spread", "McNeese", { line: -1.5 }),
    pick("sharp_sam", "spread", "MCN", { line: -2, stake_units: 4 }),
    pick("hoops_hawk", "spread", "McNeese", { line: -2 }),
    pick("net_cutter", "spread", "UNT", { line: 2 }),
    pick("under_dog", "total", "Under 139.5"),
    pick("fade_fred", "total", "Under 140", { stake_units: 1.5 }),
    pick("dai_bets", "ml", "North Texas", { odds_taken: 105 }),
    pick("sharp_sam", "ml", "McNeese", { odds_taken: -125 }),
    pick("hoops_hawk", "1h_spread", "McNeese", { line: -1 }),
    pick("net_cutter", "team_total", "UNT Over 70.5"),
    leg("dbunk_picks", "spread", "McNeese", -1.5),
    leg("under_dog", "ml", "North Texas"),
    pick("late_lou", "spread", "McNeese", { line: -2.5, odds_taken: null }),
  ]),
  game(401909726, "UK", "DUKE", "Kentucky", "Duke", "2026-11-05T23:30:00Z", pin(-3.5, 156.5), [
    pick("sharp_sam", "spread", "Duke", { line: -3.5, stake_units: 3 }),
    pick("hoops_hawk", "spread", "Kentucky", { line: 3.5 }),
    pick("net_cutter", "total", "Over 156.5"),
    pick("under_dog", "total", "Under 156.5"),
    pick("late_lou", "1h_total", "1H Over 74.5"),
  ]),
  game(401909501, "KU", "UNC", "Kansas", "North Carolina", "2026-11-06T01:00:00Z", pin(1.5, 148), [
    pick("dai_bets", "ml", "Kansas ML", { odds_taken: -120, stake_units: 5 }),
    pick("fade_fred", "spread", "UNC", { line: 1.5 }),
    pick("sharp_sam", "total", "Under 148"),
  ]),
  game(401913526, "PUR", "ILL", "Purdue", "Illinois", "2026-11-06T00:00:00Z", pin(null, null), [
    pick("hoops_hawk", "spread", "Purdue", { line: -4 }),
    pick("net_cutter", "spread", "Illinois", { line: 4 }),
  ]),
  game(401909739, "CONN", "HOU", "UConn", "Houston", "2026-11-05T21:00:00Z", pin(-1, 134.5), [
    pick("sharp_sam", "spread", "Houston", { line: -1, stake_units: 2 }),
    pick("under_dog", "total", "Over 134.5"),
  ], { game_state: "in_progress", period: 1, clock: "12:34", status_name: "STATUS_IN_PROGRESS", away_score: 18, home_score: 22 }),
  game(401924733, "ARIZ", "GONZ", "Arizona", "Gonzaga", "2026-11-05T19:00:00Z", pin(2.5, 161), [
    pick("late_lou", "spread", "Arizona", { line: -2.5, outcome: "W", profit_units: 0.91 }),
    pick("fade_fred", "total", "Over 161", { outcome: "L", profit_units: -1 }),
  ], { game_state: "final", period: 2, clock: "0.0", status_name: "STATUS_FINAL", away_score: 84, home_score: 77 }),
  game(401909563, "TENN", "ALA", "Tennessee", "Alabama", "2026-11-06T02:30:00Z", pin(-5, 150.5), [
    pick("dai_bets", "ml", "Tennessee ML", { odds_taken: 180 }),
  ]),
  game(401921698, "BAY", "ISU", "Baylor", "Iowa State", "2026-11-06T01:30:00Z", pin(-2, 142), [
    pick("hoops_hawk", "team_total", "Baylor Under 70.5"),
    pick("net_cutter", "team_total", "ISU Over 71.5"),
    pick("sharp_sam", "1h_ml", "Baylor ML", { odds_taken: -105 }),
  ]),
  // Zero-pick games collapse into the "+N more games" row.
  game(401926780, "MICH", "MSU", "Michigan", "Michigan State", "2026-11-06T00:00:00Z", pin(-2.5, 139), []),
  game(401917177, "UCLA", "ORE", "UCLA", "Oregon", "2026-11-06T03:00:00Z", pin(3, 145), []),
  game(401919804, "TTU", "XAV", "Texas Tech", "Xavier", "2026-11-05T23:00:00Z", pin(1, 143), []),
  game(401919823, "VILL", "CREI", "Villanova", "Creighton", "2026-11-06T00:30:00Z", pin(-1.5, 146), []),
  game(401924718, "MARQ", "SJU", "Marquette", "St. John's", "2026-11-06T01:00:00Z", pin(2, 149), []),
];
