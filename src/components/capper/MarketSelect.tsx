"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MarketOption } from "@/lib/capperFilters";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { followScopeForMarket } from "@/lib/followScope";
import { TailCrown } from "@/components/icons/TailCrown";

/* Market filter as a single dropdown: the pill-soup wrap didn't survive
 * contact with prop specialists (15+ ragged buttons). The trigger sits in
 * the main filter row; the panel lists markets with graded pick counts,
 * ordered by volume (options arrive pre-sorted). Stacked mode (mobile
 * filter sheet) renders the same list inline instead of a popover.
 *
 * With a capperId, rows the signed-in user is tailing carry the green
 * crown: scoped follows crown their market rows, a whole-capper follow
 * crowns the All markets row. Follows are refetched each time the panel
 * opens so a tail toggled elsewhere on the page shows up. */
export function MarketSelect({
  options,
  value,
  onSelect,
  disabled = false,
  stacked = false,
  capperId,
}: {
  options: MarketOption[];
  value: string;
  onSelect: (v: string) => void;
  disabled?: boolean;
  stacked?: boolean;
  capperId?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { session } = useAuth();
  const supabase = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? createBrowserSupabase()
        : null,
    []
  );
  const [tailed, setTailed] = useState<Set<string>>(new Set());

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

  const listVisible = stacked || open;
  useEffect(() => {
    if (!capperId || !supabase || !session?.user?.id || !listVisible) {
      if (!session?.user?.id) setTailed(new Set());
      return;
    }
    supabase
      .from("capper_follows")
      .select("market")
      .eq("user_id", session.user.id)
      .eq("capper_id", capperId)
      .then(({ data }) =>
        setTailed(new Set(((data ?? []) as { market: string }[]).map((r) => r.market)))
      );
  }, [capperId, supabase, session, listVisible]);

  function isTailed(o: MarketOption): boolean {
    if (!o.value) return tailed.has("all");
    const scope = followScopeForMarket(o.value);
    return scope !== null && tailed.has(scope);
  }

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
        className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[12px] font-bold transition-all duration-150 ${
          active
            ? "bg-[var(--color-gold)] text-black shadow-[0_2px_8px_-2px_rgba(245,197,74,0.45)]"
            : "text-[var(--color-text-soft)] hover:bg-white/5 hover:text-[var(--color-text)]"
        }`}
      >
        <span className="truncate">{o.label}</span>
        {isTailed(o) && (
          <TailCrown size={15} className={active ? "text-black/75" : "text-[#35a05f]"} />
        )}
        <span
          className={`ml-auto shrink-0 tabular-nums text-[11px] font-semibold ${
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
