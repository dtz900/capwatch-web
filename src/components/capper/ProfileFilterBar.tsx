"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useCapperFilters } from "@/components/capper/CapperFilterProvider";
import { DateRangePicker } from "@/components/capper/DateRangePicker";
import { MarketSelect } from "@/components/capper/MarketSelect";
import { formatRangeLabel } from "@/lib/capperFilters";
import type { BetTypeFilter, Window } from "@/lib/types";

const WINDOWS: { value: Window; label: string }[] = [
  { value: "last_7", label: "Last 7" },
  { value: "last_30", label: "Last 30" },
  { value: "season", label: "Season" },
  { value: "all_time", label: "All-time" },
];

const BET_TYPES: { value: BetTypeFilter; label: string }[] = [
  { value: "all", label: "All bets" },
  { value: "straights", label: "Straights" },
  { value: "parlays", label: "Parlays" },
];

/** The unified Window / Bet type / Market bar that drives the sparkline and
 * stat band. Controlled by the filter context (no URL navigation per click).
 *
 * Two layouts:
 *   - default (desktop): compact, left-aligned segmented pills in one row.
 *   - stacked (mobile FilterSheet): each control on its own labeled row with
 *     full-width equal segments, for a calmer, more premium sheet. */
export function ProfileFilterBar({ stacked = false }: { stacked?: boolean }) {
  const {
    window,
    betType,
    market,
    marketOptions,
    marketDisabled,
    setWindow,
    setBetType,
    setMarket,
    range,
    setRange,
    clearRange,
  } = useCapperFilters();
  const [pickerOpen, setPickerOpen] = useState(false);

  // The Bet type chip shows Straights as active when a market is selected,
  // so the user never sees "All bets · Spread" with fewer picks than expected.
  const betActive: BetTypeFilter = market ? "straights" : betType;

  if (stacked) {
    return (
      <div className="flex flex-col gap-5">
        <Group label="Window">
          <Seg ariaLabel="Window" options={WINDOWS} value={(range ? "" : window) as Window} onSelect={setWindow} fill />
        </Group>
        <Group label="Bet type">
          <Seg ariaLabel="Bet type" options={BET_TYPES} value={betActive} onSelect={setBetType} fill />
        </Group>
        {marketOptions.length > 0 && (
          <Group label="Market">
            <MarketSelect
              options={marketOptions}
              value={market}
              onSelect={setMarket}
              disabled={marketDisabled}
              stacked
            />
          </Group>
        )}
        <Group label="Date range">
          <div className="relative">
            <button
              type="button"
              data-range-trigger
              onClick={() => setPickerOpen((o) => !o)}
              aria-pressed={!!range}
              className={`rounded-md px-3 py-2.5 sm:py-1.5 text-[12px] sm:text-[11px] font-bold leading-none transition-all duration-150 ${
                range
                  ? "bg-[var(--color-gold)] text-black shadow-[0_2px_8px_-2px_rgba(245,197,74,0.45)]"
                  : "bg-[rgba(255,255,255,0.04)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {range ? formatRangeLabel(range.start, range.end) : "Custom range"}
            </button>
            {pickerOpen && (
              <div className="absolute z-20 mt-1">
                <DateRangePicker
                  todayStr={new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" })}
                  initialStart={range?.start ?? null}
                  initialEnd={range?.end ?? null}
                  onApply={(s, e) => { setRange(s, e); setPickerOpen(false); }}
                  onClear={() => { clearRange(); setPickerOpen(false); }}
                  onDismiss={() => setPickerOpen(false)}
                />
              </div>
            )}
          </div>
        </Group>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Seg ariaLabel="Window" options={WINDOWS} value={(range ? "" : window) as Window} onSelect={setWindow} />
        <Seg ariaLabel="Bet type" options={BET_TYPES} value={betActive} onSelect={setBetType} />
        {marketOptions.length > 0 && (
          <MarketSelect
            options={marketOptions}
            value={market}
            onSelect={setMarket}
            disabled={marketDisabled}
          />
        )}
        <div className="relative">
          <button
            type="button"
            data-range-trigger
            onClick={() => setPickerOpen((o) => !o)}
            aria-pressed={!!range}
            className={`rounded-md px-3 py-2.5 sm:py-1.5 text-[12px] sm:text-[11px] font-bold leading-none transition-all duration-150 ${
              range
                ? "bg-[var(--color-gold)] text-black shadow-[0_2px_8px_-2px_rgba(245,197,74,0.45)]"
                : "bg-[rgba(255,255,255,0.04)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {range ? formatRangeLabel(range.start, range.end) : "Custom range"}
          </button>
          {pickerOpen && (
            <div className="absolute z-20 mt-1">
              <DateRangePicker
                todayStr={new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" })}
                initialStart={range?.start ?? null}
                initialEnd={range?.end ?? null}
                onApply={(s, e) => { setRange(s, e); setPickerOpen(false); }}
                onClear={() => { clearRange(); setPickerOpen(false); }}
                onDismiss={() => setPickerOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] font-bold">
        {label}
      </div>
      {children}
    </div>
  );
}

function Seg<T extends string>({
  ariaLabel,
  options,
  value,
  onSelect,
  wrap = false,
  fill = false,
  disabled = false,
}: {
  ariaLabel: string;
  options: { value: T; label: string }[];
  value: T;
  onSelect: (v: T) => void;
  wrap?: boolean;
  fill?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`gap-0.5 rounded-lg bg-[rgba(255,255,255,0.025)] border border-[rgba(255,255,255,0.04)] p-0.5 ${
        fill ? "grid" : `inline-flex ${wrap ? "flex-wrap" : ""}`
      }`}
      style={fill ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value || "all"}
            type="button"
            onClick={() => onSelect(o.value)}
            aria-pressed={active}
            disabled={disabled}
            className={`rounded-md text-[12px] sm:text-[11px] font-bold leading-none transition-all duration-150 ${
              fill ? "w-full text-center py-2.5" : "px-3 py-2.5 sm:px-2.5 sm:py-1.5"
            } ${
              active
                ? "bg-[var(--color-gold)] text-black shadow-[0_2px_8px_-2px_rgba(245,197,74,0.45)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.04)]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
