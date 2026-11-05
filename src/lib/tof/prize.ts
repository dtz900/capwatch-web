/* The sponsored weekly Tail or Fade prize (first sponsor: @doctorsportshq,
   $25 a week from 2026-11). Lives in public/tof-prize.json, which the
   platform's deal-drop email also fetches, so turning it on is a JSON edit
   and a deploy, never a code change.

   Rules: most units on the week board wins, minimum WEEK_MIN_PLAYS graded
   plays, week runs Tuesday through Monday (slate dates) so Monday Night
   Football counts. Free to play. Keep `enabled` false until that week's
   money is in hand. */

export type TofPrize = {
  enabled: boolean;
  /** Display string, e.g. "$25". */
  amount: string;
  /** X handle without the @. */
  sponsor_handle: string;
  /** Short display name ("DSHQ"); falls back to @handle. */
  sponsor_name?: string;
  /** Site-relative logo path under /sponsors/; anything else is ignored. */
  sponsor_logo?: string;
  /** YYYY-MM-DD (a Tuesday): the first prize week. */
  starts: string;
  /** YYYY-MM-DD, last day the prize runs; null means open ended. */
  ends: string | null;
};

/** Enforced by the platform (core/tof_weekly_prize.WEEK_MIN_PLAYS); keep in sync. */
export const WEEK_MIN_PLAYS = 10;

const ET_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
const X_HANDLE = /^[A-Za-z0-9_]{1,15}$/;
const ROLLOVER_MS = 6 * 3600 * 1000;

/** The platform's slate date: the ET calendar day, rolling over at 6 AM ET,
    so the web flips to the prize week the same moment the API does. */
export function slateDate(now: Date): string {
  return ET_DATE.format(new Date(now.getTime() - ROLLOVER_MS));
}

/** How the sponsor is named and pictured. The logo must be one of our own
    files under /sponsors/, so a bad JSON edit cannot hotlink anything. */
export function sponsorDisplay(prize: TofPrize): { name: string; logo: string | null; url: string } {
  const name = prize.sponsor_name?.trim() || `@${prize.sponsor_handle}`;
  const logo = prize.sponsor_logo && /^\/sponsors\/[a-z0-9_-]+\.(png|jpe?g|webp)$/i.test(prize.sponsor_logo) ? prize.sponsor_logo : null;
  return { name, logo, url: `https://x.com/${prize.sponsor_handle}` };
}

/** The prize to show, or null. `live` is false while announced but not yet
    started; the board stays on the month until it goes live. */
export function activePrize(cfg: TofPrize | null | undefined, now = new Date()): { prize: TofPrize; live: boolean } | null {
  if (!cfg || !cfg.enabled || !cfg.amount || !cfg.starts) return null;
  if (!X_HANDLE.test(cfg.sponsor_handle ?? "")) return null;
  const today = slateDate(now);
  if (cfg.ends && today > cfg.ends) return null;
  return { prize: cfg, live: today >= cfg.starts };
}
