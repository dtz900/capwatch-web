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

const REVIEW_STATUSES = ["auto_approved", "needs_review", "rejected"] as const;

/** Checks the hold fields at the API boundary: anything off-contract is dropped, never trusted. */
export function parseReview(p: { review_status?: unknown; review_reason?: unknown; regrade_approves?: unknown }): {
  review_status?: AuditProblem["review_status"];
  review_reason?: string | null;
  regrade_approves: boolean;
} {
  const status = REVIEW_STATUSES.find((s) => s === p.review_status);
  const reason = typeof p.review_reason === "string" && p.review_reason.trim() ? p.review_reason : null;
  return { review_status: status, review_reason: reason, regrade_approves: p.regrade_approves === true };
}

/** Held means hidden from the public site until approved on /admin/review. */
export const isHeld = (p: { review_status?: string }) => p.review_status === "needs_review";

/** What Regrade does for a held pick: approve it (the server said it can), or leave it held (straight or parlay leg). */
export type HeldKind = "approves" | "straight" | "parlay";
export const heldKind = (p: QueueRow): HeldKind | null =>
  !isHeld(p) ? null : p.regrade_approves === true ? "approves" : p.parlay_id == null ? "straight" : "parlay";

/** The API reports a failed call as "<status>: <body>". Returns the JSON `detail` string, or null. */
export function errorDetail(error: string): string | null {
  const body = /^\d{3}:\s*(\{[\s\S]*\})\s*$/.exec(error.trim());
  if (!body) return null;
  try {
    const d = (JSON.parse(body[1]) as { detail?: unknown }).detail;
    return typeof d === "string" && d.trim() ? d.trim() : null;
  } catch {
    return null;
  }
}

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
