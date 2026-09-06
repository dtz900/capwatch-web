"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { SlateSport } from "@/lib/api";

interface Option {
  value: SlateSport;
  label: string;
  caption: string;
}

/**
 * The big league switch at the top of the slate. Drives `?sport=nfl` the same
 * way DateToggle drives `?date=`; switching leagues drops the date/week params
 * because MLB is a daily board and the NFL board is a week.
 */
export function SportToggle({
  current,
  mlbCaption,
  nflCaption,
}: {
  current: SlateSport;
  mlbCaption: string;
  nflCaption: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const options: Option[] = [
    { value: "mlb", label: "MLB", caption: mlbCaption },
    { value: "nfl", label: "NFL", caption: nflCaption },
  ];

  const onSelect = (value: SlateSport) => {
    if (value === current) return;
    const params = new URLSearchParams(sp?.toString() ?? "");
    params.delete("date");
    params.delete("week");
    if (value === "mlb") params.delete("sport");
    else params.set("sport", value);
    const qs = params.toString();
    router.push(qs ? `/slate?${qs}` : "/slate");
  };

  return (
    <div
      role="radiogroup"
      aria-label="League"
      className="grid grid-cols-2 gap-1 rounded-lg bg-[rgba(255,255,255,0.04)] p-1
                 border border-[rgba(255,255,255,0.06)]"
    >
      {options.map((o) => {
        const active = o.value === current;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(o.value)}
            className={`flex flex-col items-center justify-center gap-1 rounded-md px-4 py-3.5 sm:py-4
                        transition-colors ${
              active
                ? "bg-[var(--color-gold)] text-black shadow-[0_2px_10px_-2px_rgba(245,197,74,0.45)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.05)]"
            }`}
          >
            <span className="text-[24px] sm:text-[28px] font-extrabold tracking-[-0.02em] leading-none">
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
