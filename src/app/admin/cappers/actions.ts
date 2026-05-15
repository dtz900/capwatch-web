"use server";

import { revalidatePath } from "next/cache";
import { API_BASE } from "@/lib/config";

export interface UpdateCapperInput {
  capper_id: number;
  handle?: string;
  twitter_url?: string;
  display_name?: string;
}

export interface UpdatedCapper {
  id: number;
  handle: string;
  twitter_url: string | null;
  display_name: string | null;
}

export type UpdateCapperResult =
  | {
      ok: true;
      capper: UpdatedCapper;
      slug_changed: boolean;
      old_handle: string;
    }
  | { ok: false; error: string };

export async function updateCapperAction(input: UpdateCapperInput): Promise<UpdateCapperResult> {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return { ok: false, error: "ADMIN_API_TOKEN not set on server" };
  if (!input.capper_id || !Number.isFinite(input.capper_id)) {
    return { ok: false, error: "capper_id is required" };
  }

  const body: Record<string, unknown> = {};
  if (typeof input.handle === "string") body.handle = input.handle;
  if (typeof input.twitter_url === "string") body.twitter_url = input.twitter_url;
  if (typeof input.display_name === "string") body.display_name = input.display_name;

  try {
    const res = await fetch(`${API_BASE}/api/admin/cappers/${input.capper_id}/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `${res.status}: ${text || res.statusText}` };
    }
    const data = (await res.json()) as {
      capper: UpdatedCapper;
      slug_changed: boolean;
      old_handle: string;
    };
    revalidatePath("/admin/cappers");
    revalidatePath(`/admin/cappers/${data.old_handle}/picks`);
    revalidatePath(`/admin/cappers/${data.capper.handle}/picks`);
    revalidatePath(`/cappers/${data.capper.handle}`);
    return {
      ok: true,
      capper: data.capper,
      slug_changed: !!data.slug_changed,
      old_handle: data.old_handle,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface AddCapperInput {
  handle: string;
  tier?: 1 | 2 | 3;
  display_name?: string;
  notes?: string;
  sport_tags?: string[];
  has_paid_service?: boolean;
  paid_service_name?: string;
  paid_service_url?: string;
  paid_service_price_per_month?: number;
  backfill_days?: number;
}

export interface AddedCapper {
  id: number;
  handle: string;
  tier: number | null;
  display_name: string | null;
  twitter_user_id: string | null;
  status: string | null;
}

export interface BackfillSummary {
  ok: boolean;
  reason?: string | null;
  fetched?: number;
  upserted?: number;
  pages?: number;
  days_requested?: number;
  final_mtd_usd?: number | null;
  note?: string | null;
  error?: string | null;
}

export type AddCapperResult =
  | {
      ok: true;
      status: "added" | "reactivated" | "already_tracking";
      capper: AddedCapper;
      backfill: BackfillSummary | null;
    }
  | { ok: false; error: string };

export async function addCapperAction(input: AddCapperInput): Promise<AddCapperResult> {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return { ok: false, error: "ADMIN_API_TOKEN not set on server" };

  const handle = input.handle.replace(/^@/, "").trim();
  if (!handle) return { ok: false, error: "Handle is required" };

  const body: Record<string, unknown> = { handle, tier: input.tier ?? 2 };
  if (input.display_name?.trim()) body.display_name = input.display_name.trim();
  if (input.notes?.trim()) body.notes = input.notes.trim();
  if (input.sport_tags && input.sport_tags.length > 0) {
    body.sport_tags = input.sport_tags;
  }
  if (input.has_paid_service) {
    body.has_paid_service = true;
    if (input.paid_service_name?.trim()) body.paid_service_name = input.paid_service_name.trim();
    if (input.paid_service_url?.trim()) body.paid_service_url = input.paid_service_url.trim();
    if (
      typeof input.paid_service_price_per_month === "number" &&
      Number.isFinite(input.paid_service_price_per_month) &&
      input.paid_service_price_per_month > 0
    ) {
      body.paid_service_price_per_month = input.paid_service_price_per_month;
    }
  }
  if (
    typeof input.backfill_days === "number" &&
    Number.isFinite(input.backfill_days) &&
    input.backfill_days > 0
  ) {
    body.backfill_days = Math.min(365, Math.max(0, Math.floor(input.backfill_days)));
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/cappers/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `${res.status}: ${text || res.statusText}` };
    }
    const data = (await res.json()) as {
      status: "added" | "reactivated" | "already_tracking";
      capper: AddedCapper;
      backfill?: BackfillSummary | null;
    };
    revalidatePath("/admin/cappers");
    return {
      ok: true,
      status: data.status,
      capper: data.capper,
      backfill: data.backfill ?? null,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
