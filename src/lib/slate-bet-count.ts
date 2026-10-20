import type { SlatePick } from "@/lib/types";

/**
 * Bets, not rows: the slate API emits every parlay LEG as its own pick row,
 * so raw row counts overstate what a human calls picks (2026-08-18 card
 * shipped "483 picks tracked" when the board carried 305 straights + 39
 * parlays = 344 bets). A parlay is one bet, keyed by its parlay_id (Codex
 * #96: two parlays in one tweet share a tweet_url and would merge). The
 * tweet_url fallback covers payloads from before the API exposed parlay_id.
 */
export function slateBetCount(picks: SlatePick[]): number {
  let straights = 0;
  const parlays = new Set<string>();
  for (const p of picks) {
    if (p.kind === "parlay_leg") {
      parlays.add(
        p.parlay_id != null
          ? `id:${p.parlay_id}`
          : p.tweet_url ?? `${p.capper_id}:${p.posted_at ?? ""}`,
      );
    } else {
      straights += 1;
    }
  }
  return straights + parlays.size;
}
