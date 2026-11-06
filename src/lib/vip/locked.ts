/**
 * VIP sports that are public on the site but not yet open for selling.
 * The platform decides: it writes a locked sport's eligibility row with
 * reason `sport_locked` and answers every post with a 403 `sport_locked`.
 * Nothing is hard-coded here, so the "coming soon" UI disappears on its own
 * the moment the platform stops reporting the reason.
 */
type SportRow = { sport: unknown; reason?: string | null };

/** A VIP eligibility row is locked when the platform says so. */
export function isVipLockedRow(row: SportRow): boolean {
  return row.reason === "sport_locked";
}

/** Upper-case sports the platform currently reports as locked. */
export function lockedSportsFrom(rows: SportRow[] | null | undefined): string[] {
  return [...new Set((rows ?? []).filter(isVipLockedRow).map((r) => String(r.sport).toUpperCase()))];
}

export function vipLockedCopy(sport: unknown): string {
  return `${String(sport).toUpperCase()} VIP coming soon`;
}
