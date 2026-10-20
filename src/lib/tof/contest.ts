/* The paid contests TailSlips hosts on Splash Sports (commissioner pools; see
   research/2026-10-17-paid-contests-legality-tailslips.md in the EA repo).
   Splash holds the license, the money and the payouts; we only link to it.
   Links change with every contest, so they live in public/splash-contest.json
   (also fetched by the platform's deal-drop email) and never in code.

   File shape: the top-level fields describe one contest (the legacy shape the
   platform emails read) and `contests` lists every open pool. The site reads
   `contests` when present and falls back to the top-level contest otherwise. */

export type SplashContest = {
  enabled: boolean;
  /** YYYY-MM-DD, the PT date of the last slate the contest covers. */
  slate_date: string;
  title: string;
  entry: string;
  pays: string;
  lock_label: string;
  url: string;
  /** ISO-8601 instant with offset when entry closes before the slate ends
      (weekly pools lock Saturday night for a Sunday-Monday slate). The
      contest hides from this moment on; slate_date remains the fallback. */
  closes_at?: string;
  /** Short league tag shown as a chip: NBA, NFL, MLB. */
  sport?: string;
  /** Splash game type: Tiers, Pick 'em, Survivor. */
  format?: string;
  image?: string;
};

export type SplashContestFile = SplashContest & { contests?: SplashContest[] };

const PT_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" });

const SPLASH_HOST = /^https:\/\/([a-z0-9-]+\.)*splashsports\.com\//i;

/** The contest to show right now, or null. A contest shows from the moment
    it is published until entry closes (`closes_at`) or, failing that, the end
    of its slate date in PT; a stale file can never surface yesterday's link.
    Only Splash links are honored, so a bad edit to the JSON cannot turn a
    card into an arbitrary redirect. */
export function activeContest(cfg: SplashContest | null | undefined, now = new Date()): SplashContest | null {
  if (!cfg || !cfg.enabled || !cfg.url || !cfg.slate_date) return null;
  if (!SPLASH_HOST.test(cfg.url)) return null;
  if (PT_DATE.format(now) > cfg.slate_date) return null;
  if (cfg.closes_at) {
    const closes = Date.parse(cfg.closes_at);
    if (Number.isNaN(closes) || now.getTime() >= closes) return null;
  }
  return cfg;
}

/** Every contest open right now, soonest slate first. Reads the `contests`
    list when the file has one, otherwise the legacy single contest. */
export function activeContests(cfg: SplashContestFile | null | undefined, now = new Date()): SplashContest[] {
  if (!cfg) return [];
  const list = Array.isArray(cfg.contests) ? cfg.contests : [cfg];
  return list
    .map((c) => activeContest(c, now))
    .filter((c): c is SplashContest => c !== null)
    .sort((a, b) => a.slate_date.localeCompare(b.slate_date));
}
