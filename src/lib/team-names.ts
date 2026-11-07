import { NBA_TEAM_NAMES } from "./nba-teams";
import { NFL_TEAM_NAMES } from "./nfl-teams";
import { ncaabTeamName } from "./ncaab-teams";
import "./ncaab-teams-register";

const NBA_CITY: Record<string, string> = {
  ATL: "Atlanta", BOS: "Boston", BKN: "Brooklyn", CHA: "Charlotte", CHI: "Chicago",
  CLE: "Cleveland", DAL: "Dallas", DEN: "Denver", DET: "Detroit", GS: "Golden State",
  HOU: "Houston", IND: "Indiana", LAC: "LA", LAL: "Los Angeles", MEM: "Memphis",
  MIA: "Miami", MIL: "Milwaukee", MIN: "Minnesota", NO: "New Orleans", NY: "New York",
  OKC: "Oklahoma City", ORL: "Orlando", PHI: "Philadelphia", PHX: "Phoenix", POR: "Portland",
  SAC: "Sacramento", SA: "San Antonio", TOR: "Toronto", UTAH: "Utah", WSH: "Washington",
};

/** Readable team name for a game row. Abbreviations are only unique within a
 * league, so the lookup is keyed by sport. Unknown teams show the abbreviation. */
export function teamDisplayName(abbr: string | null | undefined, sport: string | null | undefined): string {
  if (!abbr) return "?";
  const key = abbr.trim().toUpperCase();
  switch ((sport ?? "").toUpperCase()) {
    case "NBA": {
      const mascot = NBA_TEAM_NAMES[key];
      if (!mascot) return abbr;
      const city = NBA_CITY[key];
      return city ? `${city} ${mascot}` : mascot;
    }
    case "NFL":
      return NFL_TEAM_NAMES[key] ?? abbr;
    case "NCAAB":
      return ncaabTeamName(key) ?? abbr;
    default:
      return abbr;
  }
}

const UPPER_TOKENS = new Set([
  "ml", "nrfi", "yrfi", "f5", "f3", "h1", "h2", "q1", "q2", "q3", "q4",
  "1h", "2h", "1q", "2q", "3q", "4q", "pra", "tb", "rbi", "hr", "sb", "k",
]);

/** stat_name to a label: underscores become spaces, known abbreviations upper-case. */
export function humanizeStat(stat: string): string {
  return stat
    .split("_")
    .map((t) => (t === "3way" ? "3 way" : UPPER_TOKENS.has(t) ? t.toUpperCase() : t))
    .join(" ");
}
