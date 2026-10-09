"use client";

import { useState, type ReactNode } from "react";

type View = "market" | "capper";

const OPTIONS: { value: View; label: string }[] = [
  { value: "market", label: "By market" },
  { value: "capper", label: "By capper" },
];

/**
 * Flips a game card between its two server-rendered pick layouts. Both views
 * are rendered on the server so nothing time-dependent formats on the client.
 */
export function PicksViewToggle({ market, capper }: { market: ReactNode; capper: ReactNode }) {
  const [view, setView] = useState<View>("market");
  return (
    <div>
      <div className="flex justify-end max-w-[680px] mx-auto mt-6">
        <div
          role="tablist"
          aria-label="Group picks"
          className="inline-flex rounded-lg p-0.5 bg-[rgba(255,255,255,0.04)] ring-1 ring-inset ring-[rgba(255,255,255,0.08)]"
        >
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="tab"
              aria-selected={view === o.value}
              onClick={() => setView(o.value)}
              className={`px-3 py-1 rounded-md text-[10.5px] uppercase tracking-[0.12em] font-bold transition-colors ${
                view === o.value
                  ? "bg-[rgba(255,255,255,0.10)] text-[var(--color-text)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-soft)]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {view === "market" ? market : capper}
    </div>
  );
}
