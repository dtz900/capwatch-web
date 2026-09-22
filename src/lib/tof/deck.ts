import type { TofCard } from "@/lib/types";

export function isLocked(card: { game_start_at: string }, now: Date): boolean {
  const t = new Date(card.game_start_at).getTime();
  return !Number.isNaN(t) && t <= now.getTime();
}

/* FNV-1a into mulberry32: a tiny deterministic PRNG so a user's card order is
   stable across refreshes without storing it. */
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], seed: string): T[] {
  const out = [...items];
  const rnd = mulberry32(hash32(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function orderDeck(
  cards: TofCard[],
  playedCardIds: Set<number>,
  now: Date,
  seed: string | null,
): { open: TofCard[]; locked: TofCard[] } {
  const byPosition = [...cards].sort((a, b) => a.position - b.position);
  const unplayed = byPosition.filter((c) => !playedCardIds.has(c.id));
  const openCards = unplayed.filter((c) => !isLocked(c, now));
  const lockedCards = unplayed.filter((c) => isLocked(c, now));
  return { open: seed ? seededShuffle(openCards, seed) : openCards, locked: lockedCards };
}

export interface PendingPlay {
  cardId: number;
  choice: "tail" | "fade";
  slateDate: string;
}

const PENDING_KEY = "ts:tof:pending";

export function readPendingPlay(): PendingPlay | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingPlay;
    if (typeof p.cardId !== "number" || (p.choice !== "tail" && p.choice !== "fade")) return null;
    return p;
  } catch {
    return null;
  }
}

export function writePendingPlay(p: PendingPlay): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: the user just replays the card after login */
  }
}

export function clearPendingPlay(): void {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* nothing to clear */
  }
}

export function unitsLabel(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  const sign = v > 0 ? "+" : v < 0 ? "-" : "";
  return `${sign}${Math.abs(v).toFixed(2)}u`;
}
