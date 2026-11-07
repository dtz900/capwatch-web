/** After removing the row at `removedIndex`, the id to select from the rows
 * that remain: the one that slid into the slot, else the new last row. */
export function nextSelection(rows: ReadonlyArray<{ pick_id: number }>, removedIndex: number): number | null {
  if (rows.length === 0) return null;
  const i = Math.max(0, Math.min(removedIndex, rows.length - 1));
  return rows[i].pick_id;
}
