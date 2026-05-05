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

async function call(path: string): Promise<ReviewActionResult> {
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
  return call(`/api/admin/picks/${pickId}/approve`);
}

export async function rejectPickAction(pickId: number): Promise<ReviewActionResult> {
  return call(`/api/admin/picks/${pickId}/reject`);
}
