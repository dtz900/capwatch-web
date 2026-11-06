import { describe, expect, it } from "vitest";
import { NCAAB_TEAMS, legibleTeamColor, ncaabLogoUrlForId, ncaabTeam, ncaabTeamLogoUrl, ncaabTeamName } from "./ncaab-teams";
import { teamLogoUrl } from "./teams";

describe("ncaab team map", () => {
  it("covers the D1 field with unique ids", () => {
    const rows = Object.values(NCAAB_TEAMS);
    expect(rows.length).toBeGreaterThan(340);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });

  it("maps abbreviations to ESPN ids and logos", () => {
    expect(ncaabTeam("mcn")?.id).toBe("2377");
    expect(ncaabTeamLogoUrl("UK")).toBe("https://a.espncdn.com/i/teamlogos/ncaa/500/96.png");
    expect(teamLogoUrl("UNT", "NCAAB")).toBe("https://a.espncdn.com/i/teamlogos/ncaa/500/249.png");
    expect(ncaabTeamName("UNT")).toBe("North Texas");
  });

  it("returns null for unknown or missing programs", () => {
    expect(ncaabTeamLogoUrl("ZZZZ")).toBeNull();
    expect(ncaabTeamLogoUrl(null)).toBeNull();
    expect(ncaabLogoUrlForId("abc")).toBeNull();
    expect(ncaabLogoUrlForId("2377")).toBe("https://a.espncdn.com/i/teamlogos/ncaa/500/2377.png");
  });

  it("lightens dark team colors for text and keeps bright ones", () => {
    expect(legibleTeamColor("#ff8200")).toBe("#ff8200");
    expect(legibleTeamColor("#041e42")).not.toBe("#041e42");
    expect(legibleTeamColor(null)).toBe("#f7f3e9");
    expect(legibleTeamColor("nope")).toBe("#f7f3e9");
  });
});
