import { describe, expect, it } from "vitest";
import { teamQueryFromSelection } from "./teamQuery";

describe("teamQueryFromSelection", () => {
  it("strips the trailing line or ML for NCAAB", () => {
    expect(teamQueryFromSelection("Robert Morris +10", "NCAAB")).toBe("Robert Morris");
    expect(teamQueryFromSelection("Notre Dame -7.5", "NCAAB")).toBe("Notre Dame");
    expect(teamQueryFromSelection("Zags ML", "NCAAB")).toBe("Zags");
    expect(teamQueryFromSelection("TCU +7.5", "NCAAB")).toBe("TCU");
  });
  it("strips a period suffix after the line", () => {
    expect(teamQueryFromSelection("Houston -6.5 1H", "NCAAB")).toBe("Houston");
  });
  it("returns empty for null and for other sports", () => {
    expect(teamQueryFromSelection(null, "NCAAB")).toBe("");
    expect(teamQueryFromSelection("Lakers -3.5", "NBA")).toBe("");
  });
});
