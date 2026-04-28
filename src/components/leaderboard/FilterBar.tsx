"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LeaderboardFilters } from "@/lib/api";

interface SegmentItem<T extends string | number> {
  value: T;
  label: string;
}

const WINDOWS: SegmentItem<LeaderboardFilters["window"]>[] = [
  { value: "all_time", label: "All-time" },
  { value: "season",   label: "Season" },
  { value: "last_30",  label: "30d" },
  { value: "last_7",   label: "7d" },
];

const SORTS: SegmentItem<LeaderboardFilters["sort"]>[] = [
  { value: "units_profit", label: "Units" },
  { value: "roi_pct",      label: "ROI" },
  { value: "win_rate",     label: "Win %" },
  { value: "picks_count",  label: "Volume" },
];

interface Props {
  filters: LeaderboardFilters;
}

export function FilterBar({ filters }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState(filters);

  const apply = (next: LeaderboardFilters) => {
    setOptimistic(next);
    const params = new URLSearchParams({
      window: next.window,
      sort: next.sort,
      active_only: String(next.active_only),
    });
    startTransition(() => {
      router.push(`/?${params}`);
    });
  };

  const view = optimistic;

  return (
    <div
      className={`w-full rounded-xl border border-[var(--color-border)]
                  bg-[rgba(255,255,255,0.015)]
                  px-2.5 py-2 flex items-center gap-3 flex-wrap
                  transition-opacity duration-150 ${isPending ? "opacity-70" : "opacity-100"}`}
      role="toolbar"
      aria-label="Filter leaderboard"
      aria-busy={isPending}
    >
      <Group label="Window">
        <SegmentedControl
          items={WINDOWS}
          value={view.window}
          onChange={(v) => apply({ ...view, window: v })}
        />
      </Group>
      <Divider />
      <Group label="Sort">
        <SegmentedControl
          items={SORTS}
          value={view.sort}
          onChange={(v) => apply({ ...view, sort: v })}
        />
      </Group>
      <Divider />
      <Toggle
        label="Active only"
        value={view.active_only}
        onChange={(v) => apply({ ...view, active_only: v })}
      />
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[var(--color-text-muted)] pl-1.5 hidden sm:inline">
        {label}
      </span>
      {children}
    </div>
  );
}

function Divider() {
  return <span aria-hidden="true" className="hidden md:block w-px h-5 bg-[var(--color-border)]" />;
}

function SegmentedControl<T extends string | number>({
  items,
  value,
  onChange,
}: {
  items: SegmentItem<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      className="inline-flex bg-[rgba(255,255,255,0.025)] rounded-lg p-0.5 gap-0.5
                 border border-[rgba(255,255,255,0.04)]"
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={String(item.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(item.value)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold leading-none transition-all duration-150 ${
              selected
                ? "bg-[var(--color-gold)] text-black shadow-[0_2px_8px_-2px_rgba(245,197,74,0.45)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.04)]"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      className="flex items-center gap-2.5 px-2 py-1 rounded-md hover:bg-[rgba(255,255,255,0.04)]
                 transition-colors duration-150 cursor-pointer"
    >
      <span className="text-[11px] font-bold uppercase tracking-[0.10em] text-[var(--color-text-soft)]">
        {label}
      </span>
      <span
        className={`relative inline-block w-7 h-[14px] rounded-full transition-colors duration-200 ${
          value ? "bg-[var(--color-gold)]" : "bg-[rgba(255,255,255,0.15)]"
        }`}
      >
        <span
          className={`absolute top-[2px] w-[10px] h-[10px] rounded-full bg-white transition-transform duration-200 ${
            value ? "translate-x-[16px]" : "translate-x-[2px]"
          }`}
        />
      </span>
    </button>
  );
}
