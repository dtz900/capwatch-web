/**
 * Sport-aware team lookups. Slate rows carry `sport` from the API, so every
 * logo / color call site passes it through and the MLB helpers stay the
 * default for the surfaces that are still baseball-only.
 */
import type { Sport } from "./types";
import { teamLogoUrl as mlbTeamLogoUrl, teamColor as mlbTeamColor } from "./mlb-teams";
import { nflTeamLogoUrl, nflTeamColor } from "./nfl-teams";
import { nbaTeamLogoUrl, nbaTeamColor } from "./nba-teams";

export function teamLogoUrl(abbr: string | null, sport: Sport = "MLB"): string | null {
  if (sport === "NFL") return nflTeamLogoUrl(abbr);
  if (sport === "NBA") return nbaTeamLogoUrl(abbr);
  return mlbTeamLogoUrl(abbr);
}

export function teamColor(abbr: string | null, sport: Sport = "MLB", fallback = "#3b3b3b"): string {
  if (sport === "NFL") return nflTeamColor(abbr, fallback);
  if (sport === "NBA") return nbaTeamColor(abbr, fallback);
  return mlbTeamColor(abbr, fallback);
}
