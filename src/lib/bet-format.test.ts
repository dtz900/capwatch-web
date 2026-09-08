import { describe, expect, it } from "vitest";
import { formatPickText, inferMarketBucket } from "./bet-format";

const NE_SEA = { awayTeam: "NE", homeTeam: "SEA" };
const SF_LAD = { awayTeam: "SF", homeTeam: "LAD" };

describe("formatPickText: NFL spreads keep their sign", () => {
  it("resolves an NFL mascot to the game abbr and renders the signed line", () => {
    const text = formatPickText({
      pick: { selection: "Patriots +3.5", line: 3.5, odds_taken: -120 },
      ...NE_SEA,
    });
    expect(text).toBe("NE +3.5 -120");
  });

  it("renders a favorite's negative line", () => {
    const text = formatPickText({
      pick: { selection: "Seahawks -3.5", line: -3.5, odds_taken: -110 },
      ...NE_SEA,
    });
    expect(text).toBe("SEA -3.5 -110");
  });

  it("buckets a slip-image 'TEAM SPREAD' selection with no signed number in the text", () => {
    expect(inferMarketBucket(null, "New England Patriots SPREAD")).toBe("Spread");
    const text = formatPickText({
      pick: { selection: "New England Patriots SPREAD", line: 3.5, odds_taken: 212879 },
      ...NE_SEA,
    });
    expect(text).toBe("NE +3.5 +212879");
  });

  it("never drops the sign when the team cannot be resolved", () => {
    const text = formatPickText({
      pick: { selection: "Mystery Squad +3.5", line: 3.5, odds_taken: -115 },
      ...NE_SEA,
    });
    expect(text).toBe("Mystery Squad +3.5 -115");
  });

  it("resolves an NFL mascot moneyline to the abbr", () => {
    const text = formatPickText({
      pick: { selection: "Patriots ML", odds_taken: 158 },
      ...NE_SEA,
    });
    expect(text).toBe("NE ML +158");
  });
});

describe("formatPickText: MLB behaviour unchanged", () => {
  it("still resolves Giants to SF in an MLB game", () => {
    const text = formatPickText({
      pick: { selection: "Giants -1.5", line: -1.5, odds_taken: 120 },
      ...SF_LAD,
    });
    expect(text).toBe("SF -1.5 +120");
  });

  it("still resolves a mascot moneyline via the MLB alias table", () => {
    const text = formatPickText({
      pick: { selection: "Dodgers ML", odds_taken: -140 },
      ...SF_LAD,
    });
    expect(text).toBe("LAD ML -140");
  });
});
