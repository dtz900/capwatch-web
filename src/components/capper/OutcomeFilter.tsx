"use client";

import { useCapperFilters } from "@/components/capper/CapperFilterProvider";

const OUTCOMES: { value: string; label: string }[] = [
  { value: "", label: "All outcomes" },
  { value: "W", label: "Wins" },
  { value: "L", label: "Losses" },
  { value: "P", label: "Pushes" },
];

/** Table-only filter at the pick-history header. Refetches the history page
 * server-side (does not touch the sparkline or stat band, since filtering net
 * profit by "wins only" is meaningless).
 *
 * default layout: inline label + pills (desktop pick-history header).
 * stacked layout: labeled row with full-width equal segments (mobile sheet). */
export function OutcomeFilter({ stacked = false }: { stacked?: boolean }) {
  const { outcome, setOutcome } = useCapperFilters();

  if (stacked) {
    return (
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] font-bold">
          Outcome
        </div>
        <div
          role="group"
          aria-label="Outcome"
          className="grid gap-1 rounded-lg bg-[rgba(255,255,255,0.04)] p-1"
          style={{ gridTemplateColumns: `repeat(${OUTCOMES.length}, minmax(0, 1fr))` }}
        >
          {OUTCOMES.map((o) => {
            const active = o.value === outcome;
            return (
              <button
                key={o.value || "all"}
                type="button"
                onClick={() => setOutcome(o.value)}
                aria-pressed={active}
                className={`w-full text-center py-2.5 rounded-md text-[12px] font-bold transition-colors ${
                  active
                    ? "bg-[rgba(255,255,255,0.12)] text-[var(--color-text)] shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold">
        Outcome
      </span>
      <div className="inline-flex flex-wrap gap-1 rounded-lg bg-[rgba(255,255,255,0.04)] p-1">
        {OUTCOMES.map((o) => {
          const active = o.value === outcome;
          return (
            <button
              key={o.value || "all"}
              type="button"
              onClick={() => setOutcome(o.value)}
              aria-pressed={active}
              className={`px-3 py-2 sm:px-2.5 sm:py-1 rounded-md text-[11px] sm:text-[10px] font-bold transition-colors ${
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
    </div>
  );
}
