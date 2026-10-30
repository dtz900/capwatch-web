/* Pick builder slip: pure state transitions and the post body. */
import type { BoardSide, BoardSlateGame, ManualLegInput, VipPickBody } from "@/lib/vip/types";
import { fmtPrice, parsePrice, pays, toAmerican, toDecimal, type Fmt } from "./odds";

export const OTHER_BOOK = "other";
export const MAX_LEGS = 10;

export interface SlipLeg {
  side: BoardSide;
  game: BoardSlateGame;
  /** Price text as shown and typed, either format. */
  price: string;
  /** The capper typed over the prefill; a book switch leaves it alone. */
  edited: boolean;
  /** Exact American price whenever one is known (a prefill, or a typed
   *  price carried through a format switch). Decimal text is rounded to 2
   *  places (-160 shows 1.63, which reads back as -159), so posting and
   *  comparing use this; typing clears it and the text is parsed. */
  american?: number;
  /** Off-board leg from the structured editor: posted exactly as built. */
  manual?: ManualLegInput;
}

/** That book's price at this exact rung, or null if it doesn't hang it. */
export function quoteAt(side: BoardSide, book: string): number | null {
  if (book === OTHER_BOOK) return null;
  return side.quotes[book] ?? null;
}

export const prefill = (side: BoardSide, book: string) => quoteAt(side, book) ?? side.price;

/** The leg's American price: the exact one when known, else parsed. */
export const legPrice = (l: SlipLeg): number | null => l.american ?? parsePrice(l.price);

/** A typed price: the text is the truth until the next format switch. */
export const typed = (l: SlipLeg, price: string): SlipLeg => ({ ...l, price, edited: true, american: undefined });

const prefilled = (side: BoardSide, book: string, fmt: Fmt) => {
  const american = prefill(side, book);
  return { price: fmtPrice(american, fmt), american, edited: false };
};

/** Sides that can't ride together share a key: both teams of one spread or
 *  moneyline, over and under of one total or prop. Team totals keep the
 *  team, so both teams' totals can ride. */
export function pairKey(side: BoardSide): string {
  const l = side.leg;
  const team = l.stat_name === "team_points" ? l.selection : "";
  const line = l.line == null ? "" : String(Math.abs(l.line));
  return [l.game_id, l.stat_name, l.player_name ?? "", team, line].join("|");
}

export function toggleLeg(
  legs: SlipLeg[], side: BoardSide, game: BoardSlateGame, book: string, fmt: Fmt,
): SlipLeg[] {
  if (legs.some((l) => l.side.key === side.key)) return legs.filter((l) => l.side.key !== side.key);
  const pair = pairKey(side);
  const kept = legs.filter((l) => pairKey(l.side) !== pair);
  if (kept.length >= MAX_LEGS) return legs;
  return [...kept, { side, game, ...prefilled(side, book, fmt) }];
}

/** Re-prefill the legs the capper hasn't typed over. */
export const rebook = (legs: SlipLeg[], book: string, fmt: Fmt): SlipLeg[] =>
  legs.map((l) => (l.edited || l.manual ? l : { ...l, ...prefilled(l.side, book, fmt) }));

export const reformat = (legs: SlipLeg[], fmt: Fmt): SlipLeg[] =>
  legs.map((l) => {
    const p = legPrice(l);
    return p === null ? l : { ...l, price: fmtPrice(p, fmt), american: p };
  });

export const isSgp = (legs: SlipLeg[]) =>
  legs.length > 1 && new Set(legs.map((l) => l.side.leg.game_id)).size < legs.length;

export const legSports = (legs: SlipLeg[]) => [...new Set(legs.map((l) => l.side.leg.sport))];

/** Legs multiplied when every leg is priced and no two share a game (a same
 *  game parlay is priced by the book). */
export function combinedPrice(legs: SlipLeg[]): number | null {
  if (legs.length === 0 || isSgp(legs)) return null;
  const prices = legs.map(legPrice);
  if (prices.some((p) => p === null)) return null;
  return toAmerican(prices.reduce<number>((d, p) => d * toDecimal(p as number), 1));
}

/** The best book's price when the capper's price beats every tracked book
 *  (the record counts it at that price), else null. */
export function betterThanBest(leg: SlipLeg): number | null {
  const p = legPrice(leg);
  if (p === null || Object.keys(leg.side.quotes).length === 0) return null;
  return pays(p, leg.side.best) ? leg.side.best : null;
}

function legInput(l: SlipLeg, multi: boolean, priced: boolean): ManualLegInput {
  if (l.manual) {
    const out: ManualLegInput = { ...l.manual, odds: priced ? legPrice(l) : null };
    if (multi) out.sport = l.side.leg.sport;
    return out;
  }
  const b = l.side.leg;
  const out: ManualLegInput = {
    selection: b.selection,
    game_id: b.game_id,
    stat_name: b.stat_name,
    line: b.line,
    direction: b.direction,
    player_id: b.player_id == null ? null : Number(b.player_id),
    player_name: b.player_name,
  };
  if (priced) out.odds = legPrice(l);
  if (multi) out.sport = b.sport;
  return out;
}

export function toPickBody(legs: SlipLeg[], units: string, sgpPrice: string): VipPickBody {
  const sports = legSports(legs);
  const multi = sports.length > 1;
  const sgp = isSgp(legs);
  return {
    sport: multi ? "Multi" : sports[0],
    units: Number(units),
    combined_odds: sgp ? parsePrice(sgpPrice) : null,
    legs: legs.map((l) => legInput(l, multi, !sgp)),
  };
}

function dayKey(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** "4:30 PM tonight", "4:30 PM Friday": 30 minutes after the earliest leg's
 *  start, worded to follow "until" or "at". */
export function unlockAt(legs: SlipLeg[], now: Date = new Date(), tz?: string): string {
  const starts = legs
    .map((l) => (l.game.commence_time ? Date.parse(l.game.commence_time) : NaN))
    .filter((t) => !Number.isNaN(t));
  if (starts.length === 0) return "";
  const zone = tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const at = new Date(Math.min(...starts) + 30 * 60 * 1000);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" }).format(at);
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
  const day =
    dayKey(at, zone) === dayKey(now, zone) ? "tonight"
      : dayKey(at, zone) === dayKey(tomorrow, zone) ? "tomorrow"
        : new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "long" }).format(at);
  return `${time} ${day}`;
}
