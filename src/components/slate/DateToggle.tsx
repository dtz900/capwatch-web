"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS: { value: "today" | "tomorrow"; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
];

export function DateToggle({ current }: { current: "today" | "tomorrow" }) {
  const router = useRouter();
  const sp = useSearchParams();

  const onSelect = (value: "today" | "tomorrow") => {
    const params = new URLSearchParams(sp?.toString() ?? "");
    if (value === "today") params.delete("date");
    else params.set("date", value);
    const qs = params.toString();
    router.push(qs ? `/slate?${qs}` : "/slate");
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
            className={`px-3.5 py-1.5 rounded-md text-[12px] font-bold transition-colors ${
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
