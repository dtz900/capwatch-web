/**
 * VIP sports that are public on the site but not yet open for selling.
 * Mirrors the platform's VIP_LOCKED_SPORTS: the platform writes these as
 * ineligible with reason `sport_locked` and answers every post with a 403
 * `sport_locked`. The web never offers them in the builder.
 */
export const VIP_LOCKED_SPORTS = ["NCAAB"] as const;

export function isVipLockedSport(sport: unknown): boolean {
  return typeof sport === "string" && (VIP_LOCKED_SPORTS as readonly string[]).includes(sport.toUpperCase());
}

/** A VIP eligibility row is locked by sport or by the platform's reason. */
export function isVipLockedRow(row: { sport: unknown; reason?: string | null }): boolean {
  return row.reason === "sport_locked" || isVipLockedSport(row.sport);
}

export function vipLockedCopy(sport: unknown): string {
  return `${String(sport).toUpperCase()} VIP coming soon`;
}
