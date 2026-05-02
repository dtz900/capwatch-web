"use client";

import { useEffect, useState } from "react";

interface Props {
  iso: string | null;
  /** When the time formats as a specific clock time (e.g. "7:05 PM EDT") because
   * it's far in the future, render with a slightly more muted appearance. */
  className?: string;
}

function formatClock(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function format(iso: string): { label: string; soon: boolean; live: boolean } {
  const target = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = target - now;
  const absMin = Math.abs(Math.round(diffMs / 60_000));

  // In the past
  if (diffMs < 0) {
    if (absMin < 60) return { label: `Started ${absMin}m ago`, soon: false, live: true };
    const h = Math.floor(absMin / 60);
    const m = absMin % 60;
    return { label: `Started ${h}h ${m}m ago`, soon: false, live: true };
  }

  // Within the next 90 minutes: show countdown
  if (diffMs <= 90 * 60_000) {
    if (absMin < 1) return { label: "First pitch any minute", soon: true, live: false };
    if (absMin < 60) return { label: `First pitch in ${absMin} min`, soon: true, live: false };
    const h = Math.floor(absMin / 60);
    const m = absMin % 60;
    return { label: `Starts in ${h}h ${m}m`, soon: true, live: false };
  }

  // Same day, more than 90m away: clock time
  return { label: formatClock(new Date(iso)), soon: false, live: false };
}

export function LiveCountdown({ iso, className }: Props) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!iso) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [iso]);

  if (!iso) return null;
  // `now` is read inside format via Date.now(); kept as state so re-render fires
  // every 30s. Read it here to silence the unused-var warning.
  void now;
  const { label, soon, live } = format(iso);

  const tone = live
    ? "text-[var(--color-pos)]"
    : soon
      ? "text-[var(--color-gold)]"
      : "text-[var(--color-text-soft)]";

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${tone} ${className ?? ""}`}>
      {live && (
        <span
          aria-hidden="true"
          className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-pos)] animate-pulse"
        />
      )}
      {label}
    </span>
  );
}
