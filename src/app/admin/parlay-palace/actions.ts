"use server";

import { revalidatePath } from "next/cache";
import { API_BASE } from "@/lib/config";
import { purgeKvByPrefix } from "@/lib/kv-cache";

function adminHeaders(): HeadersInit {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET not set on server");
  return { "Content-Type": "application/json",
           Authorization: `Bearer ${secret}` };
}

export type PalaceActionResult = { ok: true } | { ok: false; error: string };

async function post(path: string): Promise<PalaceActionResult> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST", headers: adminHeaders() });
    if (!res.ok) {
      const b = await res.text().catch(() => "");
      return { ok: false, error: `${res.status}: ${b || res.statusText}` };
    }
    revalidatePath("/admin/parlay-palace");
    revalidatePath("/parlay-palace");
    // Purge the public Parlay Palace KV cache so gallery/detail pages reflect
    // publish/unpublish/enrich changes immediately rather than waiting for TTL.
    try {
      await purgeKvByPrefix("pp:");
    } catch {
      // swallow: TTL fallback covers us
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function enrichAction(parlayId: number) {
  return post(`/api/admin/parlay-palace/${parlayId}/enrich`);
}
export async function publishAction(parlayId: number) {
  return post(`/api/admin/parlay-palace/${parlayId}/publish`);
}
export async function unpublishAction(parlayId: number) {
  return post(`/api/admin/parlay-palace/${parlayId}/unpublish`);
}
