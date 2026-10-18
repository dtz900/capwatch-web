/* The paid contest TailSlips hosts on Splash Sports (commissioner pools; see
   research/2026-10-17-paid-contests-legality-tailslips.md in the EA repo).
   Splash holds the license, the money and the payouts; we only link to it.
   The link changes every day, so it lives in public/splash-contest.json
   (also fetched by the platform's deal-drop email) and never in code. */

export type SplashContest = {
  enabled: boolean;
  /** YYYY-MM-DD, the PT date of the slate the contest covers. */
  slate_date: string;
  title: string;
  entry: string;
  pays: string;
  lock_label: string;
  url: string;
};

const PT_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" });

const SPLASH_HOST = /^https:\/\/([a-z0-9-]+\.)*splashsports\.com\//i;

/** The contest to show right now, or null. A contest shows from the moment
    it is published until the end of its slate date in PT; a stale file can
    never surface yesterday's link. Only Splash links are honored, so a bad
    edit to the JSON cannot turn the pill into an arbitrary redirect. */
export function activeContest(cfg: SplashContest | null | undefined, now = new Date()): SplashContest | null {
  if (!cfg || !cfg.enabled || !cfg.url || !cfg.slate_date) return null;
  if (!SPLASH_HOST.test(cfg.url)) return null;
  if (PT_DATE.format(now) > cfg.slate_date) return null;
  return cfg;
}
