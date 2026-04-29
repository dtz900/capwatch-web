"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Window } from "@/lib/types";

const OPTIONS: { value: Window; label: string }[] = [
  { value: "last_7", label: "Last 7" },
  { value: "last_30", label: "Last 30" },
  { value: "season", label: "Season" },
  { value: "all_time", label: "All-time" },
];

export function WindowToggle({
  current,
  basePath,
}: {
  current: Window;
  basePath: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const onSelect = (value: Window) => {
    const params = new URLSearchParams(sp?.toString() ?? "");
    if (value === "last_30") params.delete("window");
    else params.set("window", value);
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
            className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors ${
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
