import { describe, expect, it } from "vitest";
import type { BoardSide, BoardSlateGame } from "@/lib/vip/types";
import { fmtPrice, parsePrice } from "./odds";
import {
  betterThanBest,
  combinedPrice,
  isSgp,
  pairKey,
  quoteAt,
  rebook,
  toPickBody,
  toggleLeg,
  unlockAt,
  type SlipLeg,
} from "./slip";

const START = "2026-10-30T23:00:00.000Z";
const GAME: BoardSlateGame = { sport: "NBA", game_id: "g1", away: "CHA", home: "WSH", commence_time: START, started: false };
const NFL: BoardSlateGame = { sport: "NFL", game_id: "n1", away: "DEN", home: "KC", commence_time: START, started: false };

function side(over: Omit<Partial<BoardSide>, "leg"> & { leg?: Partial<BoardSide["leg"]> } = {}): BoardSide {
  const { leg, ...rest } = over;
  return {
    key: "g1:Game:sp:AWAY:1", label: "CHA +1", short: "+1", price: -110,
    quotes: { fanduel: -105, draftkings: -115 }, best: -105, best_book: "fanduel",
    leg: { sport: "NBA", game_id: "g1", stat_name: "spread", selection: "CHA", line: 1,
           direction: null, player_id: null, player_name: null, ...leg },
    ...rest,
  };
}

describe("parsePrice", () => {
  it("accepts American and decimal whatever the toggle says", () => {
    expect(parsePrice("+150")).toBe(150);
    expect(parsePrice("-110")).toBe(-110);
    expect(parsePrice("2.50")).toBe(150);
    expect(parsePrice("1.91")).toBe(-110);
    expect(parsePrice("abc")).toBeNull();
    expect(parsePrice("75")).toBeNull();
  });
  it("formats both ways", () => {
    expect(fmtPrice(150, "american")).toBe("+150");
    expect(fmtPrice(-110, "decimal")).toBe("1.91");
  });
});

describe("slip", () => {
  it("quote is null for the other book and for a book that does not hang it", () => {
    expect(quoteAt(side(), "other")).toBeNull();
    expect(quoteAt(side(), "betmgm")).toBeNull();
    expect(quoteAt(side(), "fanduel")).toBe(-105);
  });

  it("tapping prefills the book price, tapping again removes", () => {
    let legs = toggleLeg([], side(), GAME, "draftkings", "american");
    expect(legs[0].price).toBe("-115");
    legs = toggleLeg(legs, side(), GAME, "draftkings", "american");
    expect(legs).toEqual([]);
  });

  it("falls back to the market price when the book does not hang the rung", () => {
    expect(toggleLeg([], side(), GAME, "betmgm", "american")[0].price).toBe("-110");
  });

  it("the other side of the same line replaces the first", () => {
    const home = side({ key: "g1:Game:sp:HOME:-1", leg: { selection: "WSH", line: -1 } });
    const legs = toggleLeg(toggleLeg([], side(), GAME, "fanduel", "american"), home, GAME, "fanduel", "american");
    expect(legs.map((l) => l.side.key)).toEqual(["g1:Game:sp:HOME:-1"]);
    expect(pairKey(side())).toBe(pairKey(home));
  });

  it("both teams' team totals can ride together", () => {
    const a = side({ key: "a", leg: { stat_name: "team_points", selection: "CHA", line: 110.5, direction: "over" } });
    const b = side({ key: "b", leg: { stat_name: "team_points", selection: "WSH", line: 110.5, direction: "over" } });
    expect(pairKey(a)).not.toBe(pairKey(b));
  });

  it("caps the slip at ten legs", () => {
    let legs: SlipLeg[] = [];
    for (let i = 0; i < 12; i++) legs = toggleLeg(legs, side({ key: `k${i}`, leg: { line: i } }), GAME, "fanduel", "american");
    expect(legs).toHaveLength(10);
  });

  it("rebook keeps a price the capper typed", () => {
    const legs: SlipLeg[] = [
      { side: side(), game: GAME, price: "+120", edited: true },
      { side: side({ key: "x" }), game: GAME, price: "-105", edited: false },
    ];
    expect(rebook(legs, "draftkings", "american").map((l) => l.price)).toEqual(["+120", "-115"]);
  });

  it("same game parlay has no combined price until typed", () => {
    const legs: SlipLeg[] = [
      { side: side(), game: GAME, price: "-110", edited: false },
      { side: side({ key: "y", leg: { stat_name: "total", line: 220.5 } }), game: GAME, price: "-110", edited: false },
    ];
    expect(isSgp(legs)).toBe(true);
    expect(combinedPrice(legs)).toBeNull();
  });

  it("multiplies a cross-game parlay", () => {
    const legs: SlipLeg[] = [
      { side: side(), game: GAME, price: "+100", edited: false },
      { side: side({ key: "z", leg: { game_id: "g2" } }), game: { ...GAME, game_id: "g2" }, price: "+100", edited: false },
    ];
    expect(combinedPrice(legs)).toBe(300);
  });

  it("flags a price better than every book", () => {
    expect(betterThanBest({ side: side(), game: GAME, price: "+150", edited: true })).toBe(-105);
    expect(betterThanBest({ side: side(), game: GAME, price: "-110", edited: false })).toBeNull();
  });
});

describe("toPickBody", () => {
  it("straight carries the leg price and the board leg", () => {
    const body = toPickBody([{ side: side(), game: GAME, price: "2.0", edited: true }], "1.5", "");
    expect(body).toEqual({ sport: "NBA", units: 1.5, combined_odds: null, legs: [{
      selection: "CHA", game_id: "g1", stat_name: "spread", line: 1, direction: null,
      player_id: null, player_name: null, odds: 100 }] });
  });

  it("multi-sport ticket sends Multi and a sport on every leg", () => {
    const nflSide = side({ key: "n", leg: { sport: "NFL", game_id: "n1", selection: "KC" } });
    const body = toPickBody([
      { side: side(), game: GAME, price: "-110", edited: false },
      { side: nflSide, game: NFL, price: "-110", edited: false },
    ], "1", "");
    expect(body.sport).toBe("Multi");
    expect(body.legs.map((l) => l.sport)).toEqual(["NBA", "NFL"]);
  });

  it("same game parlay sends the ticket price and no leg prices", () => {
    const body = toPickBody([
      { side: side(), game: GAME, price: "-110", edited: false },
      { side: side({ key: "p", leg: { stat_name: "points", selection: "LaMelo Ball", player_id: "4432816",
                                      player_name: "LaMelo Ball", line: 24.5, direction: "over" } }),
        game: GAME, price: "-115", edited: false },
    ], "1", "+450");
    expect(body.combined_odds).toBe(450);
    expect(body.legs.every((l) => l.odds == null)).toBe(true);
    expect(body.legs[1].player_id).toBe(4432816);
  });
});

describe("unlockAt", () => {
  it("is 30 minutes after the earliest start, worded by day", () => {
    const legs: SlipLeg[] = [{ side: side(), game: GAME, price: "-110", edited: false }];
    const now = new Date("2026-10-30T18:00:00.000Z");
    expect(unlockAt(legs, now, "America/Los_Angeles")).toBe("4:30 PM tonight");
    expect(unlockAt(legs, new Date("2026-10-29T18:00:00.000Z"), "America/Los_Angeles")).toBe("4:30 PM tomorrow");
    expect(unlockAt(legs, new Date("2026-10-27T18:00:00.000Z"), "America/Los_Angeles")).toBe("4:30 PM Friday");
  });
});
