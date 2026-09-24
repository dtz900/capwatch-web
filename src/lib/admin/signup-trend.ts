/* The signup-per-day window behind the admin roster chart.
 *
 * Every date here is a Pacific calendar day, resolved on the server. Two
 * separate reasons for that: the page ships this to a client component, which
 * would format a raw timestamp differently on each side of the wire, and
 * "today" should mean today where David is rather than in whichever region
 * rendered the page.
 */
export const TZ = "America/Los_Angeles";

/** The Pacific calendar day an instant falls on, as YYYY-MM-DD. en-CA gives
 *  exactly that format, which also sorts and keys correctly. */
export function ptDayKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

/* Calendar-day arithmetic on a YYYY-MM-DD key, anchored in UTC so no DST rule
   can make a step 23 or 25 hours long. Advancing a Date by 24 hours instead
   would, on the two days a year Pacific changes offset, land twice inside the
   same Pacific date and skip the next one. */
export function shiftKey(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

export interface DayCount {
  /** YYYY-MM-DD, oldest first. */
  date: string;
  count: number;
}

/**
 * `days` consecutive Pacific days ending on `todayKey`, each carrying how many
 * of `createdAt` fall on it.
 */
export function buildTrend(createdAt: string[], todayKey: string, days: number): DayCount[] {
  const counts = new Map<string, number>();
  for (const iso of createdAt) {
    const k = ptDayKey(new Date(iso));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const out: DayCount[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = shiftKey(todayKey, -i);
    out.push({ date: k, count: counts.get(k) ?? 0 });
  }
  return out;
}

/**
 * A calendar day as a short label ("Sep 24").
 *
 * A date-only value (a `date` column such as `tof_tailer_stats.last_played_date`)
 * is already a calendar day, so it is formatted from its own parts: parsing it
 * would read midnight UTC and shift it a day earlier in Pacific. Anything else
 * is an instant and is resolved in Pacific.
 */
export function dayLabel(iso: string | null): string | null {
  if (!iso) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12)
    : new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    ...(dateOnly ? {} : { timeZone: TZ }),
    month: "short",
    day: "numeric",
  });
}
