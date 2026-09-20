import { describe, expect, it } from "vitest";
import { betLabel, topBackedPlayers, type BackedPlayer } from "./slate-players";

// IND @ KC, Week 2 2026: the player rows the slate API emits (trimmed).
type Row = Parameters<typeof topBackedPlayers>[0][number];
const row = (o: Record<string, unknown>): Row =>
  ({
    capper_id: 1,
    capper_rank: null,
    handle: "a",
    kind: "straight",
    market: "player_prop",
    selection: null,
    line: null,
    odds_taken: null,
    player_id: null,
    player_name: null,
    ...o,
  }) as unknown as Row;

const PICKS = [
  row({ capper_id: 1, handle: "b1g", player_id: 3139477, player_name: "P.Mahomes", selection: "P.Mahomes u226.5 Pass Yds" }),
  row({ capper_id: 2, handle: "chalk", player_id: 3139477, player_name: "Patrick Mahomes", selection: "Patrick Mahomes QB Under 224.5 Pass Yards" }),
  row({ capper_id: 3, handle: "winwhenhot", player_id: 3139477, player_name: "Patrick Mahomes", selection: "Patrick Mahomes Under 224.5 Passing Yards" }),
  row({ capper_id: 1, handle: "b1g", player_id: 4242335, player_name: "Jonathan Taylor", selection: "Jonathan Taylor Anytime TD Scorer", kind: "parlay_leg" }),
  row({ capper_id: 1, handle: "b1g", player_id: 4242335, player_name: "Jonathan Taylor", selection: "Jonathan Taylor Any Time Touchdown Scorer", kind: "parlay_leg" }),
  row({ capper_id: 4, handle: "dh", player_id: 4242335, player_name: "Jonathan Taylor", selection: "Jonathan Taylor O 0.5" }),
  row({ capper_id: 5, handle: "rob", player_id: 15847, player_name: "Travis Kelce", selection: "Travis Kelce TE Over 17.5 Longest Rec" }),
  row({ capper_id: 6, handle: "jas", player_id: 4428331, player_name: "Rashee Rice", selection: "Rashee Rice 50+ REC YDS" }),
  // team + game bets never carry a player
  row({ capper_id: 7, handle: "ml", market: "ML", selection: "Chiefs ML" }),
  row({ capper_id: 8, handle: "sp", market: "spread", selection: "Colts +6.5" }),
];

describe("topBackedPlayers", () => {
  it("ranks by distinct sharps, then legs, capped at n", () => {
    const out = topBackedPlayers(PICKS, 3);
    expect(out.map((p: BackedPlayer) => [p.name, p.sharps, p.legs])).toEqual([
      ["Patrick Mahomes", 3, 3],
      ["Jonathan Taylor", 2, 3],
      ["Rashee Rice", 1, 1], // 1-sharp tie with Kelce breaks on name
    ]);
  });

  it("uses the longest stored spelling of the player's name", () => {
    const [mahomes] = topBackedPlayers(PICKS, 1);
    expect(mahomes.name).toBe("Patrick Mahomes");
  });

  it("names handles in first-seen order and keeps suppressed handles anonymous", () => {
    const [mahomes] = topBackedPlayers(PICKS, 1);
    expect(mahomes.handles).toEqual(["b1g", "chalk"]);
    expect(mahomes.sharps).toBe(3);
  });

  it("states the lean as distinct cappers against the tile's sharp count", () => {
    const [mahomes, taylor] = topBackedPlayers(PICKS, 2);
    expect(mahomes.lean).toBe("2 of 3 on Under 224.5 Passing Yards");
    // Taylor's two Anytime TD rows are one capper (straight + parlay leg), so
    // no count is claimed.
    expect(taylor.lean).toBe("Anytime TD");
  });

  it("says 'all N' when every sharp on the player holds the same bet", () => {
    const rows = [
      row({ capper_id: 1, handle: "a", player_id: 9, player_name: "CeeDee Lamb", selection: "CeeDee Lamb Anytime TD" }),
      row({ capper_id: 2, handle: "b", player_id: 9, player_name: "CeeDee Lamb", selection: "CeeDee Lamb Any Time Touchdown Scorer" }),
    ];
    expect(topBackedPlayers(rows, 1)[0].lean).toBe("all 2 on Anytime TD");
  });

  it("ignores rows without a player and returns [] for an all-sides game", () => {
    expect(topBackedPlayers(PICKS.slice(-2), 3)).toEqual([]);
  });
});

describe("betLabel", () => {
  it("strips the player name and position tag", () => {
    expect(betLabel("Patrick Mahomes QB Under 224.5 Pass Yards", "Patrick Mahomes")).toBe("Under 224.5 Passing Yards");
    expect(betLabel("Travis Kelce TE Over 17.5 Longest Rec", "Travis Kelce")).toBe("Over 17.5 Longest Rec");
  });

  it("strips initial-dot shorthand and normalizes yards", () => {
    expect(betLabel("P.Mahomes u226.5 Pass Yds", "Patrick Mahomes")).toBe("Under 226.5 Passing Yards");
    expect(betLabel("Rashee Rice 50+ REC YDS", "Rashee Rice")).toBe("50+ Receiving Yards");
  });

  it("folds anytime-touchdown variants to one label", () => {
    expect(betLabel("Jonathan Taylor Any Time Touchdown Scorer", "Jonathan Taylor")).toBe("Anytime TD");
    expect(betLabel("Jonathan Taylor Anytime TD Scorer", "Jonathan Taylor")).toBe("Anytime TD");
  });

  it("drops the 'to record' filler and returns null when nothing is left", () => {
    expect(betLabel("CeeDee Lamb to record 25+ Receiving Yards in Each Half", "CeeDee Lamb")).toBe(
      "25+ Receiving Yards in Each Half",
    );
    expect(betLabel("Saquon Barkley", "Saquon Barkley")).toBeNull();
    expect(betLabel(null, "Saquon Barkley")).toBeNull();
  });
});
