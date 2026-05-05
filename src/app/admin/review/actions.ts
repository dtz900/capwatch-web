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
