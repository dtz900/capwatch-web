import { describe, it, expect } from "vitest";
import { followScopeForMarket } from "@/lib/followScope";

/* The scope values must be outputs of the backend bucket() vocabulary
 * (core/market_edges.py) or the tailed scope will never match a pick's
 * market_group on My Tails. */
describe("followScopeForMarket", () => {
  it("maps game markets to their coarse follow scopes", () => {
    expect(followScopeForMarket("ml")).toBe("ML");
    expect(followScopeForMarket("ML")).toBe("ML");
    expect(followScopeForMarket("spread")).toBe("Spread");
    expect(followScopeForMarket("run_line")).toBe("Spread");
    expect(followScopeForMarket("total")).toBe("Game Total");
    expect(followScopeForMarket("team_total")).toBe("Team Total");
  });

  it("maps every first-5 game market into the First5 scope", () => {
    expect(followScopeForMarket("f5_ml")).toBe("First5");
    expect(followScopeForMarket("f5_spread")).toBe("First5");
    expect(followScopeForMarket("f5_total")).toBe("First5");
    expect(followScopeForMarket("first_5")).toBe("First5");
  });

  it("maps named props to their own scopes and the rest to Other Prop", () => {
    expect(followScopeForMarket("prop_batter_hrr")).toBe("HRR");
    expect(followScopeForMarket("prop_batter_tb")).toBe("Total Bases");
    expect(followScopeForMarket("prop_pitcher_k")).toBe("Strikeouts");
    expect(followScopeForMarket("prop_batter_hr")).toBe("Home Runs");
    expect(followScopeForMarket("prop_batter_h")).toBe("Other Prop");
    expect(followScopeForMarket("prop_pitcher_outs")).toBe("Other Prop");
    expect(followScopeForMarket("player_prop")).toBe("Other Prop");
  });

  it("returns null for markets that bucket to Other server-side", () => {
    expect(followScopeForMarket("nrfi")).toBeNull();
    expect(followScopeForMarket("yrfi")).toBeNull();
    expect(followScopeForMarket("game_prop")).toBeNull();
    expect(followScopeForMarket("mystery_market")).toBeNull();
  });
});
