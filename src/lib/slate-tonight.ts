import type { SlateSport } from "./api";
import type { SlateResponse } from "./types";

// Pure helpers only: SportToggle is a client component and imports this file.
// The fetch lives in slate-tonight-fetch.ts.

/** Games still worth checking tonight, per league. A league that could not be read is absent. */
export type TonightCounts = Partial<Record<SlateSport, number>>;

/**
 * How many of a league's games tonight have not gone final. The MLB and NBA
 * "today" slates already are the day; the NFL board is a week, so only games
 * kicking off on the slate day count.
 */
export function tonightGameCount(data: SlateResponse | null, sport: SlateSport, slateDay: string): number {
  if (!data) return 0;
  return data.games.filter((g) => g.game_state !== "final" && (sport !== "nfl" || g.game_date === slateDay)).length;
}

/** Caption under an unselected league chip: "9 tonight". */
export function tonightCaption(n: number): string {
  return `${n} tonight`;
}
