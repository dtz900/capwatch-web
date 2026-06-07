export function formatUnits(units: number): string {
  const sign = units >= 0 ? "+" : "-";
  return `${sign}${Math.abs(units).toFixed(1)}`;
}

export function formatUnits2(units: number): string {
  const sign = units >= 0 ? "+" : "-";
  return `${sign}${Math.abs(units).toFixed(2)}`;
}

/**
 * Like formatUnits but switches to 2 decimals when the magnitude is below 1
 * so very small profits/losses don't render as "+0.0".
 */
export function formatUnitsSmart(units: number): string {
  const sign = units >= 0 ? "+" : "-";
  const abs = Math.abs(units);
  const decimals = abs < 1 ? 2 : 1;
  return `${sign}${abs.toFixed(decimals)}`;
}

export function formatRoi(pct: number): string {
  const sign = pct >= 0 ? "+" : "-";
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}

export function formatWinRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function formatStreak(streak: number): string {
  if (streak > 0) return `W${streak}`;
  if (streak < 0) return `L${Math.abs(streak)}`;
  return "\u2014";
}

export function formatHandle(handle: string): string {
  return handle.startsWith("@") ? handle : `@${handle}`;
}

/**
 * Largest stake we treat as a real unit declaration. Above this we assume a
 * parser misread (e.g. a dollar figure like "$1,000" read as 1000 units) and
 * fall back to 1u. Mirrors the backend grader's MAX_REASONABLE_UNITS (10.0,
 * core/capper_grader.py) so the pick-history, pending, slate, and leaderboard
 * surfaces all agree on a pick's stake. Keep in sync with that constant.
 */
export const MAX_DECLARED_UNITS = 10;

/** Stake to show for a pick, clamping implausible values to the 1u baseline. */
export function displayUnits(units: number | null | undefined): number {
  if (units == null || units <= 0) return 1;
  return units > MAX_DECLARED_UNITS ? 1 : units;
}

/**
 * Date to show for a pick row. Prefer game_date (the ET calendar day the bet
 * plays/settles) over posted_at: a tweet posted at 11pm ET Friday for
 * Saturday's slate should read Saturday, and an evening-Pacific tweet whose
 * UTC timestamp has already rolled past midnight should still show the play
 * date. game_date is a tz-naive YYYY-MM-DD in ET, so anchor it at noon UTC to
 * avoid a day shift when this renders on a UTC server. When no game is linked,
 * fall back to posted_at formatted in ET (not the server's UTC, which would
 * roll a late-evening tweet onto the next calendar day).
 */
export function formatPickDate(
  gameDate: string | null | undefined,
  postedAt: string | null | undefined,
): string {
  if (gameDate) {
    return new Date(`${gameDate}T12:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  if (postedAt) {
    return new Date(postedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "America/New_York",
    });
  }
  return "";
}
