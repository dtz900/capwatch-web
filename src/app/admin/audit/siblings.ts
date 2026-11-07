import { formatOdds, type QueueRow } from "./labels";
import { leadingToken, sameSubject, tokenOnGame, type GameTeams } from "./teamMatch";

/** Other picks parsed from the same tweet in the same sport. A null raw_id
 * never matches, so unrelated hand-entered picks are not grouped. */
function sameTweet(rows: QueueRow[], p: QueueRow): QueueRow[] {
  if (p.raw_id == null) return [];
  return rows.filter((r) => r.raw_id === p.raw_id && r.pick_id !== p.pick_id && r.sport === p.sport);
}

export function siblingIdsFor(rows: QueueRow[], p: QueueRow): number[] {
  return sameTweet(rows, p).map((r) => r.pick_id);
}

/** Siblings about the same player: a player patch applies to them. */
export function playerSiblings(rows: QueueRow[], p: QueueRow): QueueRow[] {
  return sameTweet(rows, p).filter((r) => sameSubject(p, r));
}

/** Siblings that plausibly belong to the given game: the same player, or a
 * selection whose team is one of the game's teams. Anything else is a
 * different game (a parlay leg on another matchup). */
export function gameSiblings(rows: QueueRow[], p: QueueRow, game: GameTeams): QueueRow[] {
  return sameTweet(rows, p).filter(
    (r) => sameSubject(p, r) || tokenOnGame(leadingToken(r.selection), game, r.sport),
  );
}

/** Siblings the checkbox can affect: same player, plus game matches when the game is known. */
export function candidateSiblings(rows: QueueRow[], p: QueueRow, game: GameTeams | null): QueueRow[] {
  const ids = new Set(playerSiblings(rows, p).map((r) => r.pick_id));
  if (game) for (const r of gameSiblings(rows, p, game)) ids.add(r.pick_id);
  return sameTweet(rows, p).filter((r) => ids.has(r.pick_id));
}

/** One line naming exactly the picks that will receive the change. */
export function siblingCopy(rows: QueueRow[]): string {
  const first = rows[0];
  if (rows.length === 1 && first) {
    const what = `${first.selection ?? first.market ?? "pick"} ${formatOdds(first.odds_taken)}`.trim();
    return `Same tweet also made pick #${first.pick_id} (${what}). Apply player and game to it.`;
  }
  return `Same tweet also made picks ${rows.map((r) => `#${r.pick_id}`).join(", ")}. Player and game changes apply to the ones that match.`;
}
