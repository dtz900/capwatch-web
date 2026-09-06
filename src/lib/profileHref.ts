/**
 * Build a /cappers/:handle href that propagates the user's currently-selected
 * leaderboard filters into the profile page. Without this, a user looking at
 * the leaderboard's "Season" view who clicks into a capper sees the profile
 * default to "Last 30," which can show wildly different numbers for the same
 * capper and reads as a data integrity issue.
 *
 * Defaults are omitted from the URL to keep links clean.
 */
export function buildProfileHref(
  handle: string,
  params: { window?: string; sport?: string },
): string {
  const usp = new URLSearchParams();
  // Carry the board's league onto the profile: a click from the NFL
  // leaderboard lands on the capper's NFL record, not the combined one.
  if (params.sport && params.sport !== "all") {
    usp.set("sport", params.sport);
  }
  if (params.window && params.window !== "last_30") {
    usp.set("window", params.window);
  }
  const qs = usp.toString();
  return `/cappers/${encodeURIComponent(handle)}${qs ? `?${qs}` : ""}`;
}
