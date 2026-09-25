/* Replaying the picks someone made as a guest, once they sign in.
 *
 * The order is the whole point. The username prompt used to run BEFORE the
 * writes, so a brand-new account that dismissed the claim modal lost every
 * pick it had just made, with nothing on screen to say so (prosportshq00,
 * 2026-09-24: two tails swiped at 20:19 UTC, signed up at 20:21, zero plays
 * written). A username is only how someone appears on the board, and the
 * board skips a user without one, so it can never be the reason a pick fails
 * to save.
 */
import type { TofChoice } from "@/lib/types";

export interface ReplayItem<C> {
  card: C;
  choice: TofChoice;
}

export interface ReplayDeps<C> {
  todo: ReplayItem<C>[];
  /** Resolves false when the row could not be written (locked card, RLS). */
  writePlay: (card: C, choice: TofChoice) => Promise<boolean>;
  /** Opens the claim modal. Called after the writes and never awaited. */
  requireUsername: () => void;
}

export interface ReplayResult {
  written: number;
  /** False when a write failed partway: the caller keeps the stash and lets
   *  the next mount try again. */
  ok: boolean;
}

export async function replayGuestPicks<C>({ todo, writePlay, requireUsername }: ReplayDeps<C>): Promise<ReplayResult> {
  let written = 0;
  for (const { card, choice } of todo) {
    const ok = await writePlay(card, choice);
    if (!ok) return { written, ok: false };
    written += 1;
  }
  // A pass needs no name on a board, so only a real tail or fade prompts.
  if (todo.some((x) => x.choice !== "pass")) requireUsername();
  return { written, ok: true };
}
