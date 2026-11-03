import { describe, expect, it } from "vitest";
import { isCapperView, viewFromDefault } from "./capperView";

const dv = { sport: "nba" as const, window: "season" as const };

describe("viewFromDefault", () => {
  it("fills both parts on a bare URL", () => {
    expect(viewFromDefault({ hasRange: false }, dv)).toEqual({ sport: "nba", window: "season" });
  });

  it("never overrides an explicit sport or window", () => {
    expect(viewFromDefault({ sport: "all", window: "last_7", hasRange: false }, dv)).toEqual({
      sport: null,
      window: null,
    });
  });

  it("fills only the part the URL leaves out", () => {
    expect(viewFromDefault({ sport: "mlb", hasRange: false }, dv)).toEqual({ sport: null, window: "season" });
  });

  it("a date range keeps the default window out", () => {
    expect(viewFromDefault({ hasRange: true }, dv)).toEqual({ sport: "nba", window: null });
  });

  it("no default changes nothing", () => {
    expect(viewFromDefault({ hasRange: false }, null)).toEqual({ sport: null, window: null });
  });
});

describe("isCapperView", () => {
  it("matches the chosen sport and window", () => {
    expect(isCapperView(dv, "nba", "season", false)).toBe(true);
    expect(isCapperView(dv, "all", "season", false)).toBe(false);
    expect(isCapperView(dv, "nba", "last_7", false)).toBe(false);
  });

  it("a missing part means the site default", () => {
    expect(isCapperView({ sport: "nba", window: null }, "nba", "season", false)).toBe(true);
  });

  it("never in range mode or without a default", () => {
    expect(isCapperView(dv, "nba", "season", true)).toBe(false);
    expect(isCapperView(null, "nba", "season", false)).toBe(false);
  });
});
