import { formatUnits } from "@/lib/formatters";
import type { VipEligibility } from "@/lib/vip/types";

/** Signed, one decimal, with the unit suffix: 12.34 -> "+12.3u". */
export function signedUnits(units: number | null | undefined): string {
  return `${formatUnits(units ?? 0)}u`;
}

export function eligibleCopy(e: VipEligibility): string {
  return `Selling ${e.sport} VIP: ${signedUnits(e.units)} over last 30 days (${e.n_picks ?? 0} picks)`;
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

const REASON_COPY: Record<string, string> = {
  below_floor: "Under the 20 pick floor",
  negative: "Negative over 30 days",
  no_record: "No record yet",
};

/** Muted sub-lines under a card's focal number. */
export function eligibilityDetail(e: VipEligibility): string[] {
  const first = e.units == null ? "No record yet" : `${e.n_picks ?? 0} picks · last 30 days`;
  let second: string | null = null;
  if (!e.eligible) second = e.reason ? (REASON_COPY[e.reason] ?? null) : null;
  else if (e.fail_streak === 1) second = "One bad night, still selling";
  return second && second !== first ? [first, second] : [first];
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
