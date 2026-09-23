/* Client half of the guest-swipe telemetry.
 *
 * Every call is fire-and-forget: the deck must feel identical whether or not
 * the write lands, so nothing awaits these and every failure is swallowed.
 * `keepalive` keeps a swipe made just before a navigation (the sign-in tap is
 * often the very next thing) from being cancelled in flight.
 */
import { getAnonId, peekAnonId } from "./anon";
import type { GuestChoice } from "./guest-swipe";

interface SwipeArgs {
  handId: number;
  cardId: number;
  choice: GuestChoice;
}

function post(url: string, payload: unknown): void {
  try {
    void fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* telemetry is never worth an exception in a swipe handler */
  }
}

/** One call per guest swipe. The route is idempotent per (browser, card), so
 *  a repeat after a refresh is a no-op rather than a second datapoint. */
export function logGuestSwipe({ handId, cardId, choice }: SwipeArgs): void {
  const anonId = getAnonId();
  if (!anonId) return;
  post("/api/tof/guest-swipe", { anon_id: anonId, hand_id: handId, card_id: cardId, choice });
}

/** Called once after sign-in, from a browser that swiped as a guest. Uses the
 *  stored id without creating one, so a visitor who signed in before ever
 *  swiping is not counted as a conversion. */
export function markGuestConverted(): void {
  const anonId = peekAnonId();
  if (!anonId) return;
  post("/api/tof/guest-swipe/convert", { anon_id: anonId });
}
