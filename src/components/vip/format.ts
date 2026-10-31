import { formatUnits } from "@/lib/formatters";
import type { VipCapperStatus, VipEligibility } from "@/lib/vip/types";

/** Signed, one decimal, with the unit suffix: 12.34 -> "+12.3u". */
export function signedUnits(units: number | null | undefined): string {
  return `${formatUnits(units ?? 0)}u`;
}

export function eligibleCopy(e: VipEligibility): string {
  if (e.in_season === false)
    return `${e.sport} VIP eligible, back when the season starts: ${signedUnits(e.units)} over last 30 days (${e.n_picks ?? 0} picks)`;
  return `Selling ${e.sport} VIP: ${signedUnits(e.units)} over last 30 days (${e.n_picks ?? 0} picks)`;
}

/** Eligibility rows with in_season filled from the status's in-season list;
 *  untouched when an older platform build sends no list. */
export function withSeason(s: VipCapperStatus): VipEligibility[] {
  const live = s.in_season_sports;
  if (!live) return s.eligibility;
  return s.eligibility.map((e) => ({ ...e, in_season: live.includes(String(e.sport)) }));
}

export function closedCopy(e: VipEligibility): string {
  return `Not currently selling: ${signedUnits(e.units)} ${e.sport}, last 30 days`;
}

/** Card focal number: signed one decimal, unsigned at zero, "0.0u" with no
 *  history row yet (never a dash placeholder). */
export function focalUnits(units: number | null | undefined): string {
  if (units == null || Math.abs(units) < 0.05) return "0.0u";
  return signedUnits(units);
}

/** "NBA", "NBA and NFL", "MLB, NBA and NFL". */
export function joinSports(sports: string[]): string {
  if (sports.length <= 1) return sports.join("");
  return `${sports.slice(0, -1).join(", ")} and ${sports[sports.length - 1]}`;
}

export const VIP_RULE_LINE = "Only a winning 30 day record can sell.";

/** Exclusivity line: this capper's place among every tracked capper
 *  eligible to sell that sport, "1 of 1 eligible NBA cappers". Null when
 *  nothing qualifies or the platform sent no counts. */
export function exclusivityLine(s: VipCapperStatus): string | null {
  const field = s.sport_field;
  if (!field) return null;
  const parts = s.eligibility
    .filter((e) => e.eligible && field[String(e.sport)])
    .map((e) => `1 of ${Math.max(1, field[String(e.sport)].qualified)} eligible ${e.sport} cappers`);
  return parts.length === 0 ? null : parts.join(" · ");
}

/** Band headline: one state for everyone. Eligible in any sport reads
 *  "VIP Eligible" (with a check in the band), seller or not; the price and
 *  Subscribe button say whether they are selling. */
export function vipHeadline(s: VipCapperStatus): string {
  return s.eligibility.some((e) => e.eligible) ? "VIP Eligible" : "Not VIP eligible right now";
}

/** Whole dollars drop the cents: 2500 -> "25", 1999 -> "19.99". */
export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2);
}

function etDay(d: Date): string {
  return d.toLocaleDateString("en-US", { timeZone: "America/New_York" });
}

/** Wall-clock reveal time in Eastern, e.g. "7:05 PM ET"; a reveal on another
 *  ET day than `now` leads with the weekday, e.g. "Wed 7:05 PM ET". */
export function formatRevealTime(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  const t = at.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
  if (etDay(at) === etDay(now)) return `${t} ET`;
  const wd = at.toLocaleDateString("en-US", { weekday: "short", timeZone: "America/New_York" });
  return `${wd} ${t} ET`;
}

/** formatRevealTime with its preposition: "at 4:30 PM ET" today,
 *  "on Sun 12:30 PM ET" on another day. */
export function formatRevealPhrase(iso: string, now: Date = new Date()): string {
  const when = formatRevealTime(iso, now);
  return etDay(new Date(iso)) === etDay(now) ? `at ${when}` : `on ${when}`;
}

/** Shown in place of the Subscribe button when new subscriptions are closed.
 *  Keep in step with the pause rules on /vip-rules. */
export const DOOR_CLOSED: Record<string, string> = {
  silent: "No VIP picks in 14 days. Subscriptions reopen with the next pick.",
  ineligible:
    "Not eligible to sell right now. Subscriptions reopen when they qualify again.",
  not_selling: "Not taking subscribers right now.",
  off_season:
    "Eligible, but the season hasn't started. Subscriptions open with the first games.",
};
