"use server";

import { revalidatePath } from "next/cache";
import { API_BASE } from "@/lib/config";

function adminHeaders(): HeadersInit {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET not set on server");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${secret}`,
  };
}

export interface PickPatchInput {
  market?: string | null;
  selection?: string | null;
  line?: number | null;
  odds_taken?: number | null;
  units?: number | null;
  player_id?: number | null;
  game_id?: string | null;
}

export type ActionResult =
  | { ok: true; capper_handle?: string | null }
  | { ok: false; error: string };

async function call(path: string, init: RequestInit): Promise<ActionResult> {
  try {
    const res = await fetch(`${API_BASE}${path}`, init);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `${res.status}: ${body || res.statusText}` };
    }
    let capperHandle: string | null = null;
    try {
      const body = (await res.json()) as { capper_handle?: string | null };
      capperHandle = body.capper_handle ?? null;
    } catch {
      // Some endpoints may return non-JSON or empty bodies; not an error.
    }
    revalidatePath("/admin/audit");
    revalidatePath("/");
    revalidatePath("/cappers");
    if (capperHandle) {
      revalidatePath(`/cappers/${capperHandle}`);
    }
    return { ok: true, capper_handle: capperHandle };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function patchPickAction(pickId: number, patch: PickPatchInput): Promise<ActionResult> {
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== null && v !== undefined && v !== "") cleaned[k] = v;
  }
  if (Object.keys(cleaned).length === 0) {
    return { ok: false, error: "No fields to update" };
  }
  return call(`/api/admin/picks/${pickId}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(cleaned),
  });
}

export async function manualGradeAction(
  pickId: number,
  outcome: "win" | "loss" | "push" | "void",
): Promise<ActionResult> {
  return call(`/api/admin/picks/${pickId}/manual-grade`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ outcome }),
  });
}

export async function regradeAction(pickId: number): Promise<ActionResult> {
  return call(`/api/admin/picks/${pickId}/regrade`, {
    method: "POST",
    headers: adminHeaders(),
  });
}

export async function deletePickAction(pickId: number): Promise<ActionResult> {
  return call(`/api/admin/picks/${pickId}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
}

export type BatchDeleteResult =
  | { ok: true; deleted: number; capper_ids: number[] }
  | { ok: false; error: string };

export async function batchDeletePicksAction(pickIds: number[]): Promise<BatchDeleteResult> {
  if (pickIds.length === 0) return { ok: true, deleted: 0, capper_ids: [] };
  try {
    const res = await fetch(`${API_BASE}/api/admin/picks/batch-delete`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ pick_ids: pickIds }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `${res.status}: ${body || res.statusText}` };
    }
    const data = (await res.json()) as { deleted: number; capper_ids: number[] };
    revalidatePath("/admin/audit");
    revalidatePath("/");
    revalidatePath("/cappers");
    return { ok: true, deleted: data.deleted ?? 0, capper_ids: data.capper_ids ?? [] };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface PlayerSearchResult {
  player_id: number;
  full_name: string;
  team_abbreviation: string | null;
  active: boolean | null;
}

export async function searchPlayersAction(q: string): Promise<PlayerSearchResult[]> {
  if (!q.trim()) return [];
  try {
    const res = await fetch(
      `${API_BASE}/api/admin/players/search?q=${encodeURIComponent(q.trim())}`,
      { headers: adminHeaders(), cache: "no-store" },
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { results: PlayerSearchResult[] };
    return body.results ?? [];
  } catch {
    return [];
  }
}

export interface GameSearchResult {
  game_pk: number;
  away_team: string | null;
  home_team: string | null;
  game_date: string | null;
  commence_time: string | null;
}

export async function searchGamesAction(
  date: string,
  team?: string,
): Promise<GameSearchResult[]> {
  try {
    const params = new URLSearchParams({ date });
    if (team) params.set("team", team);
    const res = await fetch(`${API_BASE}/api/admin/games/search?${params}`, {
      headers: adminHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { results: GameSearchResult[] };
    return body.results ?? [];
  } catch {
    return [];
  }
}
