/**
 * Visual treatment for top-3 leaderboard ranks. Used to highlight sharp picks
 * across the slate so the eye can immediately tell elite cappers from
 * everyone else.
 */

export interface SharpTier {
  color: string;
  label: "gold" | "silver" | "bronze";
}

export function sharpTier(rank: number | null | undefined): SharpTier | null {
  if (rank == null) return null;
  if (rank === 1) return { color: "var(--color-gold)", label: "gold" };
  if (rank === 2) return { color: "#d1d5db", label: "silver" };
  if (rank === 3) return { color: "#b87333", label: "bronze" };
  return null;
}
