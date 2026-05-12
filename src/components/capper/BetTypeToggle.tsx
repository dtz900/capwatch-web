"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { BetTypeFilter } from "@/lib/types";

const OPTIONS: { value: BetTypeFilter; label: string }[] = [
  { value: "all", label: "All bets" },
  { value: "straights", label: "Straights" },
  { value: "parlays", label: "Parlays" },
];

export function BetTypeToggle({
  current,
  basePath,
}: {
  current: BetTypeFilter;
  basePath: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const onSelect = (value: BetTypeFilter) => {
    const params = new URLSearchParams(sp?.toString() ?? "");
    if (value === "all") params.delete("bet_type");
    else params.set("bet_type", value);
    params.delete("offset");
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  return (
    <div className="inline-flex rounded-lg bg-[rgba(255,255,255,0.04)] p-1">
      {OPTIONS.map((o) => {
        const active = o.value === current;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onSelect(o.value)}
            className={`px-3 py-2.5 sm:py-1.5 rounded-md text-[12px] sm:text-[11px] font-bold transition-colors ${
              active
                ? "bg-[rgba(255,255,255,0.10)] text-[var(--color-text)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
            aria-pressed={active}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
