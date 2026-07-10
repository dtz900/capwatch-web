import type { TodayPickEntry } from "@/lib/types";

/** One user_bet_slips row plus the client-joined outcome. */
export interface SlipEntry {
  id: number;
  pick_id: number | null;
  stake: number;
  odds: number;
  capper_id: number | null;
  capper_handle: string | null;
  matchup: string | null;
  market: string | null;
  selection: string | null;
  line: number | null;
  game_date: string | null;
  created_at: string;
  outcome: "W" | "L" | "P" | "V" | null;
}

export function netOdds(odds: number): number {
  return odds > 0 ? odds / 100 : 100 / Math.abs(odds);
}

/** Profit in units at the USER's stake and odds. Null while pending. */
export function slipProfit(
  outcome: SlipEntry["outcome"],
  stake: number,
  odds: number,
): number | null {
  if (outcome === null) return null;
  if (outcome === "W") return stake * netOdds(odds);
  if (outcome === "L") return -stake;
  return 0; // push and void return the stake
}

/** American odds, absolute value 100..2000. Null = rejected input. */
export function clampOdds(v: number): number | null {
  if (!Number.isFinite(v)) return null;
  const a = Math.abs(v);
  return a >= 100 && a <= 2000 ? Math.round(v) : null;
}

export function clampStake(v: number): number | null {
  if (!Number.isFinite(v)) return null;
  return v >= 0.1 && v <= 10 ? Math.round(v * 10) / 10 : null;
}

/** Insert payload for user_bet_slips, or null when the pick is not
    addable (parlay, or no pick_id to bind to). Snapshot fields keep the
    row renderable if the pick is later purged upstream. */
export function slipInsertFromPick(
  userId: string,
  pick: TodayPickEntry,
  gameDate: string | null,
): Record<string, unknown> | null {
  if (pick.kind !== "straight" || pick.pick_id == null) return null;
  return {
    user_id: userId,
    pick_id: pick.pick_id,
    stake: 1.0,
    odds: pick.odds_taken ?? -110,
    capper_id: pick.capper_id,
    capper_handle: pick.handle,
    matchup: pick.matchup,
    market: pick.market,
    selection: pick.selection,
    line: pick.line,
    game_date: gameDate,
  };
}

export function slipTotals(
  entries: SlipEntry[],
  todayIso: string | null,
): { today: number; allTime: number; pending: number } {
  let today = 0;
  let allTime = 0;
  let pending = 0;
  for (const e of entries) {
    const p = slipProfit(e.outcome, e.stake, e.odds);
    if (p === null) {
      pending += 1;
      continue;
    }
    allTime += p;
    if (todayIso && e.game_date === todayIso) today += p;
  }
  return { today, allTime, pending };
}
