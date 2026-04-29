import { API_BASE, REVALIDATE_SECONDS } from "./config";
import type {
  LeaderboardResponse,
  Window,
  Sort,
  SlateResponse,
  CapperProfile,
} from "./types";

export interface LeaderboardFilters {
  window: Window;
  sort: Sort;
  min_picks: number;
  active_only: boolean;
}

export type SuggestionStatus = "queued" | "already_tracked" | "duplicate" | "invalid";

export async function suggestCapper(input: { handle: string; reason?: string }): Promise<SuggestionStatus> {
  const res = await fetch(`${API_BASE}/api/public/capper-suggestions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(`Suggestion failed: ${res.status}`);
  }
  const body = (await res.json()) as { status: SuggestionStatus };
  return body.status;
}

export async function fetchLeaderboard(filters: LeaderboardFilters): Promise<LeaderboardResponse> {
  const params = new URLSearchParams({
    window: filters.window,
    sort: filters.sort,
    min_picks: String(filters.min_picks),
    active_only: String(filters.active_only),
  });
  const res = await fetch(`${API_BASE}/api/public/cappers?${params}`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) {
    throw new Error(`Leaderboard fetch failed: ${res.status}`);
  }
  return res.json() as Promise<LeaderboardResponse>;
}

export async function fetchSlate(date: string = "today"): Promise<SlateResponse> {
  const res = await fetch(`${API_BASE}/api/public/slate?date=${encodeURIComponent(date)}`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`Slate fetch failed: ${res.status}`);
  return res.json() as Promise<SlateResponse>;
}

export interface CapperProfileFilters {
  history_limit?: number;
  history_offset?: number;
  market?: string;
  outcome?: string;
}

export async function fetchCapperProfile(
  handle: string,
  filters: CapperProfileFilters = {},
): Promise<CapperProfile> {
  const params = new URLSearchParams();
  if (filters.history_limit != null) params.set("history_limit", String(filters.history_limit));
  if (filters.history_offset != null) params.set("history_offset", String(filters.history_offset));
  if (filters.market) params.set("market", filters.market);
  if (filters.outcome) params.set("outcome", filters.outcome);
  const qs = params.toString();
  const url = `${API_BASE}/api/public/cappers/${encodeURIComponent(handle)}${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (res.status === 404) throw new Error("not_found");
  if (!res.ok) throw new Error(`Capper profile fetch failed: ${res.status}`);
  return res.json() as Promise<CapperProfile>;
}
