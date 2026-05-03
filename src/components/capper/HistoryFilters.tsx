"use client";

import { useRouter, useSearchParams } from "next/navigation";

const MARKETS: { value: string; label: string }[] = [
  { value: "", label: "All markets" },
  { value: "ML", label: "ML" },
  { value: "spread", label: "Spread" },
  { value: "total", label: "Total" },
  { value: "nrfi", label: "NRFI" },
  { value: "yrfi", label: "YRFI" },
  { value: "team_total", label: "Team Total" },
  { value: "prop", label: "Prop" },
];

const OUTCOMES: { value: string; label: string }[] = [
  { value: "", label: "All outcomes" },
  { value: "W", label: "Wins" },
  { value: "L", label: "Losses" },
  { value: "P", label: "Pushes" },
];

export function HistoryFilters({
  basePath,
  market,
  outcome,
}: {
  basePath: string;
  market: string;
  outcome: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(sp?.toString() ?? "");
    if (!value) params.delete(key);
    else params.set(key, value);
    params.delete("offset");
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  return (
    <div className="flex items-center gap-3 flex-wrap mb-4">
      <Group label="Market" options={MARKETS} value={market} onChange={(v) => update("market", v)} />
      <Group label="Outcome" options={OUTCOMES} value={outcome} onChange={(v) => update("outcome", v)} />
    </div>
  );
}

function Group({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold">
        {label}
      </span>
      <div className="inline-flex flex-wrap gap-1 rounded-lg bg-[rgba(255,255,255,0.04)] p-1">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value || "all"}
              type="button"
              onClick={() => onChange(o.value)}
              className={`px-3 py-2 sm:px-2.5 sm:py-1 rounded-md text-[11px] sm:text-[10px] font-bold transition-colors ${
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
    </div>
  );
}
