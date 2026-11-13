"use server";

import { revalidatePath } from "next/cache";
import { API_BASE } from "@/lib/config";
import type { RefusedDuplicate } from "@/lib/liveTwin";

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

/** Approve one pick. The duplicate override is a separate, explicit option: the
 * normal Approve button and the Enter key never pass it. */
export async function approvePickAction(
  pickId: number,
  opts: { allowDuplicate?: boolean } = {},
): Promise<ReviewActionResult> {
  const qs = opts.allowDuplicate === true ? "?allow_duplicate=true" : "";
  return postNoBody(`/api/admin/picks/${pickId}/approve${qs}`);
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
  | {
      ok: true;
      approved: number;
      /** Everything not approved, refused duplicates included. */
      skipped: { pick_id: number; reason: string }[];
      /** The subset of `skipped` refused because the capper already has it live. */
      refused: RefusedDuplicate[];
    }
  | { ok: false; error: string };

/** Bulk approve-as-is from the review queue. Same per-pick rules as the
 * single Approve (needs_review only; unbound straights refused), but the
 * batch approves what it can and reports the rest with reasons. */
export async function batchApprovePicksAction(pickIds: number[]): Promise<BatchApproveResult> {
  if (pickIds.length === 0) return { ok: true, approved: 0, skipped: [], refused: [] };
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
      refused_duplicates?: RefusedDuplicate[];
    };
    revalidatePath("/admin/review");
    revalidatePath("/admin/audit");
    revalidatePath("/");
    revalidatePath("/cappers");
    // This call never sends allow_duplicate: it approves what it can and reports the rest.
    return {
      ok: true,
      approved: data.approved ?? 0,
      skipped: data.skipped ?? [],
      refused: (data.refused_duplicates ?? []).map((r) => ({ ...r, live_twin: r.live_twin ?? null })),
    };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
