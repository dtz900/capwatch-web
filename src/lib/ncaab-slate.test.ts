import { describe, expect, it } from "vitest";
import { NCAAB_FIXTURE_GAMES } from "@/app/dev/ncaab-slate/fixture";
import { buildCard, classifyPick, fmtLine, orderGames, splitBoard, tallySides } from "./ncaab-slate";
import { formatPickText } from "./bet-format";
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

describe("sides and sharps", () => {
  it("counts distinct cappers per side and picks the lead", () => {
    const c = buildCard(game([
      base({ capper_id: 1 }), base({ capper_id: 1, selection: "MCN" }), base({ capper_id: 2 }),
      base({ capper_id: 3, selection: "North Texas", line: 2 }),
    ]));
    expect(c.spread.left).toMatchObject({ n: 2, lead: true, text: "MCN -2" });
    expect(c.spread.right).toMatchObject({ n: 1, lead: false, text: "UNT +2" });
  });

  it("ties make both sides lead, zero picks make neither", () => {
    expect(tallySides({ left: 2, right: 2 })).toEqual({ left: { n: 2, lead: true }, right: { n: 2, lead: true } });
    expect(tallySides({ left: 0, right: 0 })).toEqual({ left: { n: 0, lead: false }, right: { n: 0, lead: false } });
    const c = buildCard(game([]));
    expect(c.cappers).toBe(0);
    expect(c.rows).toEqual([]);
    expect(c.biggest).toBeNull();
  });

  it("totals split over and under at the market line", () => {
    const c = buildCard(game([
      base({ capper_id: 1, market: "total", selection: "Over 139.5" }),
      base({ capper_id: 2, market: "total", selection: "Under 139" }),
      base({ capper_id: 3, market: "total", selection: "Under 140" }),
    ]));
    expect(c.total.left).toMatchObject({ n: 1, text: "Over 139", lead: false });
    expect(c.total.right).toMatchObject({ n: 2, text: "Under 139", lead: true });
  });

  it("parlay legs count as sharps, show PARLAY and never set the biggest bet", () => {
    const c = buildCard(game([
      base({ capper_id: 1, kind: "parlay_leg", odds_taken: null, stake_units: 9, leg_count: 3 }),
      base({ capper_id: 2, stake_units: 2 }),
    ]));
    expect(c.spread.left.n).toBe(2);
    expect(c.rows.find((r) => r.parlay)?.price).toBe("PARLAY");
    expect(c.biggest).toMatchObject({ units: "2u", who: "@a" });
  });

  it("formats the spread at the market line, pickem and no line", () => {
    expect(buildCard(game([], { market: { spread_home: 0, total: null, source: null } })).spread.left.text).toBe("MCN PK");
    expect(buildCard(game([], { market: null })).spread.right).toMatchObject({ text: "UNT", note: "no line" });
    expect(fmtLine(-3.5)).toBe("-3.5");
  });
});

describe("classification", () => {
  const g = game([]);
  it("groups markets and first halves", () => {
    expect(classifyPick(base({ market: "1h_spread" }), g).group).toBe("1H SPREAD");
    expect(classifyPick(base({ market: "1h_total", selection: "Over 70" }), g).group).toBe("1H TOTAL");
    expect(classifyPick(base({ market: "ml", selection: "North Texas ML" }), g)).toMatchObject({ group: "ML", side: "home" });
    expect(classifyPick(base({ market: "team_total", selection: "UNT Over 70.5" }), g).group).toBe("TEAM TOTAL");
    expect(classifyPick(base({ market: null, selection: "1H Over 68.5" }), g).group).toBe("1H TOTAL");
  });
  it("resolves schools by name, longest first", () => {
    const tx = game([], { away_team: "TEX", home_team: "UNT", away_name: "Texas", home_name: "North Texas" });
    expect(classifyPick(base({ selection: "North Texas +2" }), tx).side).toBe("home");
    expect(classifyPick(base({ selection: "Texas -2" }), tx).side).toBe("away");
  });
  it("renders school bet text", () => {
    expect(formatPickText({ pick: base({ selection: "North Texas", line: 2.5 }), awayTeam: "MCN", homeTeam: "UNT", sport: "NCAAB", awayName: "McNeese", homeName: "North Texas" })).toBe("UNT +2.5 -110");
    expect(formatPickText({ pick: base({ market: "1h_spread", selection: "McNeese", line: -1 }), awayTeam: "MCN", homeTeam: "UNT", sport: "NCAAB" })).toBe("1H MCN -1 -110");
  });
});

