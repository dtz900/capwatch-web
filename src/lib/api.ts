import { API_BASE, REVALIDATE_SECONDS } from "./config";
import type {
  LeaderboardResponse,
  Window,
  Sort,
  BetTypeFilter,
  SlateResponse,
  CapperProfile,
} from "./types";

export interface LeaderboardFilters {
  window: Window;
  sort: Sort;
  bet_type: BetTypeFilter;
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
    bet_type: filters.bet_type,
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

export interface LivePicksCountsResponse {
  counts: Record<string, number>;
}

export async function fetchLivePicksCounts(): Promise<LivePicksCountsResponse> {
  const res = await fetch(`${API_BASE}/api/public/cappers/live-picks-counts`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Live picks counts fetch failed: ${res.status}`);
  return res.json() as Promise<LivePicksCountsResponse>;
}

export async function fetchSlate(date: string = "today"): Promise<SlateResponse> {
  const res = await fetch(`${API_BASE}/api/public/slate?date=${encodeURIComponent(date)}`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`Slate fetch failed: ${res.status}`);
  return res.json() as Promise<SlateResponse>;
}

export interface SportsbookSummary {
  book_key: string;
  display_name: string;
  brand_color: string;
  display_order: number;
}

export interface SportsbooksResponse {
  books: SportsbookSummary[];
}

export async function fetchEnabledSportsbooks(): Promise<SportsbookSummary[]> {
  // Books are enabled per (DB enabled=true) AND ({BOOK_KEY}_AFFILIATE_ID env var
  // set on Railway). Until at least one of those gates flips, this returns []
  // and AffiliatePicker renders nothing -- which is the desired state until
  // we have a real affiliate id to wire in.
  try {
    const res = await fetch(`${API_BASE}/api/public/sportsbooks`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as SportsbooksResponse;
    return body.books ?? [];
  } catch {
    return [];
  }
}

export interface CapperProfileFilters {
  history_limit?: number;
  history_offset?: number;
  market?: string;
  outcome?: string;
}

export interface AuditFilters {
  reason?: string;
  capper?: string;
  kind?: "void" | "ungraded";
  pick_id?: number;
  sort?: "oldest" | "newest";
  limit?: number;
  offset?: number;
}

export interface AuditProblem {
  pick_id: number;
  capper_id: number;
  capper_handle: string | null;
  capper_display_name: string | null;
  kind: "void" | "ungraded";
  reason: string;
  market: string | null;
  selection: string | null;
  line: number | null;
  odds_taken: number | null;
  units: number | null;
  player_id: number | null;
  game_id: string | null;
  /** Date of the linked game (from mlb_predictions). May differ from posted_at
   * when the parser misattributed the game (e.g. doubleheader G1 vs G2). */
  game_date: string | null;
  parlay_id: number | null;
  posted_at: string | null;
  raw_id: number | null;
  tweet_text: string | null;
  tweet_url: string | null;
}

export interface AuditResponse {
  summary: { total: number; graded: number; void: number; ungraded: number };
  by_reason: Record<string, number>;
  total_problems: number;
  limit: number;
  offset: number;
  problems: AuditProblem[];
}

/** Server-only. Requires CRON_SECRET in env to authenticate. */
export async function fetchAudit(filters: AuditFilters = {}): Promise<AuditResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET not set on server");
  const params = new URLSearchParams();
  if (filters.reason) params.set("reason", filters.reason);
  if (filters.capper) params.set("capper", filters.capper);
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.pick_id != null) params.set("pick_id", String(filters.pick_id));
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.limit != null) params.set("limit", String(filters.limit));
  if (filters.offset != null) params.set("offset", String(filters.offset));
  const qs = params.toString();
  const url = `${API_BASE}/api/admin/audit${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Audit fetch failed: ${res.status}`);
  return res.json() as Promise<AuditResponse>;
}

export interface ReviewQueueItem {
  id: number;
  capper_id: number;
  capper_handle: string | null;
  capper_display_name: string | null;
  capper_profile_image_url: string | null;
  raw_id: number | null;
  tweet_id: string | null;
  tweet_url: string | null;
  tweet_excerpt: string;
  posted_at: string | null;
  parsed_at: string | null;
  parser_version: string | null;
  selection: string | null;
  line: number | null;
  odds_taken: number | null;
  units: number | null;
  market: string | null;
  bet_kind: string | null;
  stat_name: string | null;
  player_name: string | null;
  was_image_parsed: boolean | null;
  parlay_id: number | null;
}

export interface ReviewQueueResponse {
  total: number;
  limit: number;
  offset: number;
  items: ReviewQueueItem[];
}

/** Server-only. Lists picks parked in needs_review for admin approval. */
export async function fetchReviewQueue(
  limit: number = 100,
  offset: number = 0,
): Promise<ReviewQueueResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET not set on server");
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const url = `${API_BASE}/api/admin/review-queue?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Review queue fetch failed: ${res.status}`);
  return res.json() as Promise<ReviewQueueResponse>;
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

export interface DeletedPick {
  id: number;
  raw_id: number;
  market: string | null;
  selection: string | null;
  line: number | null;
  odds_taken: number | null;
  units: number | null;
  parlay_id: number | null;
  parlay_leg_index: number | null;
  posted_at: string;
  tweet_deleted_at: string;
  tweet_body: string;
  /** When non-null, refers to a still-live capper_picks.id with the same
   * selection/market/line/odds within +/- 24h, suggesting this row was
   * an edit or duplicate ingest rather than a real deletion. */
  likely_duplicate_of: number | null;
  /** When non-null, the deleted tweet was followed within an hour by a
   * still-live tweet from the same capper with the same body content.
   * This is "delete and repost" — effectively an edit, not a credibility-
   * affecting deletion. URL points to the live replacement tweet. */
  replacement_tweet_url: string | null;
}

export interface DeletedPicksResponse {
  handle: string;
  items: DeletedPick[];
  summary: {
    total: number;
    reposted: number;
    truly_deleted: number;
  };
}

export type EmailSignupStatus = "ok" | "invalid_email" | "error";

export async function submitEmailSignup(input: { email: string; source?: string }): Promise<EmailSignupStatus> {
  try {
    const res = await fetch(`${API_BASE}/api/public/email-signups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
    if (res.ok) return "ok";
    if (res.status === 400) return "invalid_email";
    return "error";
  } catch {
    return "error";
  }
}

export interface PipelineStatusResponse {
  is_stale: boolean;
  message: string | null;
  parser_minutes_ago: number | null;
  grader_minutes_ago: number | null;
}

export async function fetchPipelineStatus(): Promise<PipelineStatusResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/public/pipeline-status`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PipelineStatusResponse;
  } catch {
    return null;
  }
}

export async function fetchDeletedPicks(handle: string): Promise<DeletedPicksResponse> {
  const url = `${API_BASE}/api/public/cappers/${encodeURIComponent(handle)}/deleted-picks`;
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) throw new Error("not_found");
  if (!res.ok) throw new Error(`Deleted picks fetch failed: ${res.status}`);
  return res.json() as Promise<DeletedPicksResponse>;
}
