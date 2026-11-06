"use server";

import { revalidatePath } from "next/cache";
import { API_BASE } from "@/lib/config";
import type { AdminSport } from "@/lib/admin-sports";

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
  sport?: string;
  stat_name?: string;
}

export type ActionResult =
  | { ok: true; capper_handle?: string | null }
  | { ok: false; error: string };

async function call(
  path: string,
  init: RequestInit,
  opts: { revalidateAudit?: boolean } = {},
): Promise<ActionResult> {
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
    if (opts.revalidateAudit !== false) revalidatePath("/admin/audit");
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

export interface PickShapedFlag {
  raw_id: number;
  capper_id: number;
  handle: string | null;
  posted_at: string;
  flagged_at: string;
  status: string;
  reason: string | null;
  tweet_text: string | null;
  tweet_url: string | null;
}

// Server-side fetch (not a mutation): the nightly pick-shaped
// reconciliation queue. Rendered on the audit page so the pre-board skim
// and manual entry live in one place.
export async function fetchPickShapedFlags(): Promise<PickShapedFlag[]> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/pick-shaped?status=open`, {
      headers: adminHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { flags?: PickShapedFlag[] };
    return body.flags ?? [];
  } catch {
    return [];
  }
}

export async function resolvePickShapedFlagAction(
  rawId: number,
  status: "dismissed" | "handled",
): Promise<ActionResult> {
  return call(`/api/admin/pick-shaped/${rawId}/resolve?status=${status}`, {
    method: "POST",
    headers: adminHeaders(),
  });
}

function patchRequest(pickId: number, patch: PickPatchInput): { path: string; init: RequestInit } | string {
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== null && v !== undefined && v !== "") cleaned[k] = v;
  }
  if (Object.keys(cleaned).length === 0) return "No fields to update";
  return {
    path: `/api/admin/picks/${pickId}`,
    init: { method: "PATCH", headers: adminHeaders(), body: JSON.stringify(cleaned) },
  };
}

export async function patchPickAction(pickId: number, patch: PickPatchInput): Promise<ActionResult> {
  const req = patchRequest(pickId, patch);
  if (typeof req === "string") return { ok: false, error: req };
  return call(req.path, req.init);
}

/** Same PATCH for the audit editors, but leaves /admin/audit alone so the
 * pick being edited stays in the queue. Terminal actions revalidate it. */
export async function patchPickFieldAction(pickId: number, patch: PickPatchInput): Promise<ActionResult> {
  const req = patchRequest(pickId, patch);
  if (typeof req === "string") return { ok: false, error: req };
  return call(req.path, req.init, { revalidateAudit: false });
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

export type BatchRegradeResult =
  | { ok: true; cleared: number; capper_ids: number[] }
  | { ok: false; error: string };

export async function batchRegradePicksAction(pickIds: number[]): Promise<BatchRegradeResult> {
  if (pickIds.length === 0) return { ok: true, cleared: 0, capper_ids: [] };
  try {
    const res = await fetch(`${API_BASE}/api/admin/picks/batch-regrade`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ pick_ids: pickIds }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `${res.status}: ${body || res.statusText}` };
    }
    const data = (await res.json()) as { cleared: number; capper_ids: number[] };
    revalidatePath("/admin/audit");
    revalidatePath("/");
    revalidatePath("/cappers");
    return { ok: true, cleared: data.cleared ?? 0, capper_ids: data.capper_ids ?? [] };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
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

export type AckResult =
  | { ok: true; acked: number }
  | { ok: false; error: string };

/** Acknowledge (triage-dismiss) audit rows. Either explicit pickIds, or
 * bulk by capper (clears that capper's settled book-rules-correct voids
 * in one shot -- the post-onboard/backfill action). */
export async function ackAuditAction(input: {
  pickIds?: number[];
  capper?: string;
  reasons?: string[];
}): Promise<AckResult> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/audit/ack`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        pick_ids: input.pickIds,
        capper: input.capper,
        reasons: input.reasons,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `${res.status}: ${body || res.statusText}` };
    }
    const data = (await res.json()) as { acked: number };
    revalidatePath("/admin/audit");
    return { ok: true, acked: data.acked ?? 0 };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function unackAuditAction(pickIds: number[]): Promise<AckResult> {
  if (pickIds.length === 0) return { ok: true, acked: 0 };
  try {
    const res = await fetch(`${API_BASE}/api/admin/audit/unack`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ pick_ids: pickIds }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `${res.status}: ${body || res.statusText}` };
    }
    const data = (await res.json()) as { unacked: number };
    revalidatePath("/admin/audit");
    return { ok: true, acked: data.unacked ?? 0 };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface ManualLegInput {
  selection: string;
  game_id?: string | null;
  stat_name?: string | null;
  market?: string | null;
  direction?: string | null;
  line?: number | null;
  odds?: number | null;
  player_id?: number | null;
  player_name?: string | null;
}

