import { isLocked } from "@/lib/tof/deck";

/** What a failed tof_plays insert looks like to the client. */
export interface PlayInsertError {
  code?: string | null;
  message?: string | null;
  status?: number | null;
}

export interface PlayErrorOutcome {
  /** Short toast copy for the player. */
  message: string;
  /** True when the real error should go to the console (anything unexplained). */
  log: boolean;
}

const POLICY_RE = /policy|violates/i;
const AUTH_RE = /jwt|not authenticated|invalid claim|token/i;
const NETWORK_RE = /failed to fetch|networkerror|network request failed|load failed/i;

/**
 * Map a failed tof_plays insert to a friendly, accurate toast. The insert
 * policy refuses for several reasons that all look the same on the wire (a
 * started game, a closed hand, a stable pick that is not in the caller's
 * stable or has no usable start time), so the only one we can name with
 * confidence is "the card's start time has passed". A refusal on a card that
 * has not started is a different failure and is logged, not blamed on a lock.
 */
export function playErrorOutcome(
  error: PlayInsertError,
  card: { game_start_at: string },
  now: Date = new Date(),
): PlayErrorOutcome {
  const message = error.message ?? "";
  if (error.code === "23505") return { message: "Already played.", log: false };
  if (error.code === "PGRST301" || error.status === 401 || AUTH_RE.test(message)) {
    return { message: "Your session expired. Sign in again to play.", log: true };
  }
  if (error.code === "42501" || POLICY_RE.test(message)) {
    if (card.game_start_at && isLocked(card, now)) {
      return { message: "That card just locked.", log: false };
    }
    return { message: "That card is not open for plays right now. Refresh to see the latest deck.", log: true };
  }
  if (!error.code && NETWORK_RE.test(message)) {
    return { message: "No connection. Check your signal and try again.", log: true };
  }
  return { message: "Could not save that play. Try again.", log: true };
}
