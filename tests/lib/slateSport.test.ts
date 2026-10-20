import { describe, it, expect } from "vitest";
import { DEFAULT_SLATE_SPORT, parseSlateSport, slateSportParam } from "@/lib/slate-sport";

describe("slate sport URL param", () => {
  it("opens a bare /slate to the NBA board", () => {
    expect(DEFAULT_SLATE_SPORT).toBe("nba");
    expect(parseSlateSport(undefined)).toBe("nba");
    expect(parseSlateSport("")).toBe("nba");
    expect(parseSlateSport("xfl")).toBe("nba");
  });

  it("keeps every explicit league, MLB included", () => {
    expect(parseSlateSport("mlb")).toBe("mlb");
    expect(parseSlateSport("nfl")).toBe("nfl");
    expect(parseSlateSport("nba")).toBe("nba");
  });

  it("writes the param for every league except the default", () => {
    expect(slateSportParam("nba")).toBeUndefined();
    expect(slateSportParam("mlb")).toBe("mlb");
    expect(slateSportParam("nfl")).toBe("nfl");
  });
});
