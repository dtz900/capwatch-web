"use client";

import { useEffect, useRef, useState } from "react";

// ── pure date utilities (exported for tests) ──────────────────────────────
export function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(s: string, n: number): string {
  const d = parseYmd(s);
  d.setUTCDate(d.getUTCDate() + n);
  return ymd(d);
}

/** 6x7 grid of YYYY-MM-DD for the month, padded to whole weeks (Sun-start). */
export function monthMatrix(year: number, month1: number): string[][] {
  const first = new Date(Date.UTC(year, month1 - 1, 1));
  const startDow = first.getUTCDay(); // 0=Sun
  const gridStart = new Date(first);
  gridStart.setUTCDate(1 - startDow);
  const weeks: string[][] = [];
  const cur = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const row: string[] = [];
    for (let d = 0; d < 7; d++) {
      row.push(ymd(cur));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    weeks.push(row);
  }
  return weeks;
}

export type Shortcut = "this_week" | "last_week" | "this_month" | "last_month";

/** Compute a shortcut range relative to `todayStr` (YYYY-MM-DD). Weeks are
 * Mon-Sun. */
export function shortcutRange(kind: Shortcut, todayStr: string): { start: string; end: string } {
  const today = parseYmd(todayStr);
  const dow = today.getUTCDay(); // 0=Sun..6=Sat
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const thisMonday = addDays(todayStr, mondayOffset);
  if (kind === "this_week") return { start: thisMonday, end: addDays(thisMonday, 6) };
  if (kind === "last_week") return { start: addDays(thisMonday, -7), end: addDays(thisMonday, -1) };
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth(); // 0-based
  if (kind === "this_month") {
    const start = ymd(new Date(Date.UTC(y, m, 1)));
    const end = ymd(new Date(Date.UTC(y, m + 1, 0)));
    return { start, end };
  }
  // last_month
  const start = ymd(new Date(Date.UTC(y, m - 1, 1)));
  const end = ymd(new Date(Date.UTC(y, m, 0)));
  return { start, end };
}

// ── component ─────────────────────────────────────────────────────────────
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const SHORTCUTS: { kind: Shortcut; label: string }[] = [
  { kind: "this_week", label: "This week" },
  { kind: "last_week", label: "Last week" },
  { kind: "this_month", label: "This month" },
  { kind: "last_month", label: "Last month" },
];

export function DateRangePicker({
  todayStr,
  initialStart,
  initialEnd,
  onApply,
  onClear,
  onDismiss,
}: {
  todayStr: string;
  initialStart: string | null;
  initialEnd: string | null;
  onApply: (start: string, end: string) => void;
  onClear: () => void;
  onDismiss?: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const init = parseYmd(initialStart ?? todayStr);
  const [viewY, setViewY] = useState(init.getUTCFullYear());
  const [viewM, setViewM] = useState(init.getUTCMonth() + 1); // 1-based
  const [anchor, setAnchor] = useState<string | null>(initialStart);
  const [hoverEnd, setHoverEnd] = useState<string | null>(initialEnd);

  useEffect(() => {
    if (!onDismiss) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      if (target.closest("[data-range-trigger]")) return; // let the toggle button handle itself
      onDismiss();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onDismiss]);

  const weeks = monthMatrix(viewY, viewM);

  const pickDay = (day: string) => {
    if (!anchor || (anchor && hoverEnd)) {
      setAnchor(day);
      setHoverEnd(null);
      return;
    }
    const [s, e] = day < anchor ? [day, anchor] : [anchor, day];
    setHoverEnd(e);
    setAnchor(s);
    onApply(s, e);
  };

  const prevMonth = () => {
    const d = new Date(Date.UTC(viewY, viewM - 2, 1));
    setViewY(d.getUTCFullYear());
    setViewM(d.getUTCMonth() + 1);
  };
  const nextMonth = () => {
    const d = new Date(Date.UTC(viewY, viewM, 1));
    setViewY(d.getUTCFullYear());
    setViewM(d.getUTCMonth() + 1);
  };

  const inRange = (day: string) =>
    anchor && hoverEnd && day >= anchor && day <= hoverEnd;

  return (
    <div ref={rootRef} className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#1a1a1a] p-3 w-[300px]">
      <div className="flex flex-wrap gap-1 mb-3">
        {SHORTCUTS.map((s) => (
          <button
            key={s.kind}
            type="button"
            onClick={() => {
              const r = shortcutRange(s.kind, todayStr);
              setAnchor(r.start);
              setHoverEnd(r.end);
              onApply(r.start, r.end);
            }}
            className="rounded-md px-2 py-1 text-[11px] font-bold bg-[rgba(255,255,255,0.04)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={prevMonth} aria-label="Previous month" className="px-2 py-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">‹</button>
        <div className="text-[12px] font-bold">{MONTH_NAMES[viewM - 1]} {viewY}</div>
        <button type="button" onClick={nextMonth} aria-label="Next month" className="px-2 py-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">›</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-[var(--color-text-muted)] mb-1">
        {["S","M","T","W","T","F","S"].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      {weeks.map((row, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-0.5">
          {row.map((day) => {
            const inMonth = parseYmd(day).getUTCMonth() + 1 === viewM;
            const future = day > todayStr;
            const selected = day === anchor || day === hoverEnd;
            return (
              <button
                key={day}
                type="button"
                disabled={future}
                onClick={() => pickDay(day)}
                className={`text-[11px] py-1 rounded ${
                  !inMonth ? "text-[rgba(255,255,255,0.25)]" : "text-[var(--color-text)]"
                } ${future ? "opacity-30 cursor-not-allowed" : "hover:bg-[rgba(255,255,255,0.08)]"} ${
                  selected ? "bg-[rgba(255,255,255,0.18)] font-bold" : inRange(day) ? "bg-[rgba(255,255,255,0.07)]" : ""
                }`}
              >
                {parseYmd(day).getUTCDate()}
              </button>
            );
          })}
        </div>
      ))}
      <div className="flex justify-between mt-3">
        <button type="button" onClick={onClear} className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Clear</button>
      </div>
    </div>
  );
}
