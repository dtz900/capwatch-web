import type { QueueRow } from "./labels";

/** Other picks parsed from the same tweet in the same sport. A null raw_id
 * never matches, so unrelated hand-entered picks are not grouped. */
export function siblingIdsFor(rows: QueueRow[], p: QueueRow): number[] {
  if (p.raw_id == null) return [];
  return rows
    .filter((r) => r.raw_id === p.raw_id && r.pick_id !== p.pick_id && r.sport === p.sport)
    .map((r) => r.pick_id);
}
