"use client";

import { useState } from "react";
import { ProfileFilterBar } from "@/components/capper/ProfileFilterBar";
import { OutcomeFilter } from "@/components/capper/OutcomeFilter";
import { useCapperFilters } from "@/components/capper/CapperFilterProvider";

/** Mobile-only "Filters" button + slide-up sheet. Hidden on >= sm, where the
 * filter bar sits inline below the hero. The sheet hosts the same controlled
 * filter controls (in their stacked layout), so selections drive the shared
 * filter context directly. */
export function FilterSheet() {
  const [open, setOpen] = useState(false);
  const { label } = useCapperFilters();

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 pl-3 pr-3.5 py-2.5 rounded-lg
                   bg-[rgba(255,255,255,0.04)] border border-[var(--color-border)]
                   text-[12px] font-bold text-[var(--color-text)] active:scale-[0.98] transition-transform"
      >
        <FunnelIcon />
        Filters
        <span className="text-[var(--color-text-muted)] font-semibold">· {label}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <button
            aria-label="Close filters"
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
          />
          <div
            className="relative bg-[#101013] border-t border-[var(--color-border)] rounded-t-2xl
                       px-5 pt-3 max-h-[85vh] overflow-y-auto shadow-[0_-16px_48px_rgba(0,0,0,0.55)]"
            style={{ paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[rgba(255,255,255,0.18)]" />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-extrabold tracking-[-0.01em]">Filters</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
                className="text-[12px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                Close
              </button>
            </div>

            <ProfileFilterBar stacked />
            <div className="mt-5">
              <OutcomeFilter stacked />
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-7 w-full rounded-lg bg-[rgba(255,255,255,0.10)] hover:bg-[rgba(255,255,255,0.14)]
                         active:scale-[0.99] py-3 text-[13px] font-extrabold text-[var(--color-text)] transition"
            >
              Show results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FunnelIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 5h18l-7 8v6l-4-2v-4L3 5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
