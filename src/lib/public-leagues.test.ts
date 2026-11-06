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

describe("PUBLIC_LEAGUES (NCAAB stays dark)", () => {
  it("knows NCAAB but does not publish it", () => {
    expect(ALL_LEAGUES).toContain("ncaab");
    expect(PUBLIC_LEAGUES).not.toContain("ncaab");
    expect(isPublicLeague("ncaab")).toBe(false);
    expect(isPublicLeague("nba")).toBe(true);
  });

  it("every chip and tab order drops NCAAB", () => {
    expect(publicOnly(SLATE_CHIP_ORDER)).toEqual(["nfl", "nba", "mlb"]);
    expect(publicOnly(TAB_ORDER)).toEqual(["mlb", "nfl", "nba"]);
    expect(publicSportFilters()).toEqual(["all", "mlb", "nfl", "nba"]);
  });

  it("?sport=ncaab falls back to the default slate league", () => {
    expect(parseSlateSport("ncaab")).toBe("nba");
  });

  it("public copy never names NCAAB", () => {
    expect(publicLeagueList()).toBe("MLB, NFL and NBA");
    expect(capperRecordPill("all")).toBe("MLB + NFL + NBA CAPPER RECORD");
    expect(leagueLabel("all")).toBe("MLB, NFL and NBA");
  });

  it("the sitemap source has no NCAAB entry", () => {
    const src = readFileSync("src/app/sitemap.ts", "utf8");
    expect(src.toLowerCase()).not.toContain("ncaab");
  });
});
