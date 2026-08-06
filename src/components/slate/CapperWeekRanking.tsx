import { CapperRow } from "./CapperDayRanking";
import type { WeekStandings } from "@/lib/week-standings";

interface Props {
  week: WeekStandings;
  toggleSlot?: React.ReactNode;
}

function fmtDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Weekly counterpart of CapperDayRanking's final card: always the
 * prominent list style since a week is a running total, never "live". */
export function CapperWeekRanking({ week, toggleSlot }: Props) {
  const ranked = week.capper_summary.filter((c) => c.graded_count > 0);
  if (ranked.length === 0) return null;

  const range = `${fmtDay(week.week_start)} - ${fmtDay(week.week_end)}`;
  const s = week.summary;
  const subtitle =
    s.pending_count === 0
      ? `${s.graded_count} ${s.graded_count === 1 ? "pick" : "picks"} · ${ranked.length} ${ranked.length === 1 ? "sharp" : "sharps"}`
      : `${s.graded_count} graded · ${s.pending_count} pending`;

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-5 py-5 sm:px-7 sm:py-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-[20px] sm:text-[22px] font-extrabold tracking-[-0.02em] leading-none">
          This week
        </h2>
        <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold tabular-nums">
          {range} · {subtitle}
        </span>
        {toggleSlot ? <div className="ml-auto">{toggleSlot}</div> : null}
      </div>
      <div className="mt-4 flex flex-col">
        {ranked.map((c, idx) => (
          <CapperRow key={c.capper_id} rank={idx + 1} capper={c} prominent />
        ))}
      </div>
    </section>
  );
}