export interface ManualBetInput {
  capper: string;
  legs: ManualLegInput[];
  units?: number | null;
  combined_odds?: number | null;
  sport?: string;
  posted_at?: string | null;
  raw_id?: number | null;
  tweet_url?: string | null;
  is_live?: boolean;
}

export type ManualBetResult =
  | { ok: true; created_pick_ids: number[]; parlay_id: number | null; capper_handle: string | null }
  | { ok: false; error: string };

/** Manually enter a bet the parser missed or mangled. One leg = straight,
 * two+ legs = parlay (combined odds + units on leg 0). Rows land
 * admin_locked + provenance manual_admin so re-binders and parser re-runs
 * never fight the entry. */
export async function addManualBetAction(input: ManualBetInput): Promise<ManualBetResult> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/picks/manual`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `${res.status}: ${body || res.statusText}` };
    }
    const data = (await res.json()) as {
      created_pick_ids: number[];
      parlay_id: number | null;
      capper_handle: string | null;
    };
    revalidatePath("/admin/audit");
    revalidatePath("/");
    revalidatePath("/cappers");
    if (data.capper_handle) revalidatePath(`/cappers/${data.capper_handle}`);
    return {
      ok: true,
      created_pick_ids: data.created_pick_ids ?? [],
      parlay_id: data.parlay_id ?? null,
      capper_handle: data.capper_handle ?? null,
    };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface PlayerSearchResult {
  player_id: number;
  full_name: string;
  team_abbreviation: string | null;
  active: boolean | null;
  /** NFL rows only (nfl_rosters position); MLB rows omit it. */
  position?: string | null;
}

export type SearchOutcome<T> =
  | { ok: true; results: T[]; missingTeams: string[] }
  | { ok: false; error: string };

/** The API `detail` when present, else `HTTP <status>`. */
async function errorFromResponse(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: unknown };
    if (typeof body.detail === "string" && body.detail) return body.detail;
  } catch {
    // body was not JSON; fall through to the status code
  }
  return `HTTP ${res.status}`;
}

function errorFromThrown(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** sport=NFL searches nfl_rosters (ESPN athlete ids); anything else, mlb_players.
 * Errors are returned, never swallowed into an empty list. */
export async function searchPlayersAction(
  q: string,
  sport?: string,
): Promise<SearchOutcome<PlayerSearchResult>> {
  if (!q.trim()) return { ok: true, results: [], missingTeams: [] };
  try {
    const params = new URLSearchParams({ q: q.trim() });
    if (sport) params.set("sport", sport);
    const res = await fetch(
      `${API_BASE}/api/admin/players/search?${params.toString()}`,
      { headers: adminHeaders(), cache: "no-store" },
    );
    if (!res.ok) return { ok: false, error: await errorFromResponse(res) };
    const body = (await res.json()) as {
      results?: PlayerSearchResult[];
      missing_teams?: string[];
    };
    return { ok: true, results: body.results ?? [], missingTeams: body.missing_teams ?? [] };
  } catch (err: unknown) {
    return { ok: false, error: errorFromThrown(err) };
  }
}

export interface GameSearchResult {
  game_pk: number;
  away_team: string | null;
  home_team: string | null;
  game_date: string | null;
  commence_time: string | null;
  /** Canonical doubleheader index from MLB Stats API. 1 for single games and
   * doubleheader-game-1; 2 for doubleheader-game-2; null when the upstream
   * couldn't be reached. */
  game_number?: number | null;
}

export async function searchGamesAction(
  date: string,
  team?: string,
  sport?: string,
): Promise<SearchOutcome<GameSearchResult>> {
  try {
    const params = new URLSearchParams({ date });
    if (team) params.set("team", team);
    if (sport) params.set("sport", sport);
    const res = await fetch(`${API_BASE}/api/admin/games/search?${params}`, {
      headers: adminHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: await errorFromResponse(res) };
    const body = (await res.json()) as {
      results?: GameSearchResult[];
      missing_teams?: string[];
    };
    return { ok: true, results: body.results ?? [], missingTeams: body.missing_teams ?? [] };
  } catch (err: unknown) {
    return { ok: false, error: errorFromThrown(err) };
  }
}

export interface MarketDef {
  stat_name: string;
  role_required: string;
  aliases: string[];
  default_line: number | null;
  takes_line: boolean;
}

export async function fetchMarketsAction(
  sport: AdminSport,
): Promise<{ ok: true; results: MarketDef[] } | { ok: false; error: string }> {
  try {
    const res = await fetch(
      `${API_BASE}/api/admin/markets?${new URLSearchParams({ sport })}`,
      { headers: adminHeaders(), cache: "no-store" },
    );
    if (!res.ok) return { ok: false, error: await errorFromResponse(res) };
    const body = (await res.json()) as { results?: MarketDef[] };
    return { ok: true, results: body.results ?? [] };
  } catch (err: unknown) {
    return { ok: false, error: errorFromThrown(err) };
  }
}
