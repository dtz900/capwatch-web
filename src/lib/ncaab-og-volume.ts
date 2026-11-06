/**
 * Pure model for the NCAAB slate OG card. College hoops runs 50 to 150 games a
 * night, so the card is not one featured matchup (the MLB/NFL/NBA cards) but
 * the size of the night: bets, cappers, games with action, the market mix and
 * the games drawing the most cappers. Kept free of satori so it unit-tests.
 */
import { buildCard, classifyPick, orderGames } from "./ncaab-slate";
import { slateBetCount } from "./slate-bet-count";
import type { SlateGame } from "./types";

export type MixKey = "SPREAD" | "TOTAL" | "ML" | "OTHER";

export interface MixSlice {
  key: MixKey;
  count: number;
  /** Whole-number share of all pick rows; the slices sum to 100. */
  pct: number;
}

export interface VolumeGame {
  id: number;
  away: string;
  home: string;
  awayLogo: string | null;
  homeLogo: string | null;
  awayColor: string;
  homeColor: string;
  cappers: number;
  /** Most-backed side on the spread or total, e.g. "CONN -3.5", or null. */
  lean: string | null;
  /** Distinct cappers on that side. */
  leanCount: number;
}

export interface NcaabVolume {
  bets: number;
  cappers: number;
  gamesWithAction: number;
  totalGames: number;
  mix: MixSlice[];
  top: VolumeGame[];
}

const MIX_ORDER: readonly MixKey[] = ["SPREAD", "TOTAL", "ML", "OTHER"];

function mixKey(group: string): MixKey {
  if (group === "SPREAD" || group === "TOTAL" || group === "ML") return group;
  return "OTHER";
}

/** Largest-remainder rounding so the shares always add to exactly 100. */
export function wholeShares(counts: readonly number[]): number[] {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return counts.map(() => 0);
  const raw = counts.map((c) => (c * 100) / total);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, rem: r - Math.floor(r) })).sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    out[i] += 1;
    left -= 1;
  }
  return out;
}

export function buildNcaabVolume(games: readonly SlateGame[], topN = 5): NcaabVolume {
  const allPicks = games.flatMap((g) => g.picks);
  const counts = new Map<MixKey, number>(MIX_ORDER.map((k) => [k, 0]));
  for (const g of games) {
    for (const p of g.picks) {
      const k = mixKey(classifyPick(p, g).group);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  const raw = MIX_ORDER.map((k) => counts.get(k) ?? 0);
  const shares = wholeShares(raw);
  const mix = MIX_ORDER.map((key, i) => ({ key, count: raw[i], pct: shares[i] })).filter((s) => s.count > 0);

  const top = orderGames(games.filter((g) => g.picks.length > 0))
    .slice(0, topN)
    .map((g): VolumeGame => {
      const card = buildCard(g);
      // The lean is the single most-backed side across spread and total; a
      // tie goes to the spread, and a side with no line is still named.
      const sides = [card.spread.left, card.spread.right, card.total.left, card.total.right];
      let best = sides[0];
      for (const s of sides) if (s.n > best.n) best = s;
      return {
        id: card.id,
        away: card.away,
        home: card.home,
        awayLogo: card.awayLogo,
        homeLogo: card.homeLogo,
        awayColor: card.awayColor,
        homeColor: card.homeColor,
        cappers: card.cappers,
        lean: best.n > 0 ? best.text : null,
        leanCount: best.n,
      };
    });

  return {
    bets: slateBetCount(allPicks),
    cappers: new Set(allPicks.map((p) => p.capper_id)).size,
    gamesWithAction: games.filter((g) => g.picks.length > 0).length,
    totalGames: games.length,
    mix,
    top,
  };
}

/** ESPN combiner rendition of a team logo, ~8KB instead of the ~80KB 500px PNG. */
export function smallLogoUrl(url: string | null, px = 96): string | null {
  if (!url) return null;
  const m = url.match(/^https:\/\/a\.espncdn\.com(\/i\/teamlogos\/[^?]+\.png)$/);
  return m ? `https://a.espncdn.com/combiner/i?img=${m[1]}&w=${px}&h=${px}` : url;
}
