"use client";
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

const MIN_PICKS: SegmentItem<number>[] = [
  { value: 5, label: "5" },
  { value: 10, label: "10" },
  { value: 20, label: "20" },
  { value: 50, label: "50" },
];

interface Props {
  filters: LeaderboardFilters;
}

export function FilterBar({ filters }: Props) {
  const router = useRouter();
  const apply = (next: LeaderboardFilters) => {
    const params = new URLSearchParams({
      window: next.window,
      sort: next.sort,
      min_picks: String(next.min_picks),
      active_only: String(next.active_only),
    });
    router.push(`/?${params}`);
  };

  return (
    <div
      className="w-full rounded-xl border border-[var(--color-border)]
                 bg-[rgba(255,255,255,0.015)]
                 px-2.5 py-2 flex items-center gap-2 flex-wrap"
      role="toolbar"
      aria-label="Filter leaderboard"
    >
      <Group label="Window">
        <SegmentedControl
          items={WINDOWS}
          value={filters.window}
          onChange={(v) => apply({ ...filters, window: v })}
        />
      </Group>
      <Divider />
      <Group label="Sort">
        <SegmentedControl
          items={SORTS}
          value={filters.sort}
          onChange={(v) => apply({ ...filters, sort: v })}
        />
      </Group>
      <Divider />
      <Group label="Min">
        <SegmentedControl
          items={MIN_PICKS}
          value={filters.min_picks}
          onChange={(v) => apply({ ...filters, min_picks: v })}
        />
      </Group>
      <Divider />
      <Toggle
        label="Active only"
        value={filters.active_only}
        onChange={(v) => apply({ ...filters, active_only: v })}
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
  return <span aria-hidden="true" className="hidden md:block w-px h-5 bg-[var(--color-border)] mx-0.5" />;
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
      className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[rgba(255,255,255,0.04)]
                 transition-colors duration-150 cursor-pointer"
    >
      <span
        className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${
          value ? "bg-[var(--color-gold)]" : "bg-[rgba(255,255,255,0.12)]"
        }`}
      >
        <span
          className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 shadow-md ${
            value ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className="text-[11px] font-bold uppercase tracking-[0.10em] text-[var(--color-text-soft)]">
        {label}
      </span>
    </button>
  );
}
