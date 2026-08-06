"use client";

import { useState } from "react";
import { CapperDayRanking } from "./CapperDayRanking";
import { CapperWeekRanking } from "./CapperWeekRanking";
import type { WeekStandings } from "@/lib/week-standings";
import type { SlateCapperSummary } from "@/lib/types";

interface Props {
  daily: SlateCapperSummary[];
  totalGraded: number;
  totalPending: number;
  week: WeekStandings | null;
  /** "Tonight" on today's slate, "Tomorrow" on tomorrow's. */
  dayLabel: string;
}

type Tab = "day" | "week";

/** Standings card with a day/week toggle. Daily keeps every behavior of
 * CapperDayRanking (collapsed live view, prominent final view); weekly is
 * always the prominent card. With only one view available this renders
 * that view alone, no pills. */
export function StandingsSection({ daily, totalGraded, totalPending, week, dayLabel }: Props) {
  const dailyHasRows = totalGraded > 0 && daily.some((c) => c.graded_count > 0);
  const weekHasRows = (week?.capper_summary ?? []).some((c) => c.graded_count > 0);
  const [tab, setTab] = useState<Tab>(dailyHasRows ? "day" : "week");

  if (!dailyHasRows && !weekHasRows) return null;

  const pills =
    dailyHasRows && weekHasRows ? (
      <TogglePills tab={tab} onChange={setTab} dayLabel={dayLabel} />
    ) : undefined;

  if ((tab === "week" || !dailyHasRows) && week && weekHasRows) {
    return <CapperWeekRanking week={week} toggleSlot={pills} />;
  }
  return (
    <CapperDayRanking
      summary={daily}
      totalGraded={totalGraded}
      totalPending={totalPending}
      toggleSlot={pills}
    />
  );
}

function TogglePills({
  tab,
  onChange,
  dayLabel,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
  dayLabel: string;
}) {
  const base =
    "px-2.5 py-1 rounded-full text-[11px] font-bold tracking-[0.02em] transition-colors";
  const active = "bg-[rgba(255,255,255,0.08)] text-[var(--color-text)]";
  const idle = "text-[var(--color-text-muted)] hover:text-[var(--color-text)]";
  const mk = (t: Tab, label: string) => (
    <button
      type="button"
      aria-pressed={tab === t}
      className={`${base} ${tab === t ? active : idle}`}
      onClick={(e) => {
        // preventDefault keeps a click inside the live view's <summary>
        // from toggling the details element open/closed.
        e.preventDefault();
        e.stopPropagation();
        onChange(t);
      }}
    >
      {label}
    </button>
  );
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] p-0.5">
      {mk("day", dayLabel)}
      {mk("week", "This week")}
    </span>
  );
}
