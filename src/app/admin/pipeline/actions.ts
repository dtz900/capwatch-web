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

export async function fetchPipelineRecent(
  handle: string,
  minutes: number,
): Promise<PipelineResult> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false, error: "CRON_SECRET not set on server" };

  const params = new URLSearchParams({ minutes: String(minutes) });
  const cleanHandle = handle.replace(/^@/, "").trim();
  if (cleanHandle) params.set("handle", cleanHandle);

  try {
    const res = await fetch(`${API_BASE}/api/admin/pipeline/recent?${params}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `${res.status}: ${body || res.statusText}` };
    }
    const data = (await res.json()) as PipelineResponse;
    return { ok: true, data };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
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

  try {
    const res = await fetch(`${API_BASE}/api/cron/${task}`, {
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
