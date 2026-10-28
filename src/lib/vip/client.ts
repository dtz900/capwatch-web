import { API_BASE } from "@/lib/config";
import type {
  VipCapperStatus,
  VipGameResult,
  VipMe,
  VipPickBody,
  VipPickResult,
  VipSeller,
  VipSubscription,
} from "./types";

export class VipApiError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(`vip_${status}`);
    this.name = "VipApiError";
    this.status = status;
    this.detail = detail;
  }
}

type VipInit = RequestInit & { token?: string | null };

async function readDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.detail === "string") return body.detail;
  } catch {
    // body was not JSON; fall through to the status text
  }
  return res.statusText;
}

/* Browser-side call to the platform with the user's Supabase access token. */
export async function vipFetch<T>(path: string, init: VipInit = {}): Promise<T> {
  const { token, headers: rawHeaders, ...rest } = init;
  const headers = new Headers(rawHeaders);
  if (rest.body != null) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    cache: "no-store",
  });
  if (!res.ok) throw new VipApiError(res.status, await readDetail(res));
  return (await res.json()) as T;
}

export function getVipCapperStatus(capperId: number | string, token: string | null) {
  return vipFetch<VipCapperStatus>(`/api/vip/cappers/${capperId}`, { token });
}

export function getVipMe(token: string | null) {
  return vipFetch<VipMe>("/api/vip/me", { token });
}

export function postVipSeller(
  body: { price_cents: number; accept_terms: boolean },
  token: string | null,
) {
  return vipFetch<VipSeller>("/api/vip/seller", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

export function patchVipSeller(body: { price_cents: number }, token: string | null) {
  return vipFetch<VipSeller>("/api/vip/seller", {
    method: "PATCH",
    body: JSON.stringify(body),
    token,
  });
}

export function searchVipGames(
  date: string,
  team: string,
  sport: string,
  token: string | null,
) {
  const qs = new URLSearchParams({ date, team, sport });
  return vipFetch<{ results: VipGameResult[] }>(`/api/vip/games/search?${qs}`, { token });
}

export function postVipPick(body: VipPickBody, token: string | null) {
  return vipFetch<VipPickResult>("/api/vip/picks", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

export function getVipSubscriptions(token: string | null) {
  return vipFetch<{ subscriptions: VipSubscription[] }>("/api/vip/subscriptions", { token });
}
