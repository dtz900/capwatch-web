/* Composer picks store the side separately: a team total is
 * selection="Lakers", direction="over", line=112.5. Parsed X picks already
 * carry it in the text ("Cavs TT U120.5"). Fold the side into the selection
 * once so every VIP surface reads "Lakers Over 112.5". */

const HAS_SIDE = /\b(over|under|o|u)\b|\b[ou]\d/i;

export function vipSelection(p: {
  selection: string;
  direction?: string | null;
  line?: number | null;
}): string {
  const sel = p.selection.trim();
  const dir = (p.direction ?? "").toLowerCase();
  if ((dir !== "over" && dir !== "under") || p.line == null || HAS_SIDE.test(sel)) return sel;
  return `${sel} ${dir === "over" ? "Over" : "Under"}`;
}