describe("biggest bet, chips and ordering", () => {
  it("takes the largest straight and counts ML / 1H / TT chips", () => {
    const c = buildCard(NCAAB_FIXTURE_GAMES[0]);
    expect(c.biggest).toMatchObject({ units: "4u", who: "@sharp_sam" });
    expect(c.chips).toEqual(["3 ML", "1 1H", "1 TT"]);
    expect(c.rows.map((r) => r.group).filter((g, i, a) => a.indexOf(g) === i)).toEqual(["SPREAD", "TOTAL", "ML", "1H SPREAD", "TEAM TOTAL"]);
  });

  it("orders by distinct cappers, then tip, then id", () => {
    const a = game([base({ capper_id: 1 })], { game_id: 3, game_time: "2026-11-05T20:00:00Z" });
    const b = game([base({ capper_id: 1 }), base({ capper_id: 2 })], { game_id: 2, game_time: "2026-11-05T23:00:00Z" });
    const c = game([base({ capper_id: 5 })], { game_id: 1, game_time: "2026-11-05T19:00:00Z" });
    expect(orderGames([a, b, c]).map((g) => g.game_id)).toEqual([2, 1, 3]);
  });

  it("splits zero-pick games out", () => {
    const { withPicks, quiet } = splitBoard(NCAAB_FIXTURE_GAMES);
    expect(quiet.length).toBe(5);
    expect(withPicks.length + quiet.length).toBe(NCAAB_FIXTURE_GAMES.length);
    expect(withPicks[0].game_id).toBe(401925031);
  });
});

describe("line fallback when the market is missing", () => {
  const noMarket = { market: null };
  it("uses the most common line the sharps took on that side", () => {
    const c = buildCard(game([
      base({ capper_id: 1, selection: "MCN", line: -4 }),
      base({ capper_id: 2, selection: "MCN", line: -4 }),
      base({ capper_id: 3, selection: "MCN", line: -3.5 }),
      base({ capper_id: 4, selection: "UNT", line: 4 }),
      base({ capper_id: 5, market: "total", selection: "Over 140.5", line: null }),
      base({ capper_id: 6, market: "total", selection: "Over 140.5", line: null }),
      base({ capper_id: 7, market: "total", selection: "Under 141", line: 141 }),
    ], noMarket));
    expect(c.spread.left.text).toBe("MCN -4");
    expect(c.spread.right.text).toBe("UNT +4");
    expect(c.total.left.text).toBe("Over 140.5");
    expect(c.total.right.text).toBe("Under 141");
    expect(c.spread.left.note).toBeUndefined();
  });

  it("falls back per field: a missing total keeps the spread market line", () => {
    const c = buildCard(game([base({ capper_id: 1, market: "total", selection: "Over 139", line: 139 })], { market: { spread_home: 2, total: null, source: null } }));
    expect(c.spread.left.text).toBe("MCN -2");
    expect(c.total.left.text).toBe("Over 139");
  });

  it("shows the side with a muted no-line note, never bare", () => {
    const c = buildCard(game([base({ capper_id: 1, selection: "MCN", line: -4 })], noMarket));
    expect(c.spread.left.text).toBe("MCN -4");
    expect(c.spread.right).toMatchObject({ text: "UNT", note: "no line" });
    expect(c.total.left).toMatchObject({ text: "Over", note: "no line" });
    expect(c.total.right).toMatchObject({ text: "Under", note: "no line" });
  });

  it("fixture PUR @ ILL labels both sides from the picks", () => {
    const pur = NCAAB_FIXTURE_GAMES.find((g) => g.away_team === "PUR")!;
    const c = buildCard(pur);
    expect(c.spread.left.text).toBe("PUR -4");
    expect(c.spread.right.text).toBe("ILL +4");
    expect(c.total.left).toMatchObject({ text: "Over", note: "no line" });
  });
});
