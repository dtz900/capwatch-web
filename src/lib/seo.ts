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

interface FaqInputs {
  handle: string;
  displayName: string | null;
  allTimeAgg: import("./types").CapperAggregate | undefined;
  trackedSince: string | null;
}

export interface FaqQA {
  question: string;
  answer: string;
}

/**
 * Generate the per-capper FAQ Q&A. The visible page content and the FAQPage
 * JSON-LD must use the same source of truth, otherwise Google rejects the
 * rich-result eligibility. Both call this.
 */
export function buildCapperFaq(inputs: FaqInputs): FaqQA[] {
  const { handle, displayName, allTimeAgg, trackedSince } = inputs;
  const name = displayName && displayName !== handle ? `${displayName} (@${handle})` : `@${handle}`;
  const trackedLabel = trackedSince ? formatTrackedSinceLong(trackedSince) : null;

  if (!allTimeAgg || allTimeAgg.picks_count === 0) {
    return [
      {
        question: `Is ${name} tracked on TailSlips?`,
        answer: `Yes. ${name} is on the TailSlips verified-capper leaderboard.${
          trackedLabel ? ` They have been tracked since ${trackedLabel}.` : ""
        } Every public MLB pick they post on Twitter is captured at tweet time and graded against the final game outcome at the odds and stake they posted. The graded record will populate as picks resolve.`,
      },
      {
        question: `How does TailSlips grade ${name}'s picks?`,
        answer: `TailSlips captures every public MLB pick from ${name}'s Twitter timeline at the moment they tweet it, locks in the odds and unit stake they posted, and grades the pick against the actual final outcome of the game. Picks behind paywalls, edited or deleted before game start, or tied to postponed games are not graded as wins or losses.`,
      },
      {
        question: `Where can I see ${name}'s pick history?`,
        answer: `${name}'s full pick history is on their TailSlips profile page. Every pick links back to the original tweet so you can verify what was posted, when, and at what odds and stake.`,
      },
    ];
  }

  const record = formatRecord(allTimeAgg);
  const units = formatUnitsForTitle(allTimeAgg.units_profit);
  const roi = `${allTimeAgg.roi_pct >= 0 ? "+" : ""}${allTimeAgg.roi_pct.toFixed(1)}%`;
  const winRate = `${Math.round(allTimeAgg.win_rate * 100)}%`;
  const profitable = allTimeAgg.units_profit > 0;
  const breakeven = Math.abs(allTimeAgg.units_profit) < 0.5;

  const profitabilityAnswer = breakeven
    ? `${name} is roughly breakeven on tracked MLB picks: ${record} across ${allTimeAgg.picks_count} graded picks for ${units} units (${roi} ROI, ${winRate} win rate). At this sample size their record is too close to flat to call profitable or unprofitable.`
    : profitable
      ? `Yes, on tracked picks. Across ${allTimeAgg.picks_count} graded MLB picks${trackedLabel ? ` since ${trackedLabel}` : ""}, ${name} is ${record} for ${units} units of profit (${roi} ROI, ${winRate} win rate) at the odds and stakes they posted. Past performance does not guarantee future results.`
      : `On tracked picks, no. Across ${allTimeAgg.picks_count} graded MLB picks${trackedLabel ? ` since ${trackedLabel}` : ""}, ${name} is ${record} for ${units} units (${roi} ROI, ${winRate} win rate) at the odds and stakes they posted. The full pick history is on their profile page so you can see the wins and losses yourself.`;

  return [
    {
      question: `Is ${name} a profitable MLB capper?`,
      answer: profitabilityAnswer,
    },
    {
      question: `What is ${name}'s record on TailSlips?`,
      answer: `${name}'s lifetime record on TailSlips is ${record} (${winRate} win rate) across ${allTimeAgg.picks_count} graded MLB picks${trackedLabel ? `, tracked since ${trackedLabel}` : ""}. The record reflects every public pick they posted that met TailSlips's grading criteria, win or lose.`,
    },
    {
      question: `What is ${name}'s ROI on tracked MLB picks?`,
      answer: `${name}'s lifetime ROI on tracked MLB picks is ${roi}, equivalent to ${units} units of profit on ${allTimeAgg.picks_count} graded picks. ROI is calculated against the units actually staked at the odds posted at tweet time, not against an idealized flat-stake model.`,
    },
    {
      question: `How are ${name}'s picks graded?`,
      answer: `Every public MLB pick ${name} posts on Twitter is captured at tweet time, locked at the odds and unit stake they posted, and graded against the actual final outcome of the game. Picks behind paywalls, edited or deleted before game start, or tied to postponed games are not graded as wins or losses. Every tracked account on TailSlips is graded by the same rules.`,
    },
    {
      question: `When did TailSlips start tracking ${name}?`,
      answer: trackedLabel
        ? `TailSlips has tracked ${name} since ${trackedLabel}. Every public pick posted since then is in the graded record on their profile.`
        : `${name} is on the TailSlips verified-capper leaderboard with ${allTimeAgg.picks_count} graded picks on file. Every pick links back to the original tweet for verification.`,
    },
    {
      question: `Should I tail ${name}?`,
      answer: `TailSlips does not give betting advice. We track and grade public picks so you can decide based on a verified record instead of a claimed one. ${name}'s full graded history is on their profile page, including the picks they did not win. Use it to inform your own decisions and bet responsibly.`,
    },
  ];
}

function formatTrackedSinceLong(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  } catch {
    return "";
  }
}
