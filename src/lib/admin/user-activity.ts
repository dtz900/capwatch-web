import type { SupabaseClient } from "@supabase/supabase-js";
import { TZ, ptDayKey } from "./signup-trend";

/* Who signs in and how often, for the admin Users page. Two sources: the
   admin_user_activity() RPC (auth.users sign-in and session refresh times)
   and PostHog (active days per signed-in user). Both degrade quietly: the
   page must still render when either is unavailable. */

export interface UserActivity {
  lastSignInAt: string | null;
  lastSeenAt: string | null;
}

export async function fetchUserActivity(db: SupabaseClient): Promise<Map<string, UserActivity>> {
  const out = new Map<string, UserActivity>();
  const { data, error } = await db.rpc("admin_user_activity");
  if (error) {
    console.error("admin users activity rpc failed:", error);
    return out;
  }
  for (const r of (data ?? []) as {
    user_id: string;
    last_sign_in_at: string | null;
    last_seen_at: string | null;
  }[]) {
    out.set(r.user_id, { lastSignInAt: r.last_sign_in_at ?? null, lastSeenAt: r.last_seen_at ?? null });
  }
  return out;
}

export interface PosthogActivity {
  activeDays: number;
  pageviews: number;
  lastEventAt: string | null;
}

const UUID_RE = /^[0-9a-f-]{36}$/;
const DEFAULT_PROJECT_ID = "642616";

/** Reads a HogQL response body by column name. Rows without a distinct_id are skipped. */
export function parsePosthogQuery(body: unknown): Map<string, PosthogActivity> {
  const out = new Map<string, PosthogActivity>();
  if (!body || typeof body !== "object") return out;
  const { columns, results } = body as { columns?: unknown; results?: unknown };
  if (!Array.isArray(columns) || !Array.isArray(results)) return out;
  const idx = (name: string) => columns.indexOf(name);
  const iId = idx("distinct_id");
  const iDays = idx("active_days");
  const iViews = idx("pageviews");
  const iLast = idx("last_event");
  if (iId < 0) return out;
  for (const row of results) {
    if (!Array.isArray(row)) continue;
    const id = row[iId];
    if (typeof id !== "string" || id === "") continue;
    const last = iLast >= 0 ? row[iLast] : null;
    out.set(id, {
      activeDays: iDays >= 0 ? Number(row[iDays]) || 0 : 0,
      pageviews: iViews >= 0 ? Number(row[iViews]) || 0 : 0,
      lastEventAt: typeof last === "string" ? last : null,
    });
  }
  return out;
}

/** Null when PostHog is not configured or the call fails; never throws. */
export async function fetchPosthogActivity(userIds: string[]): Promise<Map<string, PosthogActivity> | null> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) return null;
  const ids = userIds.filter((id) => UUID_RE.test(id));
  if (ids.length === 0) return new Map();
  const projectId = process.env.POSTHOG_PROJECT_ID || DEFAULT_PROJECT_ID;
  const inList = ids.map((id) => `'${id}'`).join(", ");
  const query =
    "SELECT distinct_id, count(DISTINCT toDate(toTimeZone(timestamp, 'US/Pacific'))) AS active_days, " +
    "count() AS pageviews, max(timestamp) AS last_event FROM events " +
    "WHERE event = '$pageview' AND timestamp >= now() - INTERVAL 30 DAY " +
    `AND distinct_id IN (${inList}) GROUP BY distinct_id`;
  try {
    const res = await fetch(`https://us.posthog.com/api/projects/${projectId}/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("admin users posthog query failed:", res.status);
      return null;
    }
    return parsePosthogQuery(await res.json());
  } catch (err) {
    console.error("admin users posthog query failed:", err);
    return null;
  }
}

function dayDiff(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split("-").map(Number);
  const [ty, tm, td] = toKey.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/** "today", "yesterday", "5d ago", "3w ago", else "Sep 3". Pacific calendar days. */
export function relativeLabel(iso: string | null, now: Date): string {
  if (!iso) return "never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "never";
  const days = dayDiff(ptDayKey(d), ptDayKey(now));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days <= 13) return `${days}d ago`;
  if (days <= 56) return `${Math.floor(days / 7)}w ago`;
  return d.toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric" });
}

export interface ActivityFields {
  activeDays30: number | null;
  lastSeenAt: string | null;
  createdAt: string | null;
}

function cmpDescNullsLast<T extends number | string>(a: T | null, b: T | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a === b ? 0 : a > b ? -1 : 1;
}

/** Most active: active days desc, then last seen desc, then newest account. */
export function activityRank(a: ActivityFields, b: ActivityFields): number {
  return (
    cmpDescNullsLast(a.activeDays30, b.activeDays30) ||
    cmpDescNullsLast(a.lastSeenAt, b.lastSeenAt) ||
    cmpDescNullsLast(a.createdAt, b.createdAt)
  );
}
