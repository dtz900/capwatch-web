import { describe, expect, it } from "vitest";
import { feedsConsensusOdds, isAmericanOdds, medianInt } from "./slate-consensus";

// NE @ SEA, Week 1 2026: the SEA moneyline rows on the slate.
const SEA_ML = [
  { kind: "parlay_leg", odds_taken: 775 },
  { kind: "parlay_leg", odds_taken: 200 },
  { kind: "parlay_leg", odds_taken: 419 },
  { kind: "parlay_leg", odds_taken: 419 },
  { kind: "parlay_leg", odds_taken: 943737 },
  { kind: "parlay_leg", odds_taken: 1994 },
  { kind: "parlay_leg", odds_taken: null },
  { kind: "straight", odds_taken: -165 },
  { kind: "straight", odds_taken: -160 },
  { kind: "straight", odds_taken: null },
] as const;

describe("consensus odds on the slate card", () => {
  it("prices a side from straights only", () => {
    const priced = SEA_ML.filter(feedsConsensusOdds).map((p) => p.odds_taken as number);
    expect(priced).toEqual([-165, -160]);
    expect(medianInt(priced)).toBe(-162);
  });

  it("would have printed +419 with parlay legs included", () => {
    const all = SEA_ML.filter((p) => isAmericanOdds(p.odds_taken)).map((p) => p.odds_taken as number);
    expect(medianInt(all)).toBe(419);
  });

  it("hides the figure when only parlay legs price a side", () => {
    const priced = SEA_ML.filter((p) => p.kind === "parlay_leg")
      .filter(feedsConsensusOdds)
      .map((p) => p.odds_taken as number);
    expect(medianInt(priced)).toBeNull();
  });

  it("still rejects mis-stored values", () => {
    expect(isAmericanOdds(1.65)).toBe(false);
    expect(isAmericanOdds(-99)).toBe(false);
    expect(isAmericanOdds(-110)).toBe(true);
    expect(feedsConsensusOdds({ kind: "straight", odds_taken: 3.5 })).toBe(false);
  });
});
