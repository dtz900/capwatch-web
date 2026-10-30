/* Builder copy for the platform's post, fix and pull errors. */
import { VipApiError } from "@/lib/vip/client";

const TEXT: Record<string, string> = {
  "409:game_started": "This game has started.",
  "409:game_start_unknown": "We could not find a start time for that game. Pick it from the list.",
  "409:duplicate_pick": "You already posted this pick a few minutes ago.",
  "409:fix_window_closed": "The 10 minute fix window has closed. You can still pull it.",
  "400:leg_missing_game": "Every leg needs a game from the list.",
  "400:unknown_stat_name": "That market is not gradeable yet. Pick a standard market.",
  "400:unknown_market": "That market is not gradeable yet. Pick a standard market.",
  "400:selection_not_in_game": "The selection must name one of the two teams in the game you picked.",
  "400:player_mismatch": "That player is not in this game. Pick the prop from the board.",
  "400:sgp_needs_ticket_price": "Enter the price your book gave you for the same game parlay.",
  "400:parlay_needs_price": "Enter a price for every leg.",
  "400:price_out_of_bounds": "Check the prices: 100 to 10000 either side.",
  "400:parlay_odds_out_of_bounds": "Check the parlay price: 100 to 10000 either side.",
  "404:pick_not_found": "That pick is no longer posted.",
};

export function builderError(err: unknown): string {
  if (err instanceof VipApiError) {
    const known = TEXT[`${err.status}:${err.detail}`];
    if (known) return known;
    if (err.status === 403) return "You are not eligible to post in this sport right now.";
    if (err.status === 422) return "Check units, prices and lines.";
  }
  return "Could not post the pick. Try again.";
}

export const isGameStarted = (err: unknown) =>
  err instanceof VipApiError && err.status === 409 && err.detail === "game_started";
