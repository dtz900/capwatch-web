import type { CapperProfile, Window } from "./types";

export const SITE_URL = "https://tailslips.com";
export const SITE_NAME = "TailSlips";
export const SITE_TAGLINE =
  "Verified MLB picks from tracked Twitter cappers, parsed live and graded against final game outcomes.";

export function canonicalUrl(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${SITE_URL}${path}`;
}

interface RecordLine {
  wins: number;
  losses: number;
  pushes: number;
}

export function formatRecord({ wins, losses, pushes }: RecordLine): string {
  return pushes > 0 ? `${wins}-${losses}-${pushes}` : `${wins}-${losses}`;
}

export function formatUnitsForTitle(units: number): string {
  const sign = units >= 0 ? "+" : "-";
  return `${sign}${Math.abs(units).toFixed(1)}u`;
}

export function formatRoiForTitle(pct: number): string {
  const sign = pct >= 0 ? "+" : "-";
  return `${sign}${Math.abs(pct).toFixed(1)}% ROI`;
}

/**
 * Same as formatRoiForTitle but without the " ROI" word suffix. Use in
 * contexts where the surrounding label already conveys the metric (OG card
 * stat tiles where the tile label is "ROI"), so the value can render on a
 * single line at large font sizes.
 */
export function formatRoiNumeric(pct: number): string {
  const sign = pct >= 0 ? "+" : "-";
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}

export function formatWinRateForTitle(rate: number): string {
  return `${Math.round(rate * 100)}% win rate`;
}

interface CapperMetaInputs {
  handle: string;
  displayName: string | null;
  windowAgg: CapperProfile["aggregates"][Window];
  allTimeAgg: CapperProfile["aggregates"][Window];
  trackedSince?: string | null;
  liveOrPending?: number;
}

export function buildCapperTitle(inputs: CapperMetaInputs): string {
  const { handle, allTimeAgg } = inputs;
  if (!allTimeAgg || allTimeAgg.picks_count === 0) {
    return `@${handle} · MLB capper record on ${SITE_NAME}`;
  }
  const record = formatRecord(allTimeAgg);
  const units = formatUnitsForTitle(allTimeAgg.units_profit);
  const roi = formatRoiForTitle(allTimeAgg.roi_pct);
  return `@${handle} · ${record} ${units} (${roi}) · MLB capper record on ${SITE_NAME}`;
}

export function buildCapperDescription(inputs: CapperMetaInputs): string {
  const { handle, displayName, allTimeAgg } = inputs;
  const name = displayName && displayName !== handle ? `${displayName} (@${handle})` : `@${handle}`;
  if (!allTimeAgg || allTimeAgg.picks_count === 0) {
    return `${name} is tracked on ${SITE_NAME}. Every public MLB pick is parsed within seconds and graded against the final game outcome.`;
  }
  const record = formatRecord(allTimeAgg);
  const units = formatUnitsForTitle(allTimeAgg.units_profit);
  const roi = formatRoiForTitle(allTimeAgg.roi_pct);
  const wr = formatWinRateForTitle(allTimeAgg.win_rate);
  const sinceStr = inputs.trackedSince ? ` Tracked since ${formatTrackedSince(inputs.trackedSince)}.` : "";
  return `${name} is ${record} (${units}, ${roi}, ${wr}) on the ${SITE_NAME} verified-capper leaderboard across ${allTimeAgg.picks_count} graded MLB picks.${sinceStr} Every public pick is parsed within seconds and graded against final outcomes.`;
}

export function buildCapperOgDescription(inputs: CapperMetaInputs): string {
  const { handle, allTimeAgg } = inputs;
  if (!allTimeAgg || allTimeAgg.picks_count === 0) {
    return `Verified MLB pick history for @${handle} on ${SITE_NAME}.`;
  }
  const record = formatRecord(allTimeAgg);
  const units = formatUnitsForTitle(allTimeAgg.units_profit);
  const roi = formatRoiForTitle(allTimeAgg.roi_pct);
  return `${record} ${units} (${roi}) across ${allTimeAgg.picks_count} graded MLB picks. Verified on ${SITE_NAME}.`;
}

function formatTrackedSince(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  } catch {
    return "";
  }
}

/**
 * Map ROI to a stable 1-5 review scale. Anchors picked so the median capper
 * sits near 3.0 and the band rewards genuine edge without inflating noise.
 * 0% ROI = 3.0, +5% = 4.0, +15% = 5.0, -5% = 2.0, -15% = 1.0.
 */
export function roiToReviewRating(roiPct: number): number {
  const clamped = Math.max(-15, Math.min(15, roiPct));
  const rating = 3 + clamped * 0.1333;
  return Math.round(rating * 10) / 10;
}
