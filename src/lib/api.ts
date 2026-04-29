import { API_BASE, REVALIDATE_SECONDS } from "./config";
import type { LeaderboardResponse, Window, Sort } from "./types";

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
