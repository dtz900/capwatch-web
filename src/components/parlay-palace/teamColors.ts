// MLB team primary colors keyed by stats-API abbreviation. Used to tint the
// per-leg logo chip so the scoreboard reads as designed, not generic.
const TEAM_COLORS: Record<string, string> = {
  ARI: "#A71930", ATH: "#003831", ATL: "#13274F", BAL: "#DF4601",
  BOS: "#BD3039", CHC: "#0E3386", CWS: "#27251F", CIN: "#C6011F",
  CLE: "#0C2340", COL: "#333366", DET: "#0C2340", HOU: "#002D62",
  KC: "#004687", LAA: "#BA0021", LAD: "#005A9C", MIA: "#00A3E0",
  MIL: "#12284B", MIN: "#002B5C", NYM: "#002D72", NYY: "#0C2340",
  ATX: "#002D62", PHI: "#E81828", PIT: "#27251F", SD: "#2F241D",
  SEA: "#0C2C56", SF: "#FD5A1E", STL: "#C41E3A", TB: "#092C5C",
  TEX: "#003278", TOR: "#134A8E", WSH: "#AB0003",
};

export function teamColor(abbr: string | null | undefined): string {
  if (!abbr) return "#2a2f37";
  return TEAM_COLORS[abbr.toUpperCase()] ?? "#2a2f37";
}
