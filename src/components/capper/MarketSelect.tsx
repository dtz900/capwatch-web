"use client";

import { useEffect, useRef, useState } from "react";
import type { MarketOption } from "@/lib/capperFilters";

/* Market filter as a single dropdown: the pill-soup wrap didn't survive
 * contact with prop specialists (15+ ragged buttons). The trigger sits in
 * the main filter row; the panel lists markets with graded pick counts,
 * ordered by volume (options arrive pre-sorted). Stacked mode (mobile
 * filter sheet) renders the same list inline instead of a popover. */
export function MarketSelect({
  options,
  value,
  onSelect,
  disabled = false,
  stacked = false,
}: {
  options: MarketOption[];
  value: string;
  onSelect: (v: string) => void;
  disabled?: boolean;
  stacked?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const total = options.reduce((n, o) => n + o.count, 0);
  const rows: MarketOption[] = [{ value: "", label: "All markets", count: total }, ...options];
  const current = rows.find((r) => r.value === value) ?? rows[0];

  function row(o: MarketOption) {
    const active = o.value === value;
    return (
      <button
        key={o.value || "all"}
        type="button"
        role="option"
        aria-selected={active}
        onClick={() => {
          onSelect(o.value);
          setOpen(false);
        }}
        className={`flex w-full items-center justify-between gap-6 rounded-md px-3 py-2 text-left text-[12px] font-bold transition-all duration-150 ${
          active
            ? "bg-[var(--color-gold)] text-black shadow-[0_2px_8px_-2px_rgba(245,197,74,0.45)]"
            : "text-[var(--color-text-soft)] hover:bg-white/5 hover:text-[var(--color-text)]"
        }`}
      >
        <span className="truncate">{o.label}</span>
        <span
          className={`shrink-0 tabular-nums text-[11px] font-semibold ${
            active ? "text-black/70" : "text-[var(--color-text-muted)]"
          }`}
        >
          {o.count}
        </span>
      </button>
    );
  }

  if (stacked) {
    return (
      <div
        role="listbox"
        aria-label="Market"
        aria-disabled={disabled}
        className={`max-h-64 overflow-y-auto rounded-lg bg-[rgba(255,255,255,0.04)] p-1
                    [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                    [mask-image:linear-gradient(to_bottom,black_calc(100%-16px),transparent)] ${
                      disabled ? "opacity-40 pointer-events-none" : ""
                    }`}
      >
        {rows.map(row)}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Market"
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 sm:py-1.5 text-[12px] sm:text-[11px] font-bold leading-none transition-all duration-150 disabled:opacity-40
                   bg-[var(--color-gold)] text-black shadow-[0_2px_8px_-2px_rgba(245,197,74,0.45)] hover:brightness-105"
      >
        {current.label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 3.5 L5 6.5 L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-xl border border-[var(--color-border-h)] bg-[#121216] shadow-xl">
          <div
            role="listbox"
            aria-label="Market"
            className="max-h-80 overflow-y-auto p-1.5
                       [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                       [mask-image:linear-gradient(to_bottom,black_calc(100%-18px),transparent)]"
          >
            {rows.map(row)}
          </div>
        </div>
      )}
    </div>
  );
}
