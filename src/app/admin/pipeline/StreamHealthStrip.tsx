"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchStreamHealth, type StreamHealthResponse, type StreamHealthStatus } from "./actions";

const POLL_MS = 30_000;

const STATUS_COPY: Record<StreamHealthStatus, { label: string; detail: string; good: boolean }> = {
  ok: { label: "ok", detail: "Worker heartbeating and captures are fresh.", good: true },
  quiet: { label: "quiet", detail: "Worker heartbeating; the cohort just is not posting.", good: true },
  stale: { label: "stale", detail: "No heartbeat and no recent capture. The stream is likely dead; the parse cron sweeps recent search.", good: false },
  unknown: { label: "unknown", detail: "No live heartbeat but captures are fresh (older worker, or a sweep just refilled).", good: false },
};

function formatAge(min: number | null): string {
  if (min == null) return "never";
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m ago`;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}

export function StreamHealthStrip() {
  const [data, setData] = useState<StreamHealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetchStreamHealth();
      if (res.ok) {
        setData(res.data);
        setError(null);
      } else {
        setError(res.error);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  if (!data && !error) {
    return (
      <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 mb-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">
          Stream health
        </div>
        <div className="text-[12px] text-[var(--color-text-muted)] mt-2">Loading...</div>
      </div>
    );
  }

  // A failed poll keeps the last good read off screen on purpose: showing a
  // stale "ok" next to an unreachable endpoint is exactly the silent failure
  // this block exists to prevent.
  if (error || !data) {
    return (
      <div role="alert" className="rounded-lg border border-[rgba(248,113,113,0.30)] bg-[rgba(248,113,113,0.05)] p-4 mb-4">
        <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#f87171]">
          Stream health: error
        </div>
        <div className="text-[12px] text-[#f87171] mt-2">{error}</div>
      </div>
    );
  }

  const copy = STATUS_COPY[data.status];
  return (
    <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 mb-4">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <div className="flex items-baseline gap-3">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">
            Stream health
          </span>
          <span
            className={`text-[10px] font-extrabold uppercase tracking-[0.10em] px-1.5 py-0.5 rounded ${
              copy.good
                ? "bg-[rgba(94,234,212,0.14)] text-[#5eead4]"
                : "bg-[rgba(248,113,113,0.12)] text-[#f87171]"
            }`}
          >
            {`● ${copy.label}`}
          </span>
        </div>
        <div className="text-[11px] tabular-nums text-[var(--color-text-soft)] font-bold">
          checked {formatTimestamp(data.checked_at)}
        </div>
      </div>
      <div className="text-[12px] text-[var(--color-text-soft)]">{copy.detail}</div>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11px] tabular-nums text-[var(--color-text-soft)]">
        <span>Last capture: <strong className="text-[var(--color-text)]">{formatAge(data.capture_age_minutes)}</strong></span>
        <span>Last heartbeat: <strong className="text-[var(--color-text)]">{formatAge(data.heartbeat_age_minutes)}</strong></span>
        <span>Last connected: <strong className="text-[var(--color-text)]">{formatTimestamp(data.last_connected_at)}</strong></span>
        <span>Last gap sweep: <strong className="text-[var(--color-text)]">{formatTimestamp(data.last_gap_sweep_at)}</strong></span>
      </div>
    </div>
  );
}
