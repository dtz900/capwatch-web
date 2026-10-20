import type { SlateSport } from "./api";

// Pure helpers only: SportToggle is a client component and imports this file.

/**
 * The league a bare /slate opens to. NBA plays almost every night from
 * October through June; MLB is down to the World Series by late October and
 * dark all winter, and the NFL board is a week, not a night.
 */
export const DEFAULT_SLATE_SPORT: SlateSport = "nba";

/** `?sport=` as the URL carries it; anything unrecognised is the default league. */
export function parseSlateSport(raw: unknown): SlateSport {
  return raw === "nfl" || raw === "nba" || raw === "mlb" ? raw : DEFAULT_SLATE_SPORT;
}

/** The `?sport=` value a /slate link needs for this league: none for the default. */
export function slateSportParam(sport: SlateSport): string | undefined {
  return sport === DEFAULT_SLATE_SPORT ? undefined : sport;
}
