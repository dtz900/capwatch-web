import type { SlatePick } from "@/lib/types";

// Valid American prices live outside (-100, 100). Anything inside that band is
// a mis-stored value (decimal odds, a stray line number) and would poison the
// consensus figure.
export function isAmericanOdds(v: number | null | undefined): boolean {
  return typeof v === "number" && Number.isFinite(v) && Math.abs(v) >= 100 && Math.abs(v) <= 10000;
}

// Only straights feed the consensus price. A parlay leg's odds_taken is the
// leg's OWN price on a per-leg slip but the whole TICKET's price on a
// combined-odds slip (the parser stamps it on leg 0), and the row cannot tell
// which. NE @ SEA Week 1 (2026-09-09): six Seahawks ML parlay legs carried
// +200, +419, +419, +775, +1994 and +943737 next to two real -160/-165
// straights, and the card printed "consensus +419" for a 3.5-point favorite.
// Parlay legs still count as sharps on the side; they just do not price it.
export function feedsConsensusOdds(p: Pick<SlatePick, "kind" | "odds_taken">): boolean {
  return p.kind !== "parlay_leg" && isAmericanOdds(p.odds_taken);
}

export function medianInt(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const med = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const rounded = Math.round(med);
  // An even count straddling the +/-100 gap can average into the invalid band.
  return Math.abs(rounded) >= 100 ? rounded : null;
}
