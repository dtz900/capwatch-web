/**
 * NFL team metadata: ESPN logo CDN keys and primary brand colors.
 * Abbreviations are ESPN-canonical (the backend's nfl_games vocabulary), so
 * the logo key is just the lowercase abbr.
 */

export function nflTeamLogoUrl(abbr: string | null): string | null {
  if (!abbr) return null;
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr.toLowerCase()}.png`;
}

export const NFL_TEAM_COLORS: Record<string, string> = {
  ARI: "#97233f",
  ATL: "#a71930",
  BAL: "#241773",
  BUF: "#00338d",
  CAR: "#0085ca",
  CHI: "#c83803",
  CIN: "#fb4f14",
  CLE: "#ff3c00",
  DAL: "#003594",
  DEN: "#fb4f14",
  DET: "#0076b6",
  GB: "#203731",
  HOU: "#03202f",
  IND: "#002c5f",
  JAX: "#006778",
  KC: "#e31837",
  LAC: "#0080c6",
  LAR: "#003594",
  LV: "#a5acaf",
  MIA: "#008e97",
  MIN: "#4f2683",
  NE: "#002244",
  NO: "#d3bc8d",
  NYG: "#0b2265",
  NYJ: "#125740",
  PHI: "#004c54",
  PIT: "#ffb612",
  SEA: "#69be28",
  SF: "#aa0000",
  TB: "#d50a0a",
  TEN: "#4b92db",
  WSH: "#5a1414",
};

export function nflTeamColor(abbr: string | null, fallback = "#3b3b3b"): string {
  if (!abbr) return fallback;
  return NFL_TEAM_COLORS[abbr] ?? fallback;
}

/** Full names for copy ("Philadelphia Eagles"), keyed by ESPN abbr. */
export const NFL_TEAM_NAMES: Record<string, string> = {
  ARI: "Cardinals", ATL: "Falcons", BAL: "Ravens", BUF: "Bills", CAR: "Panthers",
  CHI: "Bears", CIN: "Bengals", CLE: "Browns", DAL: "Cowboys", DEN: "Broncos",
  DET: "Lions", GB: "Packers", HOU: "Texans", IND: "Colts", JAX: "Jaguars",
  KC: "Chiefs", LAC: "Chargers", LAR: "Rams", LV: "Raiders", MIA: "Dolphins",
  MIN: "Vikings", NE: "Patriots", NO: "Saints", NYG: "Giants", NYJ: "Jets",
  PHI: "Eagles", PIT: "Steelers", SEA: "Seahawks", SF: "49ers", TB: "Buccaneers",
  TEN: "Titans", WSH: "Commanders",
};
