import { describe, expect, it } from "vitest";
import { nbaBetLabel } from "./nba-bet-label";

describe("nbaBetLabel", () => {
  it.each([
    ["Cade Cunningham TO SCORE 20+ POINTS", "Cade Cunningham", "20+ PTS"],
    ["Cade Cunningham TO RECORD 8+ ASSISTS", "Cade Cunningham", "8+ AST"],
    ["Jayson Tatum OVER 8.5 Rebounds", "Jayson Tatum", "o8.5 REB"],
    ["Chet Holmgren u8.5 Rebounds", "Chet Holmgren", "u8.5 REB"],
    ["Jalen Brunson 3+ Made Threes", "Jalen Brunson", "3+ 3PM"],
    ["Tyrese Maxey 2+ 3PM", "Tyrese Maxey", "2+ 3PM"],
    ["Payton Pritchard To Record 20+ Pts + Reb + Ast", "Payton Pritchard", "20+ PRA"],
    ["Jalen Williams 23+ PTS + REB + AST", "Jalen Williams", "23+ PRA"],
    ["Joel Embiid Over 11 Rebs+Asts", "Joel Embiid", "o11 RA"],
    ["Jayson Tatum Player To Score 3+ Points In Each Quarter", "Jayson Tatum", "3+ PTS EACH QTR"],
    ["Victor Wembanyama 2+ BLK", "Victor Wembanyama", "2+ BLK"],
    ["Ausar Thompson 2+ STL + BLK", "Ausar Thompson", "2+ STL+BLK"],
    ["Tatum 20+ PTS", "Jayson Tatum", "20+ PTS"],
    ["L. Dončić O7.5", "Luka Dončić", "o7.5"],
  ])("%s -> %s", (sel, name, want) => {
    expect(nbaBetLabel(sel, name)).toBe(want);
  });
  it("uppercases and cuts an unknown shape at 24 chars", () => {
    expect(nbaBetLabel("Jayson Tatum First Basket Scorer Of The Night Special", "Jayson Tatum")).toBe("FIRST BASKET SCORER OF T");
  });
  it("returns null for empty input", () => {
    expect(nbaBetLabel("", "Jayson Tatum")).toBeNull();
    expect(nbaBetLabel("Jayson Tatum", "Jayson Tatum")).toBeNull();
  });
});
