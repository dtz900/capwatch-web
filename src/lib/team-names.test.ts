import { describe, expect, it } from "vitest";
import { humanizeStat, teamDisplayName } from "./team-names";

describe("teamDisplayName", () => {
  it("returns the city and mascot for NBA", () => {
    expect(teamDisplayName("SAC", "NBA")).toBe("Sacramento Kings");
  });
  it("returns the mascot for NFL", () => {
    expect(teamDisplayName("PHI", "NFL")).toBe("Eagles");
  });
  it("falls back to the abbreviation", () => {
    expect(teamDisplayName("ZZZ", "NCAAB")).toBe("ZZZ");
    expect(teamDisplayName("NYY", "MLB")).toBe("NYY");
    expect(teamDisplayName(null, "NBA")).toBe("?");
  });
  it("does not mix leagues for a shared abbreviation", () => {
    expect(teamDisplayName("SAC", "NCAAB")).not.toBe("Sacramento Kings");
  });
});

describe("humanizeStat", () => {
  it("replaces underscores with spaces", () => {
    expect(humanizeStat("first_half_spread")).toBe("first half spread");
  });
  it("upper-cases known tokens", () => {
    expect(humanizeStat("f5_ml")).toBe("F5 ML");
    expect(humanizeStat("player_pra")).toBe("player PRA");
    expect(humanizeStat("nrfi")).toBe("NRFI");
  });
  it("keeps 3way as 3 way", () => {
    expect(humanizeStat("3way_ml")).toBe("3 way ML");
  });
});
