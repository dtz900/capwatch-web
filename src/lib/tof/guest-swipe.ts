/* Shape of a guest-swipe telemetry write, shared by the client caller and the
 * route that validates it. The route is unauthenticated by necessity (the
 * whole point is that the visitor has no account yet), so nothing here is
 * trusted: the parse rejects anything it does not recognise, and the database
 * holds the real constraints (fks to a live hand and card, one row per
 * browser per card).
 *
 * Shared dealt cards only. The stable card is built from the signed-in user's
 * own follows, so a guest never has one to swipe. */
import { isUuid } from "./anon";

export type GuestChoice = "tail" | "fade" | "pass";

export interface GuestSwipeInput {
  anon_id: string;
  hand_id: number;
  card_id: number;
  choice: GuestChoice;
}

function asId(v: unknown): number | null {
  return typeof v === "number" && Number.isSafeInteger(v) && v > 0 ? v : null;
}

/** Null for anything malformed. Callers return 400 without detail: a bad body
 *  here is a bot or a stale tab, never a user to help. */
export function parseGuestSwipe(body: unknown): GuestSwipeInput | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  if (!isUuid(b.anon_id)) return null;
  const hand_id = asId(b.hand_id);
  const card_id = asId(b.card_id);
  if (hand_id === null || card_id === null) return null;
  const choice = b.choice;
  if (choice !== "tail" && choice !== "fade" && choice !== "pass") return null;
  return { anon_id: b.anon_id, hand_id, card_id, choice };
}
