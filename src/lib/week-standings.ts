import type { DaySummary, SlateCapperSummary } from "./types";

/**
 * Weekly standings math for the slate page. Weekly = the Mon-Sun calendar
 * week containing the viewed slate date, summed from the per-day slate
 * responses so the backend's day-attribution logic (postponements,
 * multi-day parlays, stale voids, 6am ET rollover) is reused, never
 * duplicated.
 */

export interface WeekStandings {
  week_start: string;
  week_end: string;
  days_counted: string[];
  summary: DaySummary;
  capper_summary: SlateCapperSummary[];
}

const DAY_MS = 86_400_000;
const ROLLOVER_HOUR_ET = 6;

/** Current slate day (ET calendar date, rolling over at 6am ET), matching
 * the backend's _slate_today in public_slate.py. */
export function currentSlateDay(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? NaN);
  let d = Date.UTC(get("year"), get("month") - 1, get("day"));
  if (get("hour") < ROLLOVER_HOUR_ET) d -= DAY_MS;
  return new Date(d).toISOString().slice(0, 10);
}

/** Mon-Sun bounds of the week containing dateIso (a plain calendar date). */
export function weekBoundsFor(dateIso: string): { monday: string; sunday: string } {
  const d = new Date(`${dateIso}T00:00:00Z`);
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  const monday = new Date(d.getTime() - daysSinceMonday * DAY_MS);
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  return {
    monday: monday.toISOString().slice(0, 10),
    sunday: sunday.toISOString().slice(0, 10),
  };
}

/** Days of dateIso's week worth fetching: Monday through whichever comes
 * first of Sunday and today's slate day. Empty when the week is entirely
 * in the future (e.g. viewing next Monday's slate on Sunday night). */
export function weekDaysToFetch(dateIso: string, todaySlateDay: string): string[] {
  const { monday, sunday } = weekBoundsFor(dateIso);
  const last = sunday < todaySlateDay ? sunday : todaySlateDay;
  if (monday > last) return [];
  const out: string[] = [];
  const end = new Date(`${last}T00:00:00Z`).getTime();
  for (let t = new Date(`${monday}T00:00:00Z`).getTime(); t <= end; t += DAY_MS) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Sum per-day slate summaries into one weekly rollup. Days must be in
 * ascending date order; per-capper meta (handle, avatar, rank, streak)
 * is carried from the most recent day the capper appeared. */
export function sumWeekStandings(
  days: { date: string; day_summary: DaySummary; capper_summary: SlateCapperSummary[] }[],
  bounds: { monday: string; sunday: string },
): WeekStandings {
  const summary: DaySummary = {
    graded_count: 0, pending_count: 0, wins: 0, losses: 0,
    pushes: 0, voids: 0, net_units: 0,
  };
  const byCapper = new Map<number, SlateCapperSummary>();

  for (const day of days) {
    summary.graded_count += day.day_summary.graded_count;
    summary.pending_count += day.day_summary.pending_count;
    summary.wins += day.day_summary.wins;
    summary.losses += day.day_summary.losses;
    summary.pushes += day.day_summary.pushes;
    summary.voids += day.day_summary.voids;
    summary.net_units += day.day_summary.net_units;

    for (const row of day.capper_summary) {
      const prev = byCapper.get(row.capper_id);
      if (!prev) {
        byCapper.set(row.capper_id, { ...row });
        continue;
      }
      byCapper.set(row.capper_id, {
        // later day wins the meta fields (rank, avatar, streak)
        ...row,
        wins: prev.wins + row.wins,
        losses: prev.losses + row.losses,
        pushes: prev.pushes + row.pushes,
        voids: prev.voids + row.voids,
        graded_count: prev.graded_count + row.graded_count,
        pending_count: prev.pending_count + row.pending_count,
        net_units: prev.net_units + row.net_units,
      });
    }
  }

  summary.net_units = round2(summary.net_units);
  const capper_summary = [...byCapper.values()]
    .map((c) => ({ ...c, net_units: round2(c.net_units) }))
    .sort(
      (a, b) =>
        b.net_units - a.net_units ||
        b.graded_count - a.graded_count ||
        (a.capper_rank ?? 10 ** 9) - (b.capper_rank ?? 10 ** 9),
    );

  return {
    week_start: bounds.monday,
    week_end: bounds.sunday,
    days_counted: days.map((d) => d.date),
    summary,
    capper_summary,
  };
}
