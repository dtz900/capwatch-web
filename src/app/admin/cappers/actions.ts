"use server";

import { revalidatePath } from "next/cache";
import { API_BASE } from "@/lib/config";

export interface AddCapperInput {
  handle: string;
  tier?: 1 | 2 | 3;
  display_name?: string;
  notes?: string;
}

export interface AddedCapper {
  id: number;
  handle: string;
  tier: number | null;
  display_name: string | null;
  twitter_user_id: string | null;
  status: string | null;
}

export type AddCapperResult =
  | { ok: true; status: "added" | "reactivated" | "already_tracking"; capper: AddedCapper }
  | { ok: false; error: string };

export async function addCapperAction(input: AddCapperInput): Promise<AddCapperResult> {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return { ok: false, error: "ADMIN_API_TOKEN not set on server" };

  const handle = input.handle.replace(/^@/, "").trim();
  if (!handle) return { ok: false, error: "Handle is required" };

  const body: Record<string, unknown> = { handle, tier: input.tier ?? 2 };
  if (input.display_name?.trim()) body.display_name = input.display_name.trim();
  if (input.notes?.trim()) body.notes = input.notes.trim();

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
    };
    revalidatePath("/admin/cappers");
    return { ok: true, status: data.status, capper: data.capper };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
