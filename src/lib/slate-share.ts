import type { SlateSport } from "./api";

/** The slate view a game card is rendered in. */
export interface SlateShareView {
  sport: SlateSport;
  dateParam: "today" | "tomorrow";
  /** NFL week the board is showing (from the API, not just the URL), so a
   * shared link keeps opening that week after the current week rolls. */
  week: number | undefined;
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
