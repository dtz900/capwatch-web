"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchStreamUptime,
  triggerStreamBackfill,
  type StreamUptimeResponse,
  type StreamBackfillResponse,
} from "./actions";

const POLL_MS = 30_000;
const DEFAULT_HOURS = 24;

interface BackfillState {
  status: "idle" | "running" | "ok" | "error";
  message: string | null;
  summary: StreamBackfillResponse["summary"] | null;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatDuration(startIso: string, endIso: string | null): string {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const sec = Math.max(0, Math.round((end - start) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
}

interface Props {
  hours?: number;
}

export function StreamUptimeStrip({ hours = DEFAULT_HOURS }: Props) {
  const [data, setData] = useState<StreamUptimeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Keyed by gap.start so each gap row tracks its own backfill state.
  const [backfillState, setBackfillState] = useState<Record<string, BackfillState>>({});
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    const res = await fetchStreamUptime(hours);
    if (res.ok) {
      setData(res.data);
      setError(null);
    } else {
      setError(res.error);
    }
    setLoading(false);
    inFlight.current = false;
  }, [hours]);

  const runBackfill = useCallback(
    async (start: string, end: string | null) => {
      // Confirm to prevent an accidental click from hitting X for the whole
      // cohort. backfill_capper_tweets is idempotent on inserts but the X
      // calls still cost regardless.
      const ok = window.confirm(
        `Backfill stream gap?\n\nStart: ${start}\nEnd: ${end ?? "now"}\n\n` +
          `This hits X user-timeline for every tracked capper across the window. ` +
          `Idempotent on inserts.`,
      );
      if (!ok) return;

      setBackfillState((prev) => ({
        ...prev,
        [start]: { status: "running", message: null, summary: null },
      }));
      const res = await triggerStreamBackfill(start, end);
      if (res.ok) {
        const s = res.data.summary;
        setBackfillState((prev) => ({
          ...prev,
          [start]: {
            status: "ok",
            message: `${s.cappers} cappers · ${s.seen} tweets seen · ${s.inserted} inserted${s.skipped ? ` · ${s.skipped} skipped` : ""}`,
            summary: s,
          },
        }));
      } else {
        setBackfillState((prev) => ({
          ...prev,
          [start]: { status: "error", message: res.error, summary: null },
        }));
      }
    },
    [],
  );

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  if (!data && !error) {
    return (
      <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 mb-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">
          Stream uptime
        </div>
        <div className="text-[12px] text-[var(--color-text-muted)] mt-2">Loading...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-[rgba(248,113,113,0.30)] bg-[rgba(248,113,113,0.05)] p-4 mb-4">
        <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#f87171]">
          Stream uptime: error
        </div>
        <div className="text-[12px] text-[#f87171] mt-2">{error}</div>
      </div>
    );
  }

  const sinceMs = new Date(data.since).getTime();
  const nowMs = new Date(data.now).getTime();
  const totalMs = nowMs - sinceMs;

  // Segments: clamp gap.end to now if ongoing.
  const gapSegments = data.gaps.map((g) => {
    const startMs = new Date(g.start).getTime();
    const endMs = g.end ? new Date(g.end).getTime() : nowMs;
    const leftPct = ((startMs - sinceMs) / totalMs) * 100;
    const widthPct = ((endMs - startMs) / totalMs) * 100;
    return { ...g, leftPct, widthPct };
  });

  const totalGapMs = gapSegments.reduce((acc, g) => {
    const startMs = new Date(g.start).getTime();
    const endMs = g.end ? new Date(g.end).getTime() : nowMs;
    return acc + (endMs - startMs);
  }, 0);
  const uptimePct = Math.max(0, 100 - (totalGapMs / totalMs) * 100);

  const isHealthy = data.current_state === "connected";

  return (
    <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 mb-4">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="flex items-baseline gap-3">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">
            Stream uptime · last {hours}h
          </span>
          <span
            className={`text-[10px] font-extrabold uppercase tracking-[0.10em] px-1.5 py-0.5 rounded ${
              isHealthy
                ? "bg-[rgba(94,234,212,0.14)] text-[#5eead4]"
                : "bg-[rgba(248,113,113,0.12)] text-[#f87171]"
            }`}
          >
            {isHealthy ? "● connected" : `● ${data.current_state}`}
          </span>
        </div>
        <div className="text-[11px] tabular-nums text-[var(--color-text-soft)] font-bold">
          {uptimePct.toFixed(2)}% · {gapSegments.length} {gapSegments.length === 1 ? "gap" : "gaps"}
          {loading ? " · refreshing" : ""}
        </div>
      </div>

      {/* Strip */}
      <div className="relative h-3 rounded-full overflow-hidden bg-[rgba(94,234,212,0.18)] border border-[rgba(94,234,212,0.30)]">
        {gapSegments.map((g, i) => (
          <div
            key={i}
            className={`absolute top-0 bottom-0 ${g.ongoing ? "bg-[#f87171]" : "bg-[#f87171] opacity-90"} hover:opacity-100`}
            style={{ left: `${g.leftPct}%`, width: `${Math.max(0.4, g.widthPct)}%` }}
            title={
              `${g.trigger ?? "gap"} · ${formatDuration(g.start, g.end)}\n` +
              `${formatTimestamp(g.start)} → ${g.end ? formatTimestamp(g.end) : "ongoing"}`
            }
          />
        ))}
      </div>

      {/* Gap list */}
      {gapSegments.length > 0 ? (
        <div className="mt-3 flex flex-col gap-1">
          {gapSegments.slice(-8).map((g, i) => {
            const bf = backfillState[g.start];
            const isRunning = bf?.status === "running";
            const canBackfill = !g.ongoing; // closed gaps only
            return (
              <div key={i} className="flex flex-col gap-0.5">
                <div className="text-[11px] tabular-nums flex items-center gap-3 text-[var(--color-text-soft)]">
                  <span className={`w-1.5 h-1.5 rounded-full ${g.ongoing ? "bg-[#f87171]" : "bg-[#f87171] opacity-70"}`} />
                  <span className="font-bold text-[var(--color-text)] min-w-[60px]">
                    {formatDuration(g.start, g.end)}
                  </span>
                  <span className="text-[var(--color-text-muted)] uppercase tracking-[0.10em] text-[9px] font-bold min-w-[110px]">
                    {g.trigger ?? "gap"}
                  </span>
                  <span className="flex-1">
                    {formatTimestamp(g.start)} → {g.end ? formatTimestamp(g.end) : "ongoing"}
                  </span>
                  {canBackfill && (
                    <button
                      type="button"
                      onClick={() => runBackfill(g.start, g.end)}
                      disabled={isRunning || bf?.status === "ok"}
                      className={`text-[10px] uppercase tracking-[0.10em] font-bold px-2 py-0.5 rounded transition-colors ${
                        bf?.status === "ok"
                          ? "bg-[rgba(94,234,212,0.14)] text-[#5eead4] cursor-default"
                          : bf?.status === "error"
                          ? "bg-[rgba(248,113,113,0.14)] text-[#f87171] hover:bg-[rgba(248,113,113,0.22)]"
                          : isRunning
                          ? "bg-[rgba(255,255,255,0.06)] text-[var(--color-text-muted)] cursor-wait"
                          : "bg-[rgba(94,234,212,0.10)] text-[#5eead4] hover:bg-[rgba(94,234,212,0.18)]"
                      }`}
                    >
                      {bf?.status === "ok"
                        ? "✓ backfilled"
                        : isRunning
                        ? "running..."
                        : bf?.status === "error"
                        ? "retry"
                        : "backfill"}
                    </button>
                  )}
                </div>
                {bf?.message && (
                  <div
                    className={`text-[10px] pl-[18px] ${
                      bf.status === "ok"
                        ? "text-[#5eead4]"
                        : bf.status === "error"
                        ? "text-[#f87171]"
                        : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    {bf.message}
                  </div>
                )}
              </div>
            );
          })}
          {gapSegments.length > 8 && (
            <div className="text-[10px] text-[var(--color-text-muted)] mt-1">
              +{gapSegments.length - 8} earlier gaps not shown
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 text-[11px] text-[var(--color-text-muted)]">
          No connection drops in the last {hours}h.
        </div>
      )}

      <div className="mt-3 text-[10px] text-[var(--color-text-muted)]">
        Free monitor. Tweets posted during a red gap may be missing from <code>capper_picks_raw</code>.
        Click <strong>backfill</strong> on a closed gap to recover only that window via X user-timeline.
        Idempotent on inserts.
      </div>
    </div>
  );
}
