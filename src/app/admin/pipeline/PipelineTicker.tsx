"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchPipelineRecent,
  triggerCronTask,
  type CronTaskName,
  type CronTriggerResult,
  type PipelineEvent,
  type PipelineResponse,
} from "./actions";

const POLL_MS = 15_000;

const KIND_LABEL: Record<PipelineEvent["kind"], string> = {
  captured: "Captured",
  parsed: "Parsed",
  pick: "Pick",
  graded: "Graded",
};

const KIND_TONE: Record<PipelineEvent["kind"], string> = {
  captured: "bg-[rgba(255,255,255,0.06)] text-[var(--color-text-soft)]",
  parsed: "bg-[rgba(96,165,250,0.14)] text-[#93c5fd]",
  pick: "bg-[rgba(255,255,255,0.10)] text-[var(--color-text)]",
  graded: "bg-[rgba(245,197,74,0.14)] text-[var(--color-gold)]",
};

const BAR_TONE: Record<PipelineEvent["kind"], string> = {
  captured: "bg-[rgba(255,255,255,0.20)]",
  parsed: "bg-[#3b82f6]",
  pick: "bg-[rgba(255,255,255,0.45)]",
  graded: "bg-[var(--color-gold)]",
};

function formatRelative(ts: string): string {
  const t = new Date(ts).getTime();
  const now = Date.now();
  const sec = Math.floor((now - t) / 1000);
  if (sec < 0) return "just now";
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(ts).toLocaleString();
}

function parseStatusTone(status: string | null): string {
  if (!status) return "text-[var(--color-text-muted)]";
  if (status === "parsed") return "text-[var(--color-pos)]";
  if (status === "ambiguous") return "text-[var(--color-gold)]";
  if (status === "duplicate") return "text-[var(--color-text-muted)]";
  return "text-[var(--color-neg)]";
}

function outcomeTone(outcome: string): string {
  if (outcome === "win") return "text-[var(--color-pos)]";
  if (outcome === "loss") return "text-[var(--color-neg)]";
  if (outcome === "push" || outcome === "void") return "text-[var(--color-text-muted)]";
  return "text-[var(--color-text-soft)]";
}

function formatUnitsSigned(n: number): string {
  const sign = n >= 0 ? "+" : "-";
  return `${sign}${Math.abs(n).toFixed(2)}u`;
}

interface Props {
  initialHandle: string;
  initialMinutes: number;
}

