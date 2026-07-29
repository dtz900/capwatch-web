import type { SlateGame, GameState, InningHalf } from "@/lib/types";

/** Height of the sticky TopNav in px. */
export const NAV_H = 64;
/** Height of the below-xl horizontal rail strip in px. */
export const RAIL_STRIP_H = 40;

/** Serializable per-game descriptor passed from the RSC to the client rail. */
export interface RailGame {
  game_id: number;
  away_team: string | null;
  home_team: string | null;
  game_state: GameState;
  away_score: number | null;
  home_score: number | null;
  game_time: string | null;
  inning: number | null;
  inning_half: InningHalf | null;
  sharp_count: number;
}

/**
 * Collapse game_state into the three states the rail cares about. Mirrors
 * GameBlock.deriveLifecycle, including the defensive null guard for stale
 * ISR responses that predate the game_state field.
 */
export function railLifecycle(
  state: GameState | null | undefined,
): "pre" | "live" | "final" {
  if (!state || state === "scheduled") return "pre";
  if (state === "in_progress") return "live";
  return "final";
}

/**
 * Map fetched games to the rail payload, with-picks first then quiet, matching
 * the on-page DOM order so scroll-spy positions line up. sharp_count is the
 * number of distinct cappers on the game (a capper with multiple picks counts
 * once). Only primitives cross the RSC to client boundary.
 */
export function buildRailGames(
  withPicks: SlateGame[],
  withoutPicks: SlateGame[],
): RailGame[] {
  return [...withPicks, ...withoutPicks].map((g) => ({
    game_id: g.game_id,
    away_team: g.away_team,
    home_team: g.home_team,
    game_state: g.game_state,
    away_score: g.away_score,
    home_score: g.home_score,
    game_time: g.game_time,
    inning: g.inning,
    inning_half: g.inning_half,
    sharp_count: new Set(g.picks.map((p) => p.capper_id)).size,
  }));
}
