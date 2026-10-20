import { describe, expect, it } from "vitest";
import { NBA_EXTRA_ALIASES, NBA_TEAM_COLORS, NBA_TEAM_NAMES, nbaTeamColor, nbaTeamLogoUrl } from "./nba-teams";
import { teamColor, teamLogoUrl } from "./teams";

// The ESPN abbreviations the platform's NBA slate emits.
const ABBRS = [
  "ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GS",
  "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NO", "NY",
  "OKC", "ORL", "PHI", "PHX", "POR", "SA", "SAC", "TOR", "UTAH", "WSH",
];

describe("NBA team tables", () => {
  it("covers all 30 teams with a color and a mascot, and nothing else", () => {
    expect(ABBRS).toHaveLength(30);
    for (const a of ABBRS) {
      expect(NBA_TEAM_COLORS[a], a).toMatch(/^#[0-9a-f]{6}$/);
      expect(NBA_TEAM_NAMES[a], a).toBeTruthy();
    }
    expect(Object.keys(NBA_TEAM_COLORS).sort()).toEqual([...ABBRS].sort());
    expect(Object.keys(NBA_TEAM_NAMES).sort()).toEqual([...ABBRS].sort());
  });

  it("uses the mascots cappers know for the short ESPN keys", () => {
    expect(NBA_TEAM_NAMES.GS).toBe("Warriors");
    expect(NBA_TEAM_NAMES.NY).toBe("Knicks");
    expect(NBA_TEAM_NAMES.NO).toBe("Pelicans");
    expect(NBA_TEAM_NAMES.SA).toBe("Spurs");
    expect(NBA_TEAM_NAMES.UTAH).toBe("Jazz");
    expect(NBA_TEAM_NAMES.POR).toBe("Trail Blazers");
    expect(NBA_TEAM_NAMES.MIN).toBe("Timberwolves");
  });

  it("only aliases real teams", () => {
    for (const a of Object.keys(NBA_EXTRA_ALIASES)) expect(ABBRS).toContain(a);
  });

  it("builds ESPN logo URLs from the lowercase abbr", () => {
    expect(nbaTeamLogoUrl("GS")).toBe("https://a.espncdn.com/i/teamlogos/nba/500/gs.png");
    expect(nbaTeamLogoUrl("UTAH")).toBe("https://a.espncdn.com/i/teamlogos/nba/500/utah.png");
    expect(nbaTeamLogoUrl(null)).toBeNull();
  });

  it("falls back for unknown or missing abbrs", () => {
    expect(nbaTeamColor("XYZ")).toBe("#3b3b3b");
    expect(nbaTeamColor(null, "#111111")).toBe("#111111");
  });
});

describe("sport dispatch in teams.ts", () => {
  it("routes NBA to the NBA tables", () => {
    expect(teamLogoUrl("BOS", "NBA")).toBe("https://a.espncdn.com/i/teamlogos/nba/500/bos.png");
    expect(teamColor("BOS", "NBA")).toBe(NBA_TEAM_COLORS.BOS);
  });
  it("keeps MLB and NFL on their own tables", () => {
    expect(teamLogoUrl("BOS")).toBe("https://a.espncdn.com/i/teamlogos/mlb/500/bos.png");
    expect(teamLogoUrl("MIA", "NFL")).toBe("https://a.espncdn.com/i/teamlogos/nfl/500/mia.png");
  });
});