export function PipelineTicker({ initialHandle, initialMinutes }: Props) {
  const [handle, setHandle] = useState(initialHandle);
  const [minutes, setMinutes] = useState(initialMinutes);
  const [data, setData] = useState<PipelineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [runningTask, setRunningTask] = useState<CronTaskName | null>(null);
  const [lastTrigger, setLastTrigger] = useState<CronTriggerResult | null>(null);
  const handleRef = useRef(handle);
  const minutesRef = useRef(minutes);

  useEffect(() => {
    handleRef.current = handle;
  }, [handle]);
  useEffect(() => {
    minutesRef.current = minutes;
  }, [minutes]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetchPipelineRecent(handleRef.current, minutesRef.current);
    if (res.ok) {
      setData(res.data);
      setError(null);
    } else {
      setError(res.error);
    }
    setLastFetched(Date.now());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [refresh, paused]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void refresh();
  };

  const onRunTask = useCallback(
    async (task: CronTaskName) => {
      setRunningTask(task);
      setLastTrigger(null);
      const res = await triggerCronTask(task);
      setLastTrigger(res);
      setRunningTask(null);
      // Pull fresh ticker state after the task lands
      void refresh();
    },
    [refresh],
  );

  const ageLabel = lastFetched ? `${Math.max(0, Math.floor((Date.now() - lastFetched) / 1000))}s ago` : "never";

  return (
    <div className="flex flex-col gap-5">
      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-4 py-3 flex items-center gap-3 flex-wrap"
      >
        <div className="flex items-center rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.25)] focus-within:border-[rgba(255,255,255,0.20)]">
          <span className="pl-3 pr-1 text-[var(--color-text-muted)] text-sm font-semibold">@</span>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="all cappers"
            autoComplete="off"
            spellCheck={false}
            className="bg-transparent py-1.5 pr-3 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] w-44"
          />
        </div>

        <select
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.25)] px-3 py-1.5 text-sm text-[var(--color-text)] outline-none"
        >
          <option value={15}>Last 15m</option>
          <option value={60}>Last 1h</option>
          <option value={240}>Last 4h</option>
          <option value={720}>Last 12h</option>
          <option value={1440}>Last 24h</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1.5 rounded-md bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.14)] disabled:opacity-50 text-[12px] font-bold text-[var(--color-text)]"
        >
          {loading ? "Fetching..." : "Refresh"}
        </button>

        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className={`px-3 py-1.5 rounded-md text-[12px] font-bold transition-colors ${
            paused
              ? "bg-[rgba(245,197,74,0.18)] text-[var(--color-gold)] hover:bg-[rgba(245,197,74,0.28)]"
              : "bg-[rgba(255,255,255,0.04)] text-[var(--color-text-soft)] hover:bg-[rgba(255,255,255,0.08)]"
          }`}
        >
          {paused ? "Resume polling" : "Pause polling"}
        </button>

        <div className="ml-auto text-[11px] text-[var(--color-text-muted)] font-medium tabular-nums">
          last fetch: {ageLabel}
        </div>
      </form>

      <div className="rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-4 py-3 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] font-bold mr-1">
          Force run
        </span>
        <RunTaskButton
          task="parse-capper-picks"
          label="Parser"
          running={runningTask === "parse-capper-picks"}
          disabled={runningTask !== null}
          onClick={() => onRunTask("parse-capper-picks")}
        />
        <RunTaskButton
          task="grade-capper-picks"
          label="Grader"
          running={runningTask === "grade-capper-picks"}
          disabled={runningTask !== null}
          onClick={() => onRunTask("grade-capper-picks")}
        />
        <RunTaskButton
          task="refresh-capper-aggregates"
          label="Aggregates"
          running={runningTask === "refresh-capper-aggregates"}
          disabled={runningTask !== null}
          onClick={() => onRunTask("refresh-capper-aggregates")}
        />
        {lastTrigger && (
          <span className="text-[11px] font-medium ml-1.5">
            <span className="text-[var(--color-text-muted)] mr-1.5 uppercase tracking-[0.10em] font-bold text-[10px]">
              {lastTrigger.task}:
            </span>
            {lastTrigger.ok ? (
              <span className="text-[var(--color-pos)] font-bold">ok</span>
            ) : (
              <span className="text-[var(--color-neg)] font-bold">{lastTrigger.error}</span>
            )}
          </span>
        )}
      </div>

      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <CountTile label="Captured" value={data.counts.captured} kind="captured" />
          <CountTile label="Parsed" value={data.counts.parsed} kind="parsed" />
          <CountTile label="Picks" value={data.counts.pick} kind="pick" />
          <CountTile label="Graded" value={data.counts.graded} kind="graded" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.05)] px-4 py-3 text-[13px] text-[var(--color-neg)]">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden">
        {data && data.events.length === 0 && !loading ? (
          <div className="px-6 py-10 text-center text-[13px] text-[var(--color-text-muted)] italic">
            No events in this window{handle ? ` for @${handle.replace(/^@/, "")}` : ""}.
          </div>
        ) : (
          <ul>
            {(data?.events ?? []).map((ev, i) => (
              <li
                key={`${ev.kind}-${i}-${ev.ts}`}
                className={`relative grid grid-cols-[80px_70px_minmax(120px,180px)_1fr] gap-3 items-baseline pl-[19px] pr-5 py-3
                            border-b border-[rgba(255,255,255,0.035)] last:border-b-0 text-[12px]`}
              >
                <span aria-hidden="true" className={`absolute left-0 top-0 bottom-0 w-[3px] ${BAR_TONE[ev.kind]}`} />
                <span className="text-[var(--color-text-muted)] font-medium tabular-nums">
                  {formatRelative(ev.ts)}
                </span>
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-[0.10em] text-center ${KIND_TONE[ev.kind]}`}
                >
                  {KIND_LABEL[ev.kind]}
                </span>
                <span className="text-[var(--color-text-soft)] truncate">
                  {ev.capper_handle ? (
                    <span className="text-[var(--color-text)] font-bold">@{ev.capper_handle}</span>
                  ) : (
                    <span className="text-[var(--color-text-muted)]">unknown capper</span>
                  )}
                </span>
                <span className="min-w-0 truncate text-[var(--color-text-soft)]">
                  <EventDetail event={ev} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RunTaskButton({
  label,
  running,
  disabled,
  onClick,
}: {
  task: CronTaskName;
  label: string;
  running: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-md text-[12px] font-bold transition-colors disabled:cursor-not-allowed ${
        running
          ? "bg-[rgba(96,165,250,0.18)] text-[#93c5fd] border border-[rgba(96,165,250,0.40)]"
          : "bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] text-[var(--color-text-soft)] hover:text-[var(--color-text)] disabled:opacity-40 disabled:hover:bg-[rgba(255,255,255,0.06)]"
      }`}
    >
      {running ? `${label}...` : label}
    </button>
  );
}

function CountTile({
  label,
  value,
  kind,
}: {
  label: string;
  value: number;
  kind: PipelineEvent["kind"];
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${BAR_TONE[kind]}`} />
        <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] font-bold">
          {label}
        </div>
      </div>
      <div className="text-[22px] font-extrabold tabular-nums leading-none mt-1.5 tracking-[-0.02em]">
        {value}
      </div>
    </div>
  );
}

function EventDetail({ event }: { event: PipelineEvent }) {
  if (event.kind === "captured") {
    return (
      <span>
        {event.has_media && <span className="mr-1.5 text-[var(--color-text-muted)]">[media]</span>}
        <span className="text-[var(--color-text-soft)]">{event.text_excerpt || "(empty)"}</span>
      </span>
    );
  }
  if (event.kind === "parsed") {
    return (
      <span>
        <span className="text-[var(--color-text-muted)]">raw_id={event.raw_id} </span>
        <span className={`font-semibold ${parseStatusTone(event.parse_status)}`}>
          {event.parse_status ?? "unknown"}
        </span>
      </span>
    );
  }
  if (event.kind === "pick") {
    const odds =
      event.odds_taken == null
        ? ""
        : event.odds_taken > 0
          ? ` ${event.odds_taken > 0 ? "+" : ""}${event.odds_taken}`
          : ` ${event.odds_taken}`;
    return (
      <span>
        <span className="text-[var(--color-text)] font-semibold">
          {event.selection ?? "(no selection)"}
        </span>
        <span className="text-[var(--color-text-soft)]">{odds}</span>
        {event.is_parlay_leg && (
          <span className="ml-2 text-[10px] text-[var(--color-gold)] font-bold uppercase tracking-[0.12em]">
            parlay leg
          </span>
        )}
        <span className="ml-2 text-[var(--color-text-muted)] tabular-nums">pid={event.pick_id}</span>
      </span>
    );
  }
  // graded
  return (
    <span>
      <span className={`font-extrabold uppercase tracking-[0.10em] ${outcomeTone(event.outcome)}`}>
        {event.outcome}
      </span>
      <span className={`ml-2 tabular-nums font-bold ${outcomeTone(event.outcome)}`}>
        {formatUnitsSigned(event.profit_units)}
      </span>
      <span className="ml-2 text-[var(--color-text-soft)] truncate">
        {event.selection ?? ""}
      </span>
      <span className="ml-2 text-[var(--color-text-muted)] tabular-nums">pid={event.pick_id}</span>
    </span>
  );
}
