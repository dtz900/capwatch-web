import { API_BASE } from "@/lib/config";
import type {
  BoardGame,
  BoardSlateGame,
  BoardSport,
  VipCapperStatus,
  VipGameResult,
  VipMe,
  VipPickBody,
  VipPickResult,
  VipSeller,
  VipSellerSubscriber,
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
  body: {
    price_cents: number;
    accept_terms: boolean;
    terms_version: string;
    preferred_book?: string | null;
  },
  token: string | null,
) {
  return vipFetch<VipSeller>("/api/vip/seller", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

export function patchVipSeller(
  body: { price_cents?: number; preferred_book?: string },
  token: string | null,
) {
  return vipFetch<VipSeller>("/api/vip/seller", {
    method: "PATCH",
    body: JSON.stringify(body),
    token,
  });
}

export function startVipOnboarding(token: string | null) {
  return vipFetch<{ url: string }>("/api/vip/seller/onboarding", { method: "POST", token });
}

export function getVipSellerAccount(token: string | null) {
  return vipFetch<{ status: string; charges_enabled: boolean }>("/api/vip/seller/account", { token });
}

export function stopVipSelling(token: string | null) {
  return vipFetch<{ status: string; canceled: number }>("/api/vip/seller/stop", {
    method: "POST",
    token,
  });
}

export function startVipSelling(token: string | null) {
  return vipFetch<{ status: string }>("/api/vip/seller/start", { method: "POST", token });
}

export function getVipSellerSubscribers(token: string | null) {
  return vipFetch<{ subscribers: VipSellerSubscriber[] }>("/api/vip/seller/subscribers", { token });
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

export function getVipBoardSlate(sport: BoardSport, token: string | null) {
  const qs = new URLSearchParams({ sport });
  return vipFetch<{ games: BoardSlateGame[] }>(`/api/vip/board/slate?${qs}`, { token });
}

export function getVipBoardGame(sport: BoardSport, gameId: string, token: string | null) {
  return vipFetch<BoardGame>(
    `/api/vip/board/${encodeURIComponent(sport)}/${encodeURIComponent(gameId)}`,
    { token },
  );
}

export function fixVipPick(ticketId: number, body: VipPickBody, token: string | null) {
  return vipFetch<VipPickResult>(`/api/vip/picks/${ticketId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    token,
  });
}

/* Pull a posted ticket. 204 has no body, and 404 means it is already gone
 * (a double tap or a retry), so both resolve. */
export async function pullVipPick(ticketId: number, token: string | null): Promise<void> {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}/api/vip/picks/${ticketId}`, {
    method: "DELETE",
    headers,
    cache: "no-store",
  });
  if (res.ok || res.status === 404) return;
  throw new VipApiError(res.status, await readDetail(res));
}

export function startVipCheckout(capperId: number | string, termsVersion: string, token: string | null) {
  return vipFetch<{ url: string }>(`/api/vip/cappers/${capperId}/checkout`, {
    method: "POST",
    body: JSON.stringify({ terms_version: termsVersion }),
    token,
  });
}

export function openVipPortal(capperId: number | string, token: string | null) {
  return vipFetch<{ url: string }>(`/api/vip/cappers/${capperId}/portal`, { method: "POST", token });
}
