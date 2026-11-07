import { describe, expect, it } from "vitest";
import type { QueueRow } from "./labels";
import { candidateSiblings, gameSiblings, playerSiblings, siblingCopy, siblingIdsFor } from "./siblings";
import { gameLabelFor, leadingToken, nameKey, sideRowVisible, tokenOnGame } from "./teamMatch";

function row(over: Partial<QueueRow>): QueueRow {
  return { pick_id: 1, raw_id: 10, sport: "NBA", selection: null, player_name: null, ...over } as QueueRow;
}
const ids = (rs: QueueRow[]) => rs.map((r) => r.pick_id);

describe("siblingIdsFor", () => {
  const p = row({ pick_id: 1 });
  it("returns other picks from the same tweet and sport", () => {
    expect(siblingIdsFor([p, row({ pick_id: 2 }), row({ pick_id: 3 })], p)).toEqual([2, 3]);
  });
  it("excludes self, other sports and other tweets", () => {
    const rows = [p, row({ pick_id: 2, sport: "MLB" }), row({ pick_id: 3, raw_id: 11 })];
    expect(siblingIdsFor(rows, p)).toEqual([]);
  });
  it("returns nothing when raw_id is null", () => {
    const n = row({ pick_id: 1, raw_id: null });
    expect(siblingIdsFor([n, row({ pick_id: 2, raw_id: null })], n)).toEqual([]);
  });
});

describe("helpers", () => {
  it("leadingToken stops at the market tail", () => {
    expect(leadingToken("D. Acuff o4.5 Rebs")).toBe("D. Acuff");
    expect(leadingToken("Lakers ML")).toBe("Lakers");
    expect(leadingToken("Sabonis o10.5 Reb")).toBe("Sabonis");
    expect(leadingToken("Kansas St -3.5")).toBe("Kansas St");
  });
  it("nameKey drops dots and generational suffixes", () => {
    expect(nameKey("Darius Acuff Jr.")).toBe("darius acuff");
    expect(nameKey("D. Acuff")).toBe("d acuff");
  });
});

describe("gameSiblings and playerSiblings", () => {
  const lal = { away_team: "LAL", home_team: "BOS" };
  it("a parlay of three teams does not spread one game to the other legs", () => {
    const p = row({ pick_id: 1, selection: "Lakers ML" });
    const rows = [p, row({ pick_id: 2, selection: "Celtics ML" }), row({ pick_id: 3, selection: "Knicks o220.5" })];
    expect(ids(gameSiblings(rows, p, { away_team: "LAL", home_team: "SAC" }))).toEqual([]);
    expect(ids(gameSiblings(rows, p, lal))).toEqual([2]);
    expect(ids(candidateSiblings(rows, p, null))).toEqual([]);
  });
  it("matches by display name and its last word", () => {
    const p = row({ pick_id: 1, selection: "Spurs ML" });
    const rows = [p, row({ pick_id: 2, selection: "Kings -3" }), row({ pick_id: 3, selection: "Knicks ML" })];
    expect(ids(gameSiblings(rows, p, { away_team: "SA", home_team: "SAC" }))).toEqual([2]);
  });
  it("the Acuff pair both receive player and game patches", () => {
    const a = row({ pick_id: 1, selection: "D. Acuff o4.5 Rebs", player_name: "D. Acuff" });
    const b = row({ pick_id: 2, selection: "D. Acuff o5.5 Rebs", player_name: "D. Acuff" });
    expect(ids(playerSiblings([a, b], a))).toEqual([2]);
    expect(ids(gameSiblings([a, b], a, { away_team: "SAC", home_team: "SA" }))).toEqual([2]);
  });
  it("a renamed primary still matches by its selection token", () => {
    const a = row({ pick_id: 1, selection: "D. Acuff o4.5 Rebs", player_name: "Darius Acuff Jr." });
    const b = row({ pick_id: 2, selection: "D. Acuff o5.5 Rebs", player_name: "D. Acuff" });
    expect(ids(playerSiblings([a, b], a))).toEqual([2]);
  });
  it("a two-player card does not cross-propagate", () => {
    const a = row({ pick_id: 1, selection: "Sabonis o10.5 Reb", player_name: "Sabonis" });
    const b = row({ pick_id: 2, selection: "Murray o20.5 Pts", player_name: "Murray" });
    expect(playerSiblings([a, b], a)).toEqual([]);
    expect(gameSiblings([a, b], a, { away_team: "DEN", home_team: "SAC" })).toEqual([]);
  });
  it("NCAAB compares team ids too", () => {
    const p = row({ pick_id: 1, sport: "NCAAB", selection: "Zeta ML" });
    const s = row({ pick_id: 2, sport: "NCAAB", selection: "teamx -3" });
    const g = { away_team: "ZZZ", home_team: "YYY", away_team_id: "teamx", home_team_id: "99" };
    expect(ids(gameSiblings([p, s], p, g))).toEqual([2]);
    expect(tokenOnGame("teamx", { ...g, away_team_id: null }, "NCAAB")).toBe(false);
  });
});

describe("siblingCopy", () => {
  it("names one pick", () => {
    const s = row({ pick_id: 116172, selection: "D. Acuff o5.5 Rebs", odds_taken: 640 });
    expect(siblingCopy([s])).toBe("Same tweet also made pick #116172 (D. Acuff o5.5 Rebs +640). Apply player and game to it.");
  });
  it("names several picks", () => {
    expect(siblingCopy([row({ pick_id: 1 }), row({ pick_id: 2 })])).toBe(
      "Same tweet also made picks #1, #2. Player and game changes apply to the ones that match.",
    );
  });
});

describe("sideRowVisible", () => {
  const base = { reason: "no_grade_row", sport: "NBA" };
  it("hides for props", () => {
    expect(
      sideRowVisible({ ...base, bet_kind: "player", selection: "D. Acuff o4.5 Rebs" }, { away_team: "SAC", home_team: "SA" }),
    ).toBe(false);
  });
  it("hides when the team is on the game", () => {
    expect(
      sideRowVisible({ ...base, bet_kind: "team", selection: "Lakers ML" }, { away_team: "LAL", home_team: "BOS" }),
    ).toBe(false);
  });
  it("shows for an ambiguous team", () => {
    expect(
      sideRowVisible({ reason: "no_grade_row", sport: "MLB", bet_kind: "team", selection: "Sox ML" }, { away_team: "BOS", home_team: "CWS" }),
    ).toBe(true);
  });
  it("shows when ungradeable", () => {
    expect(
      sideRowVisible({ ...base, reason: "ungradeable", bet_kind: "team", selection: "Lakers ML" }, { away_team: "LAL", home_team: "BOS" }),
    ).toBe(true);
  });
});

describe("gameLabelFor", () => {
  it("reads teams then date", () => {
    expect(gameLabelFor({ away_team: "SA", home_team: "SAC" }, "NBA", "2026-11-06")).toBe(
      "San Antonio Spurs @ Sacramento Kings · Fri, Nov 6",
    );
  });
});
