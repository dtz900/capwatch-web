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
