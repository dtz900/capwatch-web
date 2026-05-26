"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import type { ResearchMode, ResearchWindow } from "@/lib/api";

const WINDOWS: { value: ResearchWindow; label: string }[] = [
  { value: "L7", label: "L7" },
  { value: "L30", label: "L30" },
  { value: "season", label: "Season" },
  { value: "all", label: "All" },
];

const MODES: { value: ResearchMode; label: string }[] = [
  { value: "player", label: "Player" },
  { value: "team", label: "Team" },
];

interface Props {
  initialQ: string;
  initialMode: ResearchMode;
  initialWindow: ResearchWindow;
}

export function SearchForm({ initialQ, initialMode, initialWindow }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  // q lives in local state because the user types into it; mode + window
  // come straight from the URL each render so back/forward and tab clicks
  // stay in sync without a state-mirroring useEffect.
  const [q, setQ] = useState(initialQ);
  const mode = (sp.get("mode") as ResearchMode) || initialMode;
  const windowVal = (sp.get("window") as ResearchWindow) || initialWindow;

  function navigate(next: { q?: string; mode?: ResearchMode; window?: ResearchWindow }) {
    const params = new URLSearchParams();
    const nq = next.q !== undefined ? next.q : q;
    const nmode = next.mode ?? mode;
    const nwin = next.window ?? windowVal;
    if (nq.trim()) params.set("q", nq.trim());
    params.set("mode", nmode);
    params.set("window", nwin);
    router.push(`/admin/research?${params.toString()}`);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    navigate({});
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-md border border-[rgba(255,255,255,0.08)] p-1">
          {MODES.map((m) => {
            const active = mode === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => {
                  if (q.trim()) navigate({ mode: m.value });
                  else router.push(`/admin/research?mode=${m.value}&window=${windowVal}`);
                }}
                className={`px-3 py-1.5 rounded text-[11px] font-extrabold uppercase tracking-[0.10em] ${
                  active
                    ? "bg-[var(--color-gold)] text-[#0a0a0c]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex gap-1 rounded-md border border-[rgba(255,255,255,0.08)] p-1">
          <span className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
            Window
          </span>
          {WINDOWS.map((w) => {
            const active = windowVal === w.value;
            return (
              <button
                key={w.value}
                type="button"
                onClick={() => {
                  if (q.trim()) navigate({ window: w.value });
                  else router.push(`/admin/research?mode=${mode}&window=${w.value}`);
                }}
                className={`px-2.5 py-1.5 rounded text-[11px] font-extrabold uppercase tracking-[0.10em] ${
                  active
                    ? "bg-[rgba(255,255,255,0.12)] text-[var(--color-text)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {w.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={mode === "player" ? "e.g. misiorowski" : "e.g. brewers"}
          autoFocus
          className="flex-1 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.10)]
                     rounded-md px-4 py-3 text-[15px] text-[var(--color-text)]
                     placeholder:text-[var(--color-text-muted)] focus:outline-none
                     focus:border-[var(--color-gold)]"
        />
        <button
          type="submit"
          className="px-5 py-3 rounded-md text-[12px] font-extrabold uppercase tracking-[0.10em]
                     bg-[var(--color-gold)] text-[#0a0a0c] hover:opacity-90 transition"
        >
          Search
        </button>
      </div>
    </form>
  );
}
