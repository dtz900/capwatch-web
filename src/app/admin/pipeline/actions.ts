"use server";

import { API_BASE } from "@/lib/config";

export type PipelineEvent =
  | {
      ts: string;
      kind: "captured";
      capper_handle: string | null;
      capper_display_name: string | null;
      raw_id: number;
      tweet_id: string | null;
      has_media: boolean;
      text_excerpt: string;
    }
  | {
      ts: string;
      kind: "parsed";
      capper_handle: string | null;
      capper_display_name: string | null;
      raw_id: number;
      parse_status: string | null;
    }
  | {
      ts: string;
      kind: "pick";
      capper_handle: string | null;
      capper_display_name: string | null;
      pick_id: number;
      raw_id: number | null;
      market: string | null;
      selection: string | null;
      line: number | null;
      odds_taken: number | null;
      units: number | null;
      is_parlay_leg: boolean;
    }
  | {
      ts: string;
      kind: "graded";
      capper_handle: string | null;
      capper_display_name: string | null;
      pick_id: number;
      outcome: string;
      profit_units: number;
      selection: string | null;
      market: string | null;
    };

export interface PipelineResponse {
  minutes: number;
  handle_filter: string | null;
  counts: { captured: number; parsed: number; pick: number; graded: number };
  events: PipelineEvent[];
}

export type PipelineResult =
  | { ok: true; data: PipelineResponse }
  | { ok: false; error: string };

// Vercel server actions on Pro time out after 60s. Cap our fetch a few
// seconds short so we surface a useful error instead of letting Vercel kill
// the whole action with an opaque message.
const FETCH_TIMEOUT_MS = 55_000;

export async function fetchPipelineRecent(
  handle: string,
  minutes: number,
): Promise<PipelineResult> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false, error: "CRON_SECRET not set on server" };

  const params = new URLSearchParams({ minutes: String(minutes) });
  const cleanHandle = handle.replace(/^@/, "").trim();
  if (cleanHandle) params.set("handle", cleanHandle);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/admin/pipeline/recent?${params}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `${res.status}: ${body || res.statusText}` };
    }
    const data = (await res.json()) as PipelineResponse;
    return { ok: true, data };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        error: `Pipeline service didn't respond within ${FETCH_TIMEOUT_MS / 1000}s. Likely Railway cold start; will retry on the next poll.`,
      };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timeoutId);
  }
}

export type CronTaskName =
  | "parse-capper-picks"
  | "grade-capper-picks"
  | "refresh-capper-aggregates";

export type CronTriggerResult =
  | { ok: true; task: CronTaskName; raw: unknown }
  | { ok: false; task: CronTaskName; error: string };

export async function triggerCronTask(task: CronTaskName): Promise<CronTriggerResult> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false, task, error: "CRON_SECRET not set on server" };

  // Use the fire-and-forget endpoint so the request returns instantly and
  // the heavy job runs on Railway in BackgroundTasks. Hitting the synchronous
  // /api/cron/{task} endpoint would block Railway's worker for the duration
  // of the job (parser/grader can run 30s+), starving the polling endpoint
  // and freezing the UI.
  try {
    const res = await fetch(`${API_BASE}/api/cron/fire/${task}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, task, error: `${res.status}: ${body || res.statusText}` };
    }
    const raw = await res.json().catch(() => ({}));
    return { ok: true, task, raw };
  } catch (err: unknown) {
    return { ok: false, task, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface StreamGap {
  start: string;
  end: string | null;
  trigger: "disconnected" | "connection_error" | "worker_starting" | null;
  ongoing: boolean;
  // ISO timestamp of the most recent successful full-cohort backfill for
  // this gap, or null if no backfill has been recorded. Populated server-
  // side from stream_gap_backfills so the admin UI's "✓ backfilled" mark
  // survives page reloads.
  backfilled_at?: string | null;
}

export interface StreamEvent {
  id: number;
  event_type: "worker_starting" | "connected" | "disconnected" | "connection_error";
  occurred_at: string;
  details: Record<string, unknown>;
}

export interface StreamUptimeResponse {
  hours: number;
  since: string;
  now: string;
  events: StreamEvent[];
  gaps: StreamGap[];
  current_state: string;
}

export type StreamUptimeResult =
  | { ok: true; data: StreamUptimeResponse }
  | { ok: false; error: string };

export async function fetchStreamUptime(hours: number = 24): Promise<StreamUptimeResult> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false, error: "CRON_SECRET not set on server" };
  try {
    const res = await fetch(
      `${API_BASE}/api/admin/pipeline/stream-uptime?hours=${hours}`,
      {
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store",
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `${res.status}: ${body || res.statusText}` };
    }
    const data = (await res.json()) as StreamUptimeResponse;
    return { ok: true, data };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface StreamBackfillSummary {
  cappers: number;
  seen: number;
  inserted: number;
  skipped: number;
  per_capper?: Record<string, number>;
}

export interface StreamBackfillResponse {
  ok: true;
  start: string;
  end: string | null;
  handle: string | null;
  dry_run: boolean;
  summary: StreamBackfillSummary;
}

export type StreamBackfillResult =
  | { ok: true; data: StreamBackfillResponse }
  | { ok: false; error: string };

// Backfill can hit X for ~40 cappers x 1-2 timeline calls each. Allow some
// headroom on Vercel's 60s server-action ceiling.
const BACKFILL_TIMEOUT_MS = 55_000;

export async function triggerStreamBackfill(
  start: string,
  end: string | null,
  opts: { handle?: string; dryRun?: boolean } = {},
): Promise<StreamBackfillResult> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false, error: "CRON_SECRET not set on server" };

  const params = new URLSearchParams({ start });
  if (end) params.set("end", end);
  if (opts.handle) params.set("handle", opts.handle.replace(/^@/, ""));
  if (opts.dryRun) params.set("dry_run", "true");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKFILL_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${API_BASE}/api/admin/pipeline/stream-backfill?${params}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store",
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `${res.status}: ${body || res.statusText}` };
    }
    const data = (await res.json()) as StreamBackfillResponse;
    return { ok: true, data };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        error: `Backfill didn't respond within ${BACKFILL_TIMEOUT_MS / 1000}s. It's likely still running on Railway; check stream events in a minute.`,
      };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timeoutId);
  }
}
