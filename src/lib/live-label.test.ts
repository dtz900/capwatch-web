import { describe, expect, it } from "vitest";
import { liveLabel } from "./live-label";

describe("liveLabel (MLB)", () => {
  it("reads the inning", () => {
    expect(liveLabel({ sport: "MLB", inning: 7, inning_half: "bot" })).toBe("BOT 7");
  });
  it("falls back to LIVE with no inning", () => {
    expect(liveLabel({ sport: "MLB", inning: null, inning_half: null })).toBe("LIVE");
  });
});

describe("liveLabel (NFL)", () => {
  it("reads quarter and clock", () => {
    expect(liveLabel({ sport: "NFL", period: 2, clock: "8:01", status_name: "STATUS_IN_PROGRESS" })).toBe("Q2 · 8:01");
  });
  it("reads halftime", () => {
    expect(liveLabel({ sport: "NFL", period: 2, clock: "0:00", status_name: "STATUS_HALFTIME" })).toBe("HALF");
  });
});

describe("liveLabel (NBA)", () => {
  const nba = (period: number | null, clock: string | null, status_name: string | null) =>
    liveLabel({ sport: "NBA", period, clock, status_name, inning: null, inning_half: null });

  it("reads quarter and clock", () => {
    expect(nba(3, "4:12", "STATUS_IN_PROGRESS")).toBe("Q3 · 4:12");
  });
  it("reads halftime", () => {
    expect(nba(2, "0.0", "STATUS_HALFTIME")).toBe("HALF");
  });
  it("reads the end of a quarter", () => {
    expect(nba(1, "0.0", "STATUS_END_PERIOD")).toBe("END Q1");
  });
  it("reads overtimes from period 5 up", () => {
    expect(nba(5, "2:30", "STATUS_IN_PROGRESS")).toBe("OT · 2:30");
    expect(nba(6, "1:00", "STATUS_IN_PROGRESS")).toBe("2OT · 1:00");
    expect(nba(7, null, "STATUS_IN_PROGRESS")).toBe("3OT");
    expect(nba(5, "0.0", "STATUS_END_PERIOD")).toBe("END OT");
  });
  it("reads delays and postponements", () => {
    expect(nba(2, "5:00", "STATUS_DELAYED")).toBe("DELAY");
    expect(nba(null, null, "STATUS_POSTPONED")).toBe("PPD");
  });
  it("falls back to LIVE with no period yet", () => {
    expect(nba(null, null, "STATUS_IN_PROGRESS")).toBe("LIVE");
    expect(nba(0, null, null)).toBe("LIVE");
  });
});
