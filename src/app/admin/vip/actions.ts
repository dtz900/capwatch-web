"use server";

import { API_BASE } from "@/lib/config";

function adminHeaders(): HeadersInit {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET not set on server");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${secret}`,
  };
}

export interface VipGrantInput {
  user_email: string;
  capper: string;
  days: number;
}

export type VipGrantResult =
  | {
      ok: true;
      row: {
        capper_id: number;
        user_id: string;
        status: string;
        current_period_end: string | null;
      };
    }
  | { ok: false; error: string };

const NOT_FOUND_MESSAGES: Record<string, string> = {
  user_not_found: "User not found",
  capper_not_found: "Capper not found",
};

async function readError(
  res: Response,
  method: "POST" | "DELETE",
): Promise<string> {
  if (res.status === 404) {
    let detail: unknown;
    let parsed = false;
    try {
      detail = ((await res.json()) as { detail?: unknown }).detail;
      parsed = true;
    } catch {
      // Non-JSON 404 falls through to the generic message below.
    }
    if (typeof detail === "string" && NOT_FOUND_MESSAGES[detail]) {
      return NOT_FOUND_MESSAGES[detail];
    }
    if (parsed && method === "DELETE") return "No subscription to revoke";
  }
  return `Request failed (${res.status})`;
}

const DAYS_ERROR = "Days must be a whole number from 1 to 3650";

function validDays(days: number): boolean {
  return Number.isInteger(days) && days >= 1 && days <= 3650;
}

async function call(
  method: "POST" | "DELETE",
  input: VipGrantInput,
): Promise<VipGrantResult> {
  if (!validDays(input.days)) return { ok: false, error: DAYS_ERROR };
  try {
    const res = await fetch(`${API_BASE}/api/admin/vip/subscriptions`, {
      method,
      headers: adminHeaders(),
      body: JSON.stringify(input),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: await readError(res, method) };
    const row = (await res.json()) as Extract<VipGrantResult, { ok: true }>["row"];
    return { ok: true, row };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function grantVipSubscriptionAction(
  input: VipGrantInput,
): Promise<VipGrantResult> {
  return call("POST", input);
}

export async function revokeVipSubscriptionAction(
  input: VipGrantInput,
): Promise<VipGrantResult> {
  return call("DELETE", input);
}
