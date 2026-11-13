import type { RawSibling, ReviewQueueItem } from "@/lib/api";
import type { LiveTwin } from "@/lib/liveTwin";
import type { QueueRow } from "../audit/labels";
import { reasonLabel } from "./reviewLabels";

export type ReviewRow = Omit<QueueRow, "posted_label" | "game_label"> & {
  review_reason: string | null;
  reason_label: string;
  reason_soft: boolean;
  started_minutes: number | null;
  posted_label: string;
  tip_label: string | null;
  game_label: string | null;
  player_team: string | null;
  game_teams: { away: string; home: string } | null;
  player_mismatch: string | null;
  raw_siblings: RawSibling[];
  capper_profile_image_url: string | null;
  tweet_excerpt: string;
  /** The capper's pick that is already live on the same game, side and line. */
  live_twin: (LiveTwin & { posted_label: string }) | null;
};

const PT = "America/Los_Angeles";
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: PT, year: "numeric", month: "2-digit", day: "2-digit" });
const timeOnly = new Intl.DateTimeFormat("en-US", { timeZone: PT, hour: "numeric", minute: "2-digit" });
const dateTime = new Intl.DateTimeFormat("en-US", {
  timeZone: PT,
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** Pacific-time label: time only on the same PT calendar day as `now`, else "Mon D, h:mm AM". */
export function ptLabel(iso: string, now: Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (dayKey.format(d) === dayKey.format(now)) return timeOnly.format(d);
  return dateTime.format(d);
}

function playerMismatch(
  team: string | null,
  teams: { away: string; home: string } | null,
  gameLabel: string | null,
): string | null {
  if (!team || !teams) return null;
  const t = team.toUpperCase();
  if (t === teams.away.toUpperCase() || t === teams.home.toUpperCase()) return null;
  return `plays for ${team}, not in ${gameLabel ?? `${teams.away} @ ${teams.home}`}. Wrong game?`;
}

export function toReviewRow(item: ReviewQueueItem, siblings: RawSibling[], now: Date): ReviewRow {
  const why = reasonLabel(item.review_reason);
  return {
    pick_id: item.id,
    capper_id: item.capper_id,
    sport: item.sport ?? undefined,
    capper_handle: item.capper_handle,
    capper_display_name: item.capper_display_name,
    kind: "ungraded",
    reason: item.review_reason ?? "",
    market: item.market,
    selection: item.selection,
    line: item.line,
    odds_taken: item.odds_taken,
    units: item.units,
    player_id: null,
    game_id: item.game_id == null ? null : String(item.game_id),
    game_date: null,
    parlay_id: item.parlay_id,
    posted_at: item.posted_at,
    raw_id: item.raw_id,
    tweet_text: item.tweet_text ?? item.tweet_excerpt ?? null,
    tweet_url: item.tweet_url,
    bet_kind: item.bet_kind,
    stat_name: item.stat_name,
    player_name: item.player_name,
    media_urls: item.media_urls ?? [],
    review_reason: item.review_reason,
    reason_label: why.text,
    reason_soft: why.soft,
    started_minutes: item.game_started_minutes_before_post,
    posted_label: item.posted_at ? ptLabel(item.posted_at, now) : "",
    tip_label: item.game_commence_time ? ptLabel(item.game_commence_time, now) : null,
    game_label: item.game_label,
    player_team: item.player_team,
    game_teams: item.game_teams,
    player_mismatch: playerMismatch(item.player_team, item.game_teams, item.game_label),
    raw_siblings: siblings,
    capper_profile_image_url: item.capper_profile_image_url,
    tweet_excerpt: item.tweet_excerpt,
    live_twin: item.live_twin
      ? { ...item.live_twin, posted_label: item.live_twin.posted_at ? ptLabel(item.live_twin.posted_at, now) : "" }
      : null,
  };
}

/** Held picks per tweet (`raw_id`); rows without a raw id are not grouped. */
export function groupSizes(rows: ReviewRow[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const r of rows) {
    if (r.raw_id == null) continue;
    m.set(r.raw_id, (m.get(r.raw_id) ?? 0) + 1);
  }
  return m;
}

/** The one red flag a row carries, by precedence: started, no game, then a real hold reason. */
export function rowFlag(r: ReviewRow): string | null {
  if (r.started_minutes != null) return "Started before the tweet";
  if (r.game_id == null && r.parlay_id == null) return "No game";
  if (!r.reason_soft) return r.reason_label;
  return null;
}
