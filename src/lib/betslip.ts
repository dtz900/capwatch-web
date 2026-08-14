import type { TodayPickEntry } from "@/lib/types";

/** One user_bet_slips row plus the client-joined outcome. */
export interface SlipEntry {
  id: number;
  pick_id: number | null;
  parlay_id: number | null;
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

/** American odds, absolute value 100..10000. Null = rejected input. The
 * ceiling covers parlay combined odds, which routinely run past +2000. */
export function clampOdds(v: number): number | null {
  if (!Number.isFinite(v)) return null;
  const a = Math.abs(v);
  return a >= 100 && a <= 10000 ? Math.round(v) : null;
}

export function clampStake(v: number): number | null {
  if (!Number.isFinite(v)) return null;
  // Two decimals: quarter-unit stakes (1.75u) are first-class; tenth-rounding
  // silently turned 1.75 into 1.8 (David hit it on the stake stepper).
  return v >= 0.1 && v <= 10 ? Math.round(v * 100) / 100 : null;
}

/** Default stake for a slip entry: the user's assigned per-capper stake
    wins, else the capper's own posted units carry over, else 1u. Every
    source passes through clampStake so a wild capper stake (10u+ ladder
    schemes) can't blow past the slip's range. */
export function defaultStake(
  capperStake: number | null | undefined,
  pick: TodayPickEntry,
): number {
  if (capperStake != null) {
    const s = clampStake(capperStake);
    if (s !== null) return s;
  }
  if (pick.units != null) {
    const s = clampStake(pick.units);
    if (s !== null) return s;
  }
  return 1.0;
}

/** Insert payload for user_bet_slips, or null when the pick has no id to
    bind to. A parlay tail is ONE row at the capper's combined odds (the
    feed's default, user-editable in the slip). Snapshot fields keep the
    row renderable if the pick is later purged upstream. */
export function slipInsertFromPick(
  userId: string,
  pick: TodayPickEntry,
  gameDate: string | null,
  capperStake?: number | null,
): Record<string, unknown> | null {
  if (pick.kind === "parlay") {
    if (pick.parlay_id == null) return null;
    return {
      user_id: userId,
      pick_id: null,
      parlay_id: pick.parlay_id,
      stake: defaultStake(capperStake, pick),
      odds: pick.odds_taken ?? -110,
      capper_id: pick.capper_id,
      capper_handle: pick.handle,
      matchup: null,
      market: "parlay",
      selection: pick.selection,
      line: null,
      game_date: gameDate,
    };
  }
  if (pick.pick_id == null) return null;
  return {
    user_id: userId,
    pick_id: pick.pick_id,
    parlay_id: null,
    stake: defaultStake(capperStake, pick),
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
  resetIso?: string | null,
): { today: number; allTime: number; pending: number } {
  let today = 0;
  let allTime = 0;
  let pending = 0;
  for (const e of entries) {
    // "Start fresh" baseline: rows logged before the reset stay in the
    // table (future bet-log history) but stop counting toward the tally.
    if (resetIso && e.created_at < resetIso) continue;
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
