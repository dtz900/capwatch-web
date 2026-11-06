/**
 * The one place that says which leagues users can see. Every league tab and
 * chip, every `?sport=` whitelist (pages, OG routes, history API), the slate
 * "games tonight" fan-out and the SEO league list read PUBLIC_LEAGUES, so
 * making a league public is one line here (plus the platform's own flip).
 *
 * A league can exist in the types, team maps, formatters and views while it
 * is absent from this list: it is then reachable by no URL, chip, sitemap
 * entry or OG card.
 */

/** Every league the codebase knows how to render, public or not. */
export const ALL_LEAGUES = ["mlb", "nfl", "nba", "ncaab"] as const;
export type League = (typeof ALL_LEAGUES)[number];

/** THE flip. Mirrors the platform's PUBLIC_SPORTS. */
export const PUBLIC_LEAGUES = ["mlb", "nfl", "nba", "ncaab"] as const satisfies readonly League[];
export type PublicLeague = (typeof PUBLIC_LEAGUES)[number];

export function isPublicLeague(raw: unknown): raw is PublicLeague {
  return typeof raw === "string" && (PUBLIC_LEAGUES as readonly string[]).includes(raw);
}

/** Keep only the public leagues of `order`, preserving that order. */
export function publicOnly<T extends League>(order: readonly T[]): T[] {
  return order.filter((l) => isPublicLeague(l));
}

/** `?sport=` values the leaderboard and capper profiles accept. */
export function publicSportFilters(): ReadonlyArray<"all" | PublicLeague> {
  return ["all", ...PUBLIC_LEAGUES];
}

/** Slate league chips, left to right. */
export const SLATE_CHIP_ORDER = ["nfl", "nba", "ncaab", "mlb"] as const satisfies readonly League[];
/** Leaderboard / profile tabs, left to right (after "All"). */
export const TAB_ORDER = ["mlb", "nfl", "nba", "ncaab"] as const satisfies readonly League[];

/** Display label: "MLB", "NCAAB". */
export function leagueName(l: League): string {
  return l.toUpperCase();
}

/** "MLB, NFL and NBA" for copy; follows PUBLIC_LEAGUES. */
export function publicLeagueList(): string {
  const names = PUBLIC_LEAGUES.map(leagueName);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
