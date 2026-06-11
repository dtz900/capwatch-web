"use client";

import { useState } from "react";
import { ProfileFilterBar } from "@/components/capper/ProfileFilterBar";
import { OutcomeFilter } from "@/components/capper/OutcomeFilter";

/** Mobile-only "Filters" button + slide-up sheet. Hidden on >= sm, where the
 * filter bar sits inline below the hero. The sheet hosts the same controlled
 * filter controls, so selections drive the shared filter context directly. */
export function FilterSheet() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
                   bg-[rgba(255,255,255,0.04)] text-[12px] font-bold text-[var(--color-text)]"
      >
        Filters
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <button
            aria-label="Close filters"
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div className="relative bg-[var(--color-bg)] border-t border-[var(--color-border)] rounded-t-2xl p-5 pb-8 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-extrabold">Filters</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[12px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                Done
              </button>
            </div>
            <div className="flex flex-col gap-5">
              <ProfileFilterBar />
              <OutcomeFilter />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
