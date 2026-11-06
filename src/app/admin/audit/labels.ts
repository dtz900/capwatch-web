import type { AuditProblem } from "@/lib/api";

export const REASON_LABEL: Record<string, string> = {
  market_unhandled: "Market not in grader",
  missing_player_id: "Player not resolved",
  missing_line: "Line missing",
  missing_game_id: "Game not resolved",
  game_pending: "Game pending",
  no_grade_row: "Grader hasn't run",
  player_did_not_play: "Player didn't play",
  data_gap: "Game data gap",
  ungradeable: "Grader gave up",
};

/** An audit row plus date strings formatted on the server, so the client
 * never derives dates and cannot hit a hydration mismatch. */
export type QueueRow = AuditProblem & {
  posted_label: string | null;
  game_label: string | null;
};

export function formatOdds(odds: number | null | undefined): string {
  if (odds == null) return "";
  return odds > 0 ? `+${odds}` : String(odds);
}

/** Reasons for the ungraded-on-a-final-game backlog, distinct from the queue reasons. */
export const UNGRADED_FINAL_REASON_LABEL: Record<string, string> = {
  unresolved_player: "Player not resolved",
  unknown_stat_name: "Unknown stat name",
  unsupported_period_market: "Period market unsupported",
  unknown: "Unknown",
};

/** A dense row for the settled and pending bucket lists. Dates are formatted on the server. */
export interface BucketRow {
  pick_id: number;
  date: string | null;
  capper: string;
  selection: string;
  reason: string;
}

export interface UngradedFinalView {
  pick_id: number;
  capper_handle: string | null;
  selection: string | null;
  stat_name: string | null;
  sport: string;
  game_id: string | null;
  finalSince: string;
  reason: string;
}

/** Copy for an empty queue: sport tabs name the sport. */
export function emptyQueueCopy(sportLabel: string): string {
  return sportLabel === "any sport" ? "Queue clear." : `Nothing needs you in ${sportLabel}.`;
}
