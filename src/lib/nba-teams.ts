/**
 * NBA team metadata: ESPN logo CDN keys, primary brand colors and mascots.
 * Abbreviations are ESPN-canonical (the backend's nba games vocabulary:
 * GS, NY, NO, SA, UTAH, WSH), so the logo key is just the lowercase abbr.
 */

export function nbaTeamLogoUrl(abbr: string | null): string | null {
  if (!abbr) return null;
  return `https://a.espncdn.com/i/teamlogos/nba/500/${abbr.toLowerCase()}.png`;
}

export const NBA_TEAM_COLORS: Record<string, string> = {
  ATL: "#e03a3e",
  BOS: "#007a33",
  BKN: "#000000",
  CHA: "#1d1160",
  CHI: "#ce1141",
  CLE: "#860038",
  DAL: "#00538c",
  DEN: "#0e2240",
  DET: "#c8102e",
  GS: "#1d428a",
  HOU: "#ce1141",
  IND: "#002d62",
  LAC: "#c8102e",
  LAL: "#552583",
  MEM: "#5d76a9",
  MIA: "#98002e",
  MIL: "#00471b",
  MIN: "#0c2340",
  NO: "#0c2340",
  NY: "#006bb6",
  OKC: "#007ac1",
  ORL: "#0077c0",
  PHI: "#006bb6",
  PHX: "#1d1160",
  POR: "#e03a3e",
  SAC: "#5a2d81",
  SA: "#c4ced4",
  TOR: "#ce1141",
  UTAH: "#002b5c",
  WSH: "#002b5c",
};

export function nbaTeamColor(abbr: string | null, fallback = "#3b3b3b"): string {
  if (!abbr) return fallback;
  return NBA_TEAM_COLORS[abbr] ?? fallback;
}

/** Mascots for copy and bet-text resolution, keyed by ESPN abbr. */
export const NBA_TEAM_NAMES: Record<string, string> = {
  ATL: "Hawks", BOS: "Celtics", BKN: "Nets", CHA: "Hornets", CHI: "Bulls",
  CLE: "Cavaliers", DAL: "Mavericks", DEN: "Nuggets", DET: "Pistons", GS: "Warriors",
  HOU: "Rockets", IND: "Pacers", LAC: "Clippers", LAL: "Lakers", MEM: "Grizzlies",
  MIA: "Heat", MIL: "Bucks", MIN: "Timberwolves", NO: "Pelicans", NY: "Knicks",
  OKC: "Thunder", ORL: "Magic", PHI: "76ers", PHX: "Suns", POR: "Trail Blazers",
  SAC: "Kings", SA: "Spurs", TOR: "Raptors", UTAH: "Jazz", WSH: "Wizards",
};

/**
 * Shorthand cappers write that is not the mascot in NBA_TEAM_NAMES. Only
 * consulted for NBA games, so "Kings" or "Heat" never collide with other
 * leagues. Kept to unambiguous nicknames.
 */
export const NBA_EXTRA_ALIASES: Record<string, string[]> = {
  BOS: ["Celts"],
  CLE: ["Cavs"],
  DAL: ["Mavs"],
  DEN: ["Nuggs"],
  GS: ["Dubs"],
  MIN: ["Wolves", "T-Wolves", "Twolves"],
  PHI: ["Sixers"],
  POR: ["Blazers"],
};
