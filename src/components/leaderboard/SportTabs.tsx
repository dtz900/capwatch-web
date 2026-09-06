"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { SportFilter } from "@/lib/types";

const OPTIONS: { value: SportFilter; label: string; caption: string }[] = [
  { value: "all", label: "All", caption: "MLB + NFL" },
  { value: "mlb", label: "MLB", caption: "Baseball" },
  { value: "nfl", label: "NFL", caption: "Football" },
];

/**
 * The league switch for the leaderboard: its own row above the filter bar
 * (the filters are per-view knobs; the sport is which board you are on).
 * Same URL mechanics as FilterBar: the sport rides on ?sport= and every
 * other filter is preserved.
 */
export function SportTabs({ current, basePath = "/" }: { current: SportFilter; basePath?: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const onSelect = (value: SportFilter) => {
    if (value === current) return;
    const params = new URLSearchParams(sp?.toString() ?? "");
    params.set("sport", value);
    startTransition(() => {
      router.push(`${basePath}?${params.toString()}`);
    });
  };

  return (
    <div
      role="radiogroup"
      aria-label="Sport"
      aria-busy={isPending}
      className={`grid grid-cols-3 gap-1 rounded-lg bg-[rgba(255,255,255,0.04)] p-1
                  border border-[rgba(255,255,255,0.06)] max-w-[520px]
                  transition-opacity duration-150 ${isPending ? "opacity-70" : "opacity-100"}`}
    >
      {OPTIONS.map((o) => {
        const active = o.value === current;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(o.value)}
            className={`flex flex-col items-center justify-center gap-1 rounded-md px-3 py-3 sm:py-3.5
                        transition-colors ${
              active
                ? "bg-[var(--color-gold)] text-black shadow-[0_2px_10px_-2px_rgba(245,197,74,0.45)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.05)]"
            }`}
          >
            <span className="text-[20px] sm:text-[24px] font-extrabold tracking-[-0.02em] leading-none">
              {o.label}
            </span>
            <span
              className={`text-[10px] uppercase tracking-[0.18em] font-bold leading-none ${
                active ? "text-black/70" : ""
              }`}
            >
              {o.caption}
            </span>
          </button>
        );
      })}
    </div>
  );
}
