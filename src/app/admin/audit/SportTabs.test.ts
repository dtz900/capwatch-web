import { describe, expect, it } from "vitest";
import { orderSportTabs } from "./SportTabs";

describe("orderSportTabs", () => {
  it("puts All first, then sports by count desc, ties in ADMIN_SPORTS order", () => {
    expect(orderSportTabs({ NBA: 2, NCAAB: 2, NFL: 0, MLB: 0 })).toEqual([
      "All",
      "NBA",
      "NCAAB",
      "MLB",
      "NFL",
    ]);
  });
  it("treats a missing by_sport as all zero in ADMIN_SPORTS order", () => {
    expect(orderSportTabs(undefined)).toEqual(["All", "MLB", "NFL", "NBA", "NCAAB"]);
  });
  it("ranks a bigger count ahead of ADMIN_SPORTS order", () => {
    expect(orderSportTabs({ NCAAB: 5, MLB: 1 })[1]).toBe("NCAAB");
  });
});
