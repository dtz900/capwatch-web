/**
 * Prefill for the game team filter. NCAAB team names are long and varied, so
 * the selection minus its trailing line/odds token is a good search seed.
 * Other sports bind on abbreviations already, so they start empty.
 */
export function teamQueryFromSelection(selection: string | null, sport: string): string {
  if (!selection || sport !== "NCAAB") return "";
  return selection
    .replace(/\s+(?:1H|2H|1Q|2Q|3Q|4Q)\s*$/i, "")
    .replace(/\s+(?:ML|[+-]\d+(?:\.\d+)?)\s*$/i, "")
    .trim();
}
