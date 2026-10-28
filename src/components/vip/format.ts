import { formatUnits } from "@/lib/formatters";
import type { VipCapperStatus, VipEligibility } from "@/lib/vip/types";

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

/** Minimum graded picks in the 30 day window to qualify. */
export const VIP_PICK_FLOOR = 20;

/** How far an OFF sport is from qualifying, in one muted line. */
export function eligibilityGap(e: VipEligibility): string | null {
  if (e.eligible) return null;
  if (e.reason === "below_floor") {
    if (e.n_floor_picks == null) return `${VIP_PICK_FLOOR} picks to qualify`;
    const left = Math.max(1, VIP_PICK_FLOOR - e.n_floor_picks);
    return left === 1 ? "1 more pick to qualify" : `${left} more picks to qualify`;
  }
  if (e.reason === "negative" && e.units != null) {
    return `${Math.abs(e.units).toFixed(1)}u from eligible`;
  }
  if (e.reason === "no_record") return "No picks in the last 30 days";
  return null;
}

/** "NBA", "NBA and NFL", "MLB, NBA and NFL". */
export function joinSports(sports: string[]): string {
  if (sports.length <= 1) return sports.join("");
  return `${sports.slice(0, -1).join(", ")} and ${sports[sports.length - 1]}`;
}

export const VIP_RULE_LINE =
  "Cappers can only sell here while their public record is winning that sport over the last 30 days. Checked every night.";

/** Band headline: does this capper sell VIP picks, and in what. */
export function vipHeadline(s: VipCapperStatus): string {
  const eligible = s.eligibility.filter((e) => e.eligible).map((e) => String(e.sport));
  if (s.seller) {
    return s.door_open && eligible.length > 0
      ? `Selling ${joinSports(eligible)} VIP picks`
      : "Not selling right now";
  }
  return eligible.length > 0
    ? `Eligible to sell ${joinSports(eligible)} VIP picks`
    : "Not eligible to sell yet";
}

/** Muted sub-lines under a card's focal number. */
export function eligibilityDetail(e: VipEligibility): string[] {
  const first = e.units == null ? "No record yet" : `${e.n_picks ?? 0} picks · last 30 days`;
  let second: string | null = null;
  if (!e.eligible) second = e.reason ? (REASON_COPY[e.reason] ?? null) : null;
  else if (e.fail_streak === 1) second = "One bad night, still selling";
  const lines = second && second !== first ? [first, second] : [first];
  const gap = eligibilityGap(e);
  return gap ? [...lines, gap] : lines;
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
