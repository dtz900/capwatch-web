/* Promote: the seller's share cards and their post text. Pure helpers used by
 * the dashboard panel, the card image routes and the share pages, so all
 * three say the same thing. Every number comes from the verified record.
 * Copy rules: no em dashes, no double hyphens, no claims the data does not make. */

import { formatBetDescriptor } from "@/lib/markets";
import { SITE_URL } from "@/lib/seo";
import { vipSelection } from "./describe";
import type { VipCapperStatus, VipEligibility, VipLockedPick } from "./types";

export const PROMO_KINDS = ["brand", "launch", "receipt", "record"] as const;
export type PromoKind = (typeof PROMO_KINDS)[number];

export function isPromoKind(v: string): v is PromoKind {
  return (PROMO_KINDS as readonly string[]).includes(v);
}

/** One winning VIP ticket, public (revealed) only: GET /api/vip/cappers/{id}/receipts. */
export interface VipReceipt {
  /** "s123" for a straight pick, "p45" for a parlay ticket. */
  ticket_id: string;
  sport: string;
  posted_at: string;
  commence_time: string | null;
  odds: number | null;
  units: number | null;
  profit_units: number;
  legs: VipLockedPick[];
}

/** The eligible sport with the most units over 30 days, or null. */
export function bestSport(eligibility: VipEligibility[]): VipEligibility | null {
  const yes = eligibility.filter((e) => e.eligible);
  if (yes.length === 0) return null;
  return yes.reduce((a, b) => ((b.units ?? 0) > (a.units ?? 0) ? b : a));
}

/** "1 of 7 NBA cappers", from the same count as the profile's line. */
export function exclusivityFor(status: VipCapperStatus, sport: string): string | null {
  const field = status.sport_field?.[sport];
  if (!field) return null;
  return `1 of ${Math.max(1, field.qualified)} ${sport} cappers`;
}

/** One decimal, like the profile and leaderboard ("+6.5u"). */
export function signedUnits(u: number): string {
  const v = Math.round(u * 10) / 10;
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}u`;
}

/** A single ticket's payout to the cent of a unit ("+0.98u"). */
export function payoutUnits(u: number): string {
  return `${u >= 0 ? "+" : ""}${u.toFixed(2)}u`;
}

export function signedOdds(o: number | null): string {
  if (o == null) return "";
  return o > 0 ? `+${o}` : String(o);
}

export function recordText(r: VipCapperStatus["vip_record"]): string {
  return `${r.wins}-${r.losses}${r.pushes > 0 ? `-${r.pushes}` : ""}`;
}

/** The ticket as one line: the pick for a straight, "3-leg parlay" otherwise. No odds. */
export function receiptTitle(r: VipReceipt): string {
  if (r.legs.length > 1) return `${r.legs.length}-leg parlay`;
  const p = r.legs[0];
  if (!p) return "VIP pick";
  return formatBetDescriptor({
    kind: "straight",
    market: p.market,
    selection: vipSelection(p),
    line: p.line,
    odds_taken: null,
  });
}

/** Minutes the pick went out before the game started, or null when unknown. */
export function minutesBefore(r: VipReceipt): number | null {
  if (!r.commence_time) return null;
  const diff = (new Date(r.commence_time).getTime() - new Date(r.posted_at).getTime()) / 60000;
  return Number.isFinite(diff) && diff > 0 ? Math.round(diff) : null;
}

function beforeText(min: number): string {
  if (min < 60) return `${min} minutes before the game`;
  const h = Math.round(min / 60);
  return h === 1 ? "an hour before the game" : `${h} hours before the game`;
}

export function profileUrl(handle: string): string {
  return `${SITE_URL}/cappers/${encodeURIComponent(handle)}`;
}

/** Card image path (relative), the PNG X and Download both use. */
export function cardPath(handle: string, kind: PromoKind, ticket?: string | null): string {
  const q = kind === "receipt" && ticket ? `?t=${encodeURIComponent(ticket)}` : "";
  return `/cappers/${encodeURIComponent(handle)}/vip-card/${kind}${q}`;
}

/** Share page URL: the link in the post. Its og:image is the card, and people
 *  who click it land on the profile. */
export function shareUrl(handle: string, kind: PromoKind, ticket?: string | null): string {
  const q = kind === "receipt" && ticket ? `?t=${encodeURIComponent(ticket)}` : "";
  return `${SITE_URL}/cappers/${encodeURIComponent(handle)}/promo/${kind}${q}`;
}

export interface PromoContext {
  status: VipCapperStatus;
  receipt?: VipReceipt | null;
}

/** Post text for one card, or null when the card has nothing true to say yet
 *  (no eligible sport, no graded VIP picks, no winning receipt). */
export function postText(kind: PromoKind, ctx: PromoContext): string | null {
  const { status } = ctx;
  const sport = bestSport(status.eligibility);
  const price = status.seller?.price_cents != null ? `$${Math.round(status.seller.price_cents / 100)}/mo` : null;
  if (kind === "brand") {
    if (!sport) return null;
    const ex = exclusivityFor(status, String(sport.sport));
    const lead = ex ? `I'm ${ex} eligible to sell VIP on @tailslips.` : "I sell VIP on @tailslips.";
    return `${lead} Every pick timestamped before the game and graded after.`;
  }
  if (kind === "launch") {
    if (!sport) return null;
    const units = signedUnits(sport.units ?? 0);
    const picks = sport.n_picks ?? 0;
    return [
      `My VIP is open on @tailslips. ${sport.sport} last 30 days: ${units} on ${picks} picks, every one verified.`,
      price ? `${price}, picks hit your inbox before the game.` : "Picks hit your inbox before the game.",
    ].join(" ");
  }
  if (kind === "record") {
    const r = status.vip_record;
    if (r.n <= 0) return null;
    return `VIP is ${recordText(r)}, ${signedUnits(r.units)}. Every pick timestamped before the game on @tailslips, wins and losses.`;
  }
  const r = ctx.receipt;
  if (!r) return null;
  const odds = signedOdds(r.odds);
  const min = minutesBefore(r);
  const when = min != null ? `posted ${beforeText(min)}` : "posted before the game";
  return `VIP cashed. ${receiptTitle(r)}${odds ? ` (${odds})` : ""}, ${when} and verified on @tailslips. Next one goes to subscribers first.`;
}

/** X compose URL with the text and the share link. */
export function xIntentUrl(text: string, link: string): string {
  const q = new URLSearchParams({ text, url: link });
  return `https://x.com/intent/post?${q.toString()}`;
}
