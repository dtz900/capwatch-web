import type { BetTypeFilter, CapperProfile, Window } from "./types";

export interface CapperSliceQuery {
  window: Window;
  betType: BetTypeFilter;
  market?: string;
  outcome?: string;
  offset?: number;
  limit?: number;
  start?: string;
  end?: string;
}

/** Fetch a capper profile slice via the internal route handler. Callable from
 * client components (same-origin, no API_BASE/CORS). Returns the full profile
 * so callers can read aggregates + trajectory + market_slices and the history
 * page from one response. */
export async function fetchCapperSlice(
  handle: string,
  q: CapperSliceQuery,
): Promise<CapperProfile> {
  const params = new URLSearchParams();
  params.set("window", q.window);
  params.set("bet_type", q.betType);
  if (q.market) params.set("market", q.market);
  if (q.outcome) params.set("outcome", q.outcome);
  if (q.start) params.set("start", q.start);
  if (q.end) params.set("end", q.end);
  params.set("offset", String(q.offset ?? 0));
  params.set("limit", String(q.limit ?? 25));
  const res = await fetch(
    `/api/cappers/${encodeURIComponent(handle)}/history?${params.toString()}`,
  );
  if (!res.ok) throw new Error(`capper slice fetch failed: ${res.status}`);
  return (await res.json()) as CapperProfile;
}
