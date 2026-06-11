"use client";

import { useCapperFilters } from "@/components/capper/CapperFilterProvider";
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
 * On mobile, this is rendered inside the FilterSheet (see Task 15); on >= sm
 * it sits below the hero. */
export function ProfileFilterBar() {
  const {
    window,
    betType,
    market,
    marketOptions,
    marketDisabled,
    setWindow,
    setBetType,
    setMarket,
  } = useCapperFilters();

  // The Bet type chip shows Straights as active when a market is selected,
  // so the user never sees "All bets · Spread" with fewer picks than expected.
  const betActive: BetTypeFilter = market ? "straights" : betType;

  const marketSegOptions = [
    { value: "", label: "All markets" },
    ...marketOptions.map((o) => ({ value: o.value, label: o.label })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Seg ariaLabel="Window" options={WINDOWS} value={window} onSelect={setWindow} />
        <Seg ariaLabel="Bet type" options={BET_TYPES} value={betActive} onSelect={setBetType} />
      </div>
      {marketOptions.length > 0 && (
        <div
          className={marketDisabled ? "opacity-40 pointer-events-none" : ""}
          aria-disabled={marketDisabled}
        >
          <Seg
            ariaLabel="Market"
            options={marketSegOptions}
            value={market}
            onSelect={setMarket}
            wrap
            disabled={marketDisabled}
          />
        </div>
      )}
    </div>
  );
}

function Seg<T extends string>({
  ariaLabel,
  options,
  value,
  onSelect,
  wrap = false,
  disabled = false,
}: {
  ariaLabel: string;
  options: { value: T; label: string }[];
  value: T;
  onSelect: (v: T) => void;
  wrap?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex ${wrap ? "flex-wrap" : ""} gap-1 rounded-lg bg-[rgba(255,255,255,0.04)] p-1`}
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
            className={`px-3 py-2.5 sm:py-1.5 rounded-md text-[12px] sm:text-[11px] font-bold transition-colors ${
              active
                ? "bg-[rgba(255,255,255,0.10)] text-[var(--color-text)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
