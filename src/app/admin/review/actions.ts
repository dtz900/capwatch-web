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

export type ReviewActionResult = { ok: true } | { ok: false; error: string };

async function postNoBody(path: string): Promise<ReviewActionResult> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: adminHeaders(),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `${res.status}: ${body || res.statusText}` };
    }
    revalidatePath("/admin/review");
    revalidatePath("/");
    revalidatePath("/cappers");
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function approvePickAction(pickId: number): Promise<ReviewActionResult> {
  return postNoBody(`/api/admin/picks/${pickId}/approve`);
}

export async function rejectPickAction(pickId: number): Promise<ReviewActionResult> {
  return postNoBody(`/api/admin/picks/${pickId}/reject`);
}

export type BatchRejectResult =
  | { ok: true; rejected: number; missing: number[] }
  | { ok: false; error: string };

/** Bulk reject from the review queue. Same per-pick semantics as the single
 * reject (status -> rejected, grade rows dropped, parlay grades cleared),
 * one round trip. */
export async function batchRejectPicksAction(pickIds: number[]): Promise<BatchRejectResult> {
  if (pickIds.length === 0) return { ok: true, rejected: 0, missing: [] };
  try {
    const res = await fetch(`${API_BASE}/api/admin/picks/batch-reject`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ pick_ids: pickIds }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `${res.status}: ${body || res.statusText}` };
    }
    const data = (await res.json()) as { rejected: number; missing: number[] };
    revalidatePath("/admin/review");
    revalidatePath("/admin/audit");
    revalidatePath("/");
    revalidatePath("/cappers");
    return { ok: true, rejected: data.rejected ?? 0, missing: data.missing ?? [] };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export type BatchApproveResult =
  | { ok: true; approved: number; skipped: { pick_id: number; reason: string }[] }
  | { ok: false; error: string };

/** Bulk approve-as-is from the review queue. Same per-pick rules as the
 * single Approve (needs_review only; unbound straights refused), but the
 * batch approves what it can and reports the rest with reasons. */
export async function batchApprovePicksAction(pickIds: number[]): Promise<BatchApproveResult> {
  if (pickIds.length === 0) return { ok: true, approved: 0, skipped: [] };
  try {
    const res = await fetch(`${API_BASE}/api/admin/picks/batch-approve`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ pick_ids: pickIds }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `${res.status}: ${body || res.statusText}` };
    }
    const data = (await res.json()) as {
      approved: number;
      skipped: { pick_id: number; reason: string }[];
    };
    revalidatePath("/admin/review");
    revalidatePath("/admin/audit");
    revalidatePath("/");
    revalidatePath("/cappers");
    return { ok: true, approved: data.approved ?? 0, skipped: data.skipped ?? [] };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Atomic bind-and-approve. Sends a single PATCH that sets game_id (and
 * optionally player_id) AND flips review_status to 'auto_approved'. The
 * backend drops any existing capper_grades row so the next grader cycle
 * regrades against the new binding, then schedules a background capper-
 * aggregate refresh.
 *
 * Avoids the visible-but-unbound state where a pick is auto_approved
 * but still has game_id=null.
 */
export async function bindAndApprovePickAction(
  pickId: number,
  gameId: string,
  playerId?: number,
): Promise<ReviewActionResult> {
  try {
    const body: Record<string, unknown> = {
      game_id: gameId,
      review_status: "auto_approved",
    };
    if (playerId != null) body.player_id = playerId;
    const res = await fetch(`${API_BASE}/api/admin/picks/${pickId}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return { ok: false, error: `${res.status}: ${errBody || res.statusText}` };
    }
    revalidatePath("/admin/review");
    revalidatePath("/admin/audit");
    revalidatePath("/");
    revalidatePath("/cappers");
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface GameSearchResult {
  game_pk: number;
  away_team: string | null;
  home_team: string | null;
  game_date: string | null;
  commence_time: string | null;
  game_number?: number | null;
}

/**
 * Game-search helper for the review queue's inline picker. Hits the same
 * /api/admin/games/search endpoint the audit FixPanel uses; date is
 * required, team is an optional filter on the day's slate.
 */
export async function searchGamesForReviewAction(
  date: string,
  team?: string,
): Promise<GameSearchResult[]> {
  try {
    const params = new URLSearchParams({ date });
    if (team) params.set("team", team.trim());
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

export interface PlayerSearchResult {
  player_id: number;
  full_name: string;
  team_abbreviation: string | null;
  active: boolean | null;
}

/** Player search for binding player-prop legs. */
export async function searchPlayersForReviewAction(
  q: string,
): Promise<PlayerSearchResult[]> {
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
