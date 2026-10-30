import { describe, expect, it } from "vitest";
import { vipSelection } from "./describe";

describe("vipSelection", () => {
  it("adds the side to a composer team total", () => {
    expect(vipSelection({ selection: "Lakers", direction: "over", line: 112.5 })).toBe("Lakers Over");
    expect(vipSelection({ selection: "Lakers", direction: "under", line: 112.5 })).toBe("Lakers Under");
  });

  it("leaves selections that already carry a side", () => {
    expect(vipSelection({ selection: "Cavs TT U120.5", direction: "under", line: 120.5 })).toBe("Cavs TT U120.5");
    expect(vipSelection({ selection: "Packers Under 26.5", direction: "under", line: 26.5 })).toBe("Packers Under 26.5");
  });

  it("ignores spreads and moneylines", () => {
    expect(vipSelection({ selection: "Lakers -3", direction: "home", line: -3 })).toBe("Lakers -3");
    expect(vipSelection({ selection: "Lakers", direction: null, line: null })).toBe("Lakers");
  });
});
