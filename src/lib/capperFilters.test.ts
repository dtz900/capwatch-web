import { describe, it, expect } from "vitest";
import {
  buildCapperShareParams,
  formatRangeLabel,
  leagueScopedLabel,
  rangeScopeLabel,
} from "./capperFilters";

describe("buildCapperShareParams", () => {
  const base = {
    sport: "all" as const,
    window: "season" as const,
    betType: "all" as const,
    market: "",
    outcome: "",
    range: null,
  };
  it("keeps the league being viewed so the shared card matches the page", () => {
    expect(buildCapperShareParams({ ...base, sport: "nfl" }).sport).toBe("nfl");
    expect(buildCapperShareParams({ ...base, sport: "mlb" }).sport).toBe("mlb");
  });
  it("omits every param at its page default", () => {
    const out = buildCapperShareParams(base);
    expect(Object.values(out).filter((v) => v != null)).toEqual([]);
  });
  it("a market implies straights", () => {
    const out = buildCapperShareParams({ ...base, betType: "all", market: "spread" });
    expect(out.market).toBe("spread");
    expect(out.bet_type).toBe("straights");
  });
  it("a custom range replaces the window", () => {
    const out = buildCapperShareParams({
      ...base,
      window: "last_30",
      range: { start: "2026-09-21", end: "2026-09-27" },
    });
    expect(out.start).toBe("2026-09-21");
    expect(out.end).toBe("2026-09-27");
    expect(out.window).toBeUndefined();
  });
});

describe("leagueScopedLabel", () => {
  it("leads with the league when one is selected", () => {
    expect(leagueScopedLabel("nfl", "Season")).toBe("NFL · Season");
    expect(leagueScopedLabel("mlb", "Straights · Last 30")).toBe("MLB · Straights · Last 30");
  });
  it("leaves the label alone across all leagues", () => {
    expect(leagueScopedLabel("all", "Season")).toBe("Season");
  });
  it("is just the league when the label is empty", () => {
    expect(leagueScopedLabel("nfl", "")).toBe("NFL");
  });
});

describe("formatRangeLabel", () => {
  it("same month collapses the second month name", () => {
    expect(formatRangeLabel("2026-06-08", "2026-06-14")).toBe("Jun 8 - 14");
  });
  it("cross-month keeps both month names", () => {
    expect(formatRangeLabel("2026-05-28", "2026-06-03")).toBe("May 28 - Jun 3");
  });
  it("single day shows one date", () => {
    expect(formatRangeLabel("2026-06-08", "2026-06-08")).toBe("Jun 8");
  });
  it("never emits an em dash or double hyphen", () => {
    const out = formatRangeLabel("2026-05-28", "2026-06-03");
    expect(out).not.toMatch(/—|--/);
  });
});

describe("rangeScopeLabel", () => {
  it("appends bet type when not all", () => {
    expect(rangeScopeLabel("2026-06-08", "2026-06-14", "straights")).toBe("Jun 8 - 14 · Straights");
  });
  it("range only when bet type all", () => {
    expect(rangeScopeLabel("2026-06-08", "2026-06-14", "all")).toBe("Jun 8 - 14");
  });
});
