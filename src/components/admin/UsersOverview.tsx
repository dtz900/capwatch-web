/* The top of the admin Users page: what the roster adds up to, and the shape
   of signups over the last three weeks. Both are server-rendered; the list
   below them is the interactive part. */

export interface Stat {
  label: string;
  value: number;
  /** Small line under the number, for the part the number does not say. */
  note?: string;
}

export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((s) => (
        <div key={s.label} className="bg-[#0d0d11] px-4 py-3">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            {s.label}
          </div>
          <div className="mt-1 text-[26px] font-extrabold leading-none tabular-nums text-[var(--color-text)]">
            {s.value}
          </div>
          {s.note && (
            <div className="mt-1 text-[11px] font-semibold text-[var(--color-text-soft)]">{s.note}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export type { DayCount } from "@/lib/admin/signup-trend";
import type { DayCount } from "@/lib/admin/signup-trend";

/** Signups per day. Flat when nothing is happening, which is the point: the
 *  shape of the last three weeks is the fastest read on whether a launch or a
 *  post actually moved anything. */
export function SignupTrend({ days }: { days: DayCount[] }) {
  const peak = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((n, d) => n + d.count, 0);
  const last = days[days.length - 1];
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[#0d0d11] px-4 py-3">
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          Signups · last {days.length} days
        </div>
        <div className="text-[11px] font-bold tabular-nums text-[var(--color-text-soft)]">
          {total} total · peak {peak}
        </div>
      </div>
      <div className="mt-3 flex h-[74px] items-end gap-[3px]">
        {days.map((d, i) => {
          const isToday = i === days.length - 1;
          const h = d.count === 0 ? 2 : Math.max(8, Math.round((d.count / peak) * 74));
          return (
            <div
              key={d.date}
              title={`${d.date}: ${d.count}`}
              style={{ height: `${h}px` }}
              className={
                isToday
                  ? "flex-1 rounded-sm bg-[var(--color-pos)]"
                  : d.count === 0
                    ? "flex-1 rounded-sm bg-[rgba(247,243,233,0.10)]"
                    : "flex-1 rounded-sm bg-[rgba(247,243,233,0.30)]"
              }
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-bold text-[var(--color-text-muted)]">
        <span>{days[0]?.date.slice(5)}</span>
        <span>
          today {last?.count ?? 0}
        </span>
      </div>
    </div>
  );
}
