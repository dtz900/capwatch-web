/**
 * Visual treatment for top-3 leaderboard ranks. All three share the same
 * premium-blue treatment so they read as a unified "elite tier" instead of
 * a 1st/2nd/3rd-place hierarchy.
 */

export interface SharpTier {
  color: string;
  label: "elite";
}

const ELITE_COLOR = "#60a5fa";
const ELITE_GLOW = "rgba(96, 165, 250, 0.45)";

export function sharpTier(rank: number | null | undefined): SharpTier | null {
  if (rank == null) return null;
  if (rank <= 3) return { color: ELITE_COLOR, label: "elite" };
  return null;
}

/**
 * Box-shadow string for the avatar ring + soft halo so elite sharps stand out
 * even against busy backgrounds.
 */
export const ELITE_RING_SHADOW = `0 0 0 2px ${ELITE_COLOR}, 0 0 8px ${ELITE_GLOW}`;
