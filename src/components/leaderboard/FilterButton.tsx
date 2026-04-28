"use client";
import { useState } from "react";
import { FiltersIcon } from "@/components/icons/FiltersIcon";
import { ChevronIcon } from "@/components/icons/ChevronIcon";
import type { LeaderboardFilters } from "@/lib/api";

const WINDOWS: { value: LeaderboardFilters["window"]; label: string }[] = [
  { value: "all_time", label: "All-time" },
  { value: "season",   label: "Season" },
  { value: "last_30",  label: "Last 30 days" },
  { value: "last_7",   label: "Last 7 days" },
];

const SORTS: { value: LeaderboardFilters["sort"]; label: string }[] = [
  { value: "roi_pct",      label: "ROI" },
  { value: "units_profit", label: "Units" },
  { value: "win_rate",     label: "Win %" },
  { value: "picks_count",  label: "Volume" },
];

const MIN_PICKS = [5, 10, 20, 50];

interface Props {
  filters: LeaderboardFilters;
  onChange: (next: LeaderboardFilters) => void;
}

export function FilterButton({ filters, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const labelWindow = WINDOWS.find((w) => w.value === filters.window)?.label ?? "All-time";
  const labelSort   = SORTS.find((s) => s.value === filters.sort)?.label ?? "ROI";
  const summary = `${labelWindow} · ${labelSort} · Min ${filters.min_picks} picks · ${filters.active_only ? "Active" : "All"}`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-[10px]
                   bg-[var(--color-bg-card)] border border-[var(--color-border)]
                   text-sm font-semibold hover:border-[var(--color-border-h)]"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <FiltersIcon />
        <span>
          <span className="text-[var(--color-text-muted)] mr-1">Filter:</span>
          {summary}
        </span>
        <ChevronIcon className="text-[var(--color-text-muted)]" />
      </button>

      {open && (
        <div role="dialog"
             className="absolute right-0 mt-2 z-40 w-[320px] p-4 rounded-xl
                        bg-[#13131a] border border-[var(--color-border)] shadow-xl space-y-4">
          <Group label="Window">
            {WINDOWS.map((w) => (
              <Option key={w.value}
                      checked={filters.window === w.value}
                      onChange={() => onChange({ ...filters, window: w.value })}
                      name="window" label={w.label} />
            ))}
          </Group>
          <Group label="Sort by">
            {SORTS.map((s) => (
              <Option key={s.value}
                      checked={filters.sort === s.value}
                      onChange={() => onChange({ ...filters, sort: s.value })}
                      name="sort" label={s.label} />
            ))}
          </Group>
          <Group label="Minimum picks">
            <select
              value={filters.min_picks}
              onChange={(e) => onChange({ ...filters, min_picks: parseInt(e.target.value, 10) })}
              className="bg-transparent border border-[var(--color-border)] rounded-md px-2 py-1 text-sm">
              {MIN_PICKS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Group>
          <label className="flex items-center justify-between text-sm">
            Active only
            <input
              type="checkbox"
              checked={filters.active_only}
              onChange={(e) => onChange({ ...filters, active_only: e.target.checked })}
            />
          </label>
        </div>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-[10px] uppercase tracking-[0.10em] text-[var(--color-text-muted)] font-bold mb-2">
        {label}
      </legend>
      <div className="flex flex-col gap-1">{children}</div>
    </fieldset>
  );
}

function Option({ checked, onChange, name, label }:
  { checked: boolean; onChange: () => void; name: string; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}
