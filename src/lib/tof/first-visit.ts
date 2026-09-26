/* Whether the Tail or Fade hero should land OPEN instead of folded.
 *
 * The fold exists so a returning visitor does not get a game they have
 * already played taking over the page. A deck they have NOT played is the
 * opposite case: a collapsed title above the leaderboard gives them nothing
 * to swipe. So the hero opens itself whenever this visitor has no swipes on
 * the current hand (David, 2026-09-26: "if a new deck hasn't been swiped on
 * it should be open on first load by default"), and folds once they have
 * played it or once the hand has locked and there is nothing left to swipe.
 *
 * Pure so the policy can be read and tested on its own; the component owns
 * the storage reads, the plays load and the once-per-mount guard.
 */
export interface ArrivalState {
  /** The first getSession() has landed. Before that everyone looks signed out. */
  authReady: boolean;
  isLoggedIn: boolean;
  /** Null until the hand is fetched: there is nothing to open onto yet. */
  slateDate: string | null;
  handStatus: "open" | "locked" | "graded" | null;
  /** Guest choices already stored for this slate, from an earlier visit today. */
  guestChoiceCount: number;
  /** Signed-in plays on this hand, null until loaded. A guest passes 0 once
   *  the stored stash has hydrated into state, null before that. */
  playsOnThisHand: number | null;
}

export type LandVerdict = "open" | "fold" | "wait";

export function shouldLandOpen(s: ArrivalState): LandVerdict {
  if (!s.authReady || !s.slateDate || !s.handStatus) return "wait";
  // Plays (member) or the stash (guest) not in yet: no verdict, the
  // component keeps the decision pending rather than guessing from empty.
  if (s.playsOnThisHand === null) return "wait";
  // A locked or graded hand has nothing to swipe; opening it is the old
  // "game you already played" takeover.
  if (s.handStatus !== "open") return "fold";
  const swipes = s.isLoggedIn ? s.playsOnThisHand : s.guestChoiceCount;
  return swipes === 0 ? "open" : "fold";
}
