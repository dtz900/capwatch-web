import { describe, expect, it } from "vitest";
import { activeRound, roundDaysToFetch, roundsFromSchedule } from "./postseason";

// Shape of MLB's 2026 postseason schedule on 10/1: the AL Wild Card
// sweeps already removed their Game 3s; Division Series and later still
// carry "if necessary" dates.
const games = [
  { gameType: "F", officialDate: "2026-09-29", status: { detailedState: "Final" } },
  { gameType: "F", officialDate: "2026-09-30", status: { detailedState: "Final" } },
  { gameType: "F", officialDate: "2026-10-01", status: { detailedState: "Final" } },
  { gameType: "D", officialDate: "2026-10-03", status: { detailedState: "Scheduled" } },
  { gameType: "D", officialDate: "2026-10-10", status: { detailedState: "Scheduled" } },
  { gameType: "L", officialDate: "2026-10-11", status: { detailedState: "Scheduled" } },
  { gameType: "L", officialDate: "2026-10-20", status: { detailedState: "Scheduled" } },
  { gameType: "W", officialDate: "2026-10-23", status: { detailedState: "Scheduled" } },
  { gameType: "W", officialDate: "2026-11-02", status: { detailedState: "Cancelled" } },
];

describe("postseason rounds", () => {
  const rounds = roundsFromSchedule(games);

  it("spans each round from its first to last game, ignoring cancelled games", () => {
    expect(rounds.map((r) => [r.label, r.start, r.end])).toEqual([
      ["Wild Card Series", "2026-09-29", "2026-10-01"],
      ["Division Series", "2026-10-03", "2026-10-10"],
      ["Championship Series", "2026-10-11", "2026-10-20"],
      ["World Series", "2026-10-23", "2026-10-23"],
    ]);
  });

  it("keeps a round's board up until the next round's first game", () => {
    expect(activeRound(rounds, "2026-09-28")).toBeNull();
    expect(activeRound(rounds, "2026-10-01")?.label).toBe("Wild Card Series");
    expect(activeRound(rounds, "2026-10-02")?.label).toBe("Wild Card Series");
    expect(activeRound(rounds, "2026-10-03")?.label).toBe("Division Series");
    expect(activeRound(rounds, "2026-10-11")?.label).toBe("Championship Series");
    expect(activeRound(rounds, "2026-11-15")?.label).toBe("World Series");
  });

  it("fetches round days only through today's slate day", () => {
    const wc = rounds[0];
    expect(roundDaysToFetch(wc, "2026-10-02")).toEqual(["2026-09-29", "2026-09-30", "2026-10-01"]);
    const ds = rounds[1];
    expect(roundDaysToFetch(ds, "2026-10-04")).toEqual(["2026-10-03", "2026-10-04"]);
    expect(roundDaysToFetch(ds, "2026-10-02")).toEqual([]);
  });
});
