/* Whether the Tail or Fade hero should land OPEN instead of folded.
 *
 * The fold exists so a returning visitor does not get a game they have
 * already played taking over the page. A first-time visitor is the opposite
 * case: they arrive from a post that says "swipe right to tail", and a
 * collapsed title above the leaderboard gives them nothing to swipe. So the
 * first visit opens itself and every later one folds, as before.
 *
 * Pure so the policy can be read and tested on its own; the component owns
 * the storage reads and the once-per-mount guard.
 */
export interface ArrivalState {
  /** The first getSession() has landed. Before that everyone looks signed out. */
  authReady: boolean;
  isLoggedIn: boolean;
  /** Null until the hand is fetched: there is nothing to open onto yet. */
  slateDate: string | null;
  /** This browser has swiped a card before (it has a stored telemetry id). */
  hasSwipedBefore: boolean;
  /** Guest choices already stored for this slate, from an earlier visit today. */
  guestChoiceCount: number;
}

export function shouldLandOpen(s: ArrivalState): boolean {
  if (!s.authReady || !s.slateDate) return false;
  // A signed-in user keeps the fold: the deck is already part of their day.
  if (s.isLoggedIn) return false;
  return !s.hasSwipedBefore && s.guestChoiceCount === 0;
}
