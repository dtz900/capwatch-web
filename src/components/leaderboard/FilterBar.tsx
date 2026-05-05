"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LeaderboardFilters } from "@/lib/api";

interface SegmentItem<T extends string | number | boolean> {
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

const SHOW: SegmentItem<boolean>[] = [
  { value: true, label: "Active" },
  { value: false, label: "All" },
];

const BET_TYPES: SegmentItem<LeaderboardFilters["bet_type"]>[] = [
  { value: "all",       label: "All" },
  { value: "straights", label: "Straights" },
  { value: "parlays",   label: "Parlays" },
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
      bet_type: next.bet_type,
      active_only: String(next.active_only),
    });
    startTransition(() => {
      router.push(`/?${params}`);
    });
  };

  const view = optimistic;

  const showLabel = SHOW.find((o) => o.value === view.active_only)?.label ?? "Active";
  const windowLabel = WINDOWS.find((o) => o.value === view.window)?.label ?? "30d";
  const sortLabel = SORTS.find((o) => o.value === view.sort)?.label ?? "Units";
  const betTypeLabel = BET_TYPES.find((o) => o.value === view.bet_type)?.label ?? "All";

  return (
    <>
      <div
        className={`sm:hidden flex items-center gap-2.5 text-[13px] font-bold flex-wrap
                    transition-opacity duration-150 ${isPending ? "opacity-70" : "opacity-100"}`}
        role="toolbar"
        aria-label="Filter leaderboard"
        aria-busy={isPending}
      >
        <InlinePicker
          ariaLabel="Show"
          value={view.active_only}
          label={showLabel}
          options={SHOW}
          onChange={(v) => apply({ ...view, active_only: v })}
        />
        <Bullet />
        <InlinePicker
          ariaLabel="Window"
          value={view.window}
          label={windowLabel}
          options={WINDOWS}
          onChange={(v) => apply({ ...view, window: v })}
        />
        <Bullet />
        <span className="text-[var(--color-text-muted)]">by</span>
        <InlinePicker
          ariaLabel="Sort by"
          value={view.sort}
          label={sortLabel}
          options={SORTS}
          onChange={(v) => apply({ ...view, sort: v })}
        />
        <Bullet />
        <InlinePicker
          ariaLabel="Bet type"
          value={view.bet_type}
          label={betTypeLabel}
          options={BET_TYPES}
          onChange={(v) => apply({ ...view, bet_type: v })}
        />
      </div>

      <div
        className={`hidden sm:flex w-full rounded-xl border border-[var(--color-border)]
                    bg-[rgba(255,255,255,0.015)]
                    px-2.5 py-2 items-center gap-3 flex-wrap
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
        <Group label="Show">
          <SegmentedControl
            items={SHOW}
            value={view.active_only}
            onChange={(v) => apply({ ...view, active_only: v })}
          />
        </Group>
        <Divider />
        <Group label="Bet type">
          <SegmentedControl
            items={BET_TYPES}
            value={view.bet_type}
            onChange={(v) => apply({ ...view, bet_type: v })}
          />
        </Group>
      </div>
    </>
  );
}

function Bullet() {
  return <span aria-hidden="true" className="text-[var(--color-text-muted)] opacity-50">·</span>;
}

function InlinePicker<T extends string | number | boolean>({
  value,
  label,
  options,
  ariaLabel,
  onChange,
}: {
  value: T;
  label: string;
  options: SegmentItem<T>[];
  ariaLabel: string;
  onChange: (next: T) => void;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value;
    const found = options.find((o) => String(o.value) === raw);
    if (found) onChange(found.value);
  };

  return (
    <span className="relative inline-flex items-center">
      <span
        className="px-2.5 py-1.5 rounded-md bg-[rgba(255,255,255,0.06)] text-[var(--color-text)]
                   inline-flex items-center gap-1 leading-none"
      >
        {label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
          className="text-[var(--color-text-muted)]"
        >
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <select
        value={String(value)}
        onChange={handleChange}
        aria-label={ariaLabel}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
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

function SegmentedControl<T extends string | number | boolean>({
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
            className={`px-3 py-2 sm:px-2.5 sm:py-1 rounded-md text-[12px] sm:text-[11px] font-bold leading-none transition-all duration-150 ${
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
