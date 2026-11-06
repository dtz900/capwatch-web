import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ALL_LEAGUES,
  PUBLIC_LEAGUES,
  isPublicLeague,
  publicLeagueList,
  publicOnly,
  publicSportFilters,
  SLATE_CHIP_ORDER,
  TAB_ORDER,
} from "./public-leagues";
import { parseSlateSport } from "./slate-sport";
import { capperRecordPill } from "./capperFilters";
import { leagueLabel } from "./seo";

describe("PUBLIC_LEAGUES (NCAAB is public)", () => {
  it("publishes NCAAB", () => {
    expect(ALL_LEAGUES).toContain("ncaab");
    expect(PUBLIC_LEAGUES).toContain("ncaab");
    expect(isPublicLeague("ncaab")).toBe(true);
    expect(isPublicLeague("nba")).toBe(true);
  });

  it("every chip and tab order includes NCAAB", () => {
    expect(publicOnly(SLATE_CHIP_ORDER)).toEqual(["nfl", "nba", "ncaab", "mlb"]);
    expect(publicOnly(TAB_ORDER)).toEqual(["mlb", "nfl", "nba", "ncaab"]);
    expect(publicSportFilters()).toEqual(["all", "mlb", "nfl", "nba", "ncaab"]);
  });

  it("?sport=ncaab opens the NCAAB slate", () => {
    expect(parseSlateSport("ncaab")).toBe("ncaab");
  });

  it("public copy names NCAAB", () => {
    expect(publicLeagueList()).toBe("MLB, NFL, NBA and NCAAB");
    expect(capperRecordPill("all")).toBe("MLB + NFL + NBA + NCAAB CAPPER RECORD");
    expect(leagueLabel("all")).toBe("MLB, NFL, NBA and NCAAB");
  });

  it("the sitemap source does not hardcode a league list", () => {
    const src = readFileSync("src/app/sitemap.ts", "utf8");
    expect(src.toLowerCase()).not.toContain("ncaab");
    expect(src.toLowerCase()).not.toContain("?sport=");
  });
});
