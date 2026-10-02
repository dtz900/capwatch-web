import { describe, expect, it } from "vitest";
import { awardHeadline } from "./awards";

describe("awardHeadline", () => {
  it("keeps MLB Capper on straights awards before the combined-sports month", () => {
    expect(awardHeadline({ category: "straights", month: "2026-08" })).toBe("MLB Capper");
  });
  it("drops the sport on straights awards from September 2026", () => {
    expect(awardHeadline({ category: "straights", month: "2026-09" })).toBe("Straight Bet Capper");
    expect(awardHeadline({ category: "straights", month: "2026-10" })).toBe("Straight Bet Capper");
  });
  it("leaves the moneyline headline alone", () => {
    expect(awardHeadline({ category: "ml", month: "2026-09" })).toBe("Moneyline Capper");
  });
});
