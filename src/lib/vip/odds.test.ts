import { describe, expect, it } from "vitest";
import { americanToDecimal, decimalToAmerican, parlayTicketOdds } from "./odds";

const leg = (i: number, odds: number | null) => ({ parlay_leg_index: i, odds_taken: odds });

describe("parlayTicketOdds", () => {
  it("uses the combined price when only leg 0 is priced", () => {
    expect(parlayTicketOdds([leg(0, 595), leg(1, null), leg(2, null)])).toBe(595);
  });

  it("multiplies per-leg prices into a ticket price", () => {
    // -110 x -110 = 1.909 x 1.909 = 3.645 -> +264
    expect(parlayTicketOdds([leg(0, -110), leg(1, -110)])).toBe(264);
    // +150 x -200 = 2.5 x 1.5 = 3.75 -> +275
    expect(parlayTicketOdds([leg(1, -200), leg(0, 150)])).toBe(275);
  });

  it("follows the market when a leg is unpriced", () => {
    expect(parlayTicketOdds([leg(0, -110), leg(1, null), leg(2, -120)])).toBeNull();
    expect(parlayTicketOdds([leg(0, null), leg(1, null)])).toBeNull();
    expect(parlayTicketOdds([])).toBeNull();
  });

  it("round-trips American odds through decimal", () => {
    for (const o of [-250, -110, -101, 100, 135, 595]) {
      expect(decimalToAmerican(americanToDecimal(o))).toBe(o);
    }
  });
});
