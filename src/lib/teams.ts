/**
 * Sport-aware team lookups. Slate rows carry `sport` from the API, so every
 * logo / color call site passes it through and the MLB helpers stay the
 * default for the surfaces that are still baseball-only.
 */
import type { Sport } from "./types";
import { teamLogoUrl as mlbTeamLogoUrl, teamColor as mlbTeamColor } from "./mlb-teams";
import { nflTeamLogoUrl, nflTeamColor } from "./nfl-teams";

export function teamLogoUrl(abbr: string | null, sport: Sport = "MLB"): string | null {
  return sport === "NFL" ? nflTeamLogoUrl(abbr) : mlbTeamLogoUrl(abbr);
}

export function teamColor(abbr: string | null, sport: Sport = "MLB", fallback = "#3b3b3b"): string {
  return sport === "NFL" ? nflTeamColor(abbr, fallback) : mlbTeamColor(abbr, fallback);
}
