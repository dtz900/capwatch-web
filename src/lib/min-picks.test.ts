import { describe, expect, it } from "vitest";
import { minPicksForWindow } from "./api";

describe("ranking floor per sport", () => {
  it("keeps the MLB floors", () => {
    expect(minPicksForWindow("last_7")).toBe(5);
    expect(minPicksForWindow("last_30")).toBe(10);
    expect(minPicksForWindow("season", "mlb")).toBe(10);
    expect(minPicksForWindow("all_time", "all")).toBe(10);
  });

  it("ranks every capper with a graded NFL pick", () => {
    expect(minPicksForWindow("last_7", "nfl")).toBe(1);
    expect(minPicksForWindow("last_30", "nfl")).toBe(1);
    expect(minPicksForWindow("season", "nfl")).toBe(1);
  });
});
