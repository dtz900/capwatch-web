import { CapperRow, Chevron } from "./CapperDayRanking";
import type { WeekStandings } from "@/lib/week-standings";

interface Props {
  week: WeekStandings;
  toggleSlot?: React.ReactNode;
  /** Render as a collapsed details strip (mirrors the daily live view).
   * Used while the day's slate is still grading so the running weekly
   * total doesn't outshine the in-progress night. */
  collapsed?: boolean;
  /** Controlled open state, shared with the daily view so switching tabs
   * keeps the panel open instead of remounting closed. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function fmtDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Weekly counterpart of CapperDayRanking. Prominent card once the day is
 * final; collapsed details strip while the day is still live. */
export function CapperWeekRanking({
  week,
  toggleSlot,
  collapsed = false,
  open,
  onOpenChange,
}: Props) {
  const ranked = week.capper_summary.filter((c) => c.graded_count > 0);
  if (ranked.length === 0) return null;

  const range = `${fmtDay(week.week_start)} - ${fmtDay(week.week_end)}`;
  const s = week.summary;
  const subtitle =
    s.pending_count === 0
      ? `${s.graded_count} ${s.graded_count === 1 ? "pick" : "picks"} · ${ranked.length} ${ranked.length === 1 ? "sharp" : "sharps"}`
      : `${s.graded_count} graded · ${s.pending_count} pending`;

  const rows = (
    <div className="mt-4 flex flex-col">
      {ranked.map((c, idx) => (
        <CapperRow key={c.capper_id} rank={idx + 1} capper={c} prominent={!collapsed} />
      ))}
    </div>
  );

  if (collapsed) {
    return (
      <details
        className="group rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-5 py-4"
        open={open}
        onToggle={(e) => onOpenChange?.(e.currentTarget.open)}
      >
        <summary className="list-none cursor-pointer select-none flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {/* The date range is dropped on mobile: "This week" already says
                it, and the graded/pending counts matter more in that space. */}
            <span className="text-[10px] uppercase tracking-[0.06em] sm:tracking-[0.18em] text-[var(--color-text-muted)] font-bold truncate">
              This week<span className="hidden sm:inline"> · {range}</span> · {subtitle}
            </span>
          </div>
          <span className="text-[11px] text-[var(--color-text-muted)] font-semibold shrink-0 flex items-center gap-1">
            <span className="hidden sm:inline">
              <span className="group-open:hidden">Show ranking</span>
              <span className="hidden group-open:inline">Hide</span>
            </span>
            <Chevron />
          </span>
        </summary>
        {/* Pills below the header, mirroring CapperDayRanking's live view:
            the summary row keeps its full width for the counts on mobile. */}
        {toggleSlot ? <div className="mt-3 flex">{toggleSlot}</div> : null}
        {rows}
      </details>
    );
  }

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
      {rows}
    </section>
  );
}
