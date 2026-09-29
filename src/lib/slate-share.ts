import type { SlateSport } from "./api";

/** The slate view a game card is rendered in. */
export interface SlateShareView {
  sport: SlateSport;
  dateParam: "today" | "tomorrow";
  /** NFL week the board is showing (from the API, not just the URL), so a
   * shared link keeps opening that week after the current week rolls. */
  week: number | undefined;
}

/** NFL week to pin a share link to. The API reads a numeric week as a
 * REGULAR-SEASON week, so only a regular-season board can be pinned by
 * number; a preseason or playoff board keeps whatever week the URL already
 * carried (usually none, meaning the current week). */
export function pinnedNflWeek(
  served: { week: number | null; season_type: "pre" | "reg" | "post" | null } | null | undefined,
  urlWeek: number | undefined,
): number | undefined {
  if (served?.season_type === "reg" && served.week != null) return served.week;
  return urlWeek;
}

interface ShareableGame {
  game_id: number;
  away_team: string | null;
  home_team: string | null;
}

export interface SlateGameShareLink {
  queryParams: Record<string, string | undefined>;
  /** Anchor of the game card, without the leading "#". */
  hash: string;
}

/** Share link for one game card: the slate URL with ?game= so the OG card
 * features that matchup, anchored to the card so the click lands on it.
 * The matchup slug is readable ("PHI-ATL"); a doubleheader or a missing
 * team falls back to the game id, which the OG resolver also accepts. */
export function slateGameShareLink(
  game: ShareableGame,
  slateGames: ShareableGame[],
  view: SlateShareView,
): SlateGameShareLink {
  const { away_team: away, home_team: home } = game;
  const sameMatchup = slateGames.filter(
    (g) => g.away_team === away && g.home_team === home,
  ).length;
  const slug = away && home && sameMatchup <= 1 ? `${away}-${home}` : String(game.game_id);
  const isNfl = view.sport === "nfl";
  return {
    queryParams: {
      sport: isNfl ? "nfl" : undefined,
      week: isNfl && view.week != null ? String(view.week) : undefined,
      date: !isNfl && view.dateParam !== "today" ? view.dateParam : undefined,
      game: slug,
    },
    hash: `game-${game.game_id}`,
  };
}
