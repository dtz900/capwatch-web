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

export function unitsLabel(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  const sign = v > 0 ? "+" : v < 0 ? "-" : "";
  return `${sign}${Math.abs(v).toFixed(2)}u`;
}

/* Guest plays live only in the browser (no tof_plays row to write). They are
   kept per slate date so a guest who leaves and comes back, or enters from
   another page, does not get the same cards dealt again. */
const GUEST_KEY = "ts:tof:guest";

export function readGuestChoices(slateDate: string): Map<number, "tail" | "fade" | "pass"> {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return new Map();
    const v = JSON.parse(raw) as { slateDate?: string; choices?: unknown };
    if (v.slateDate !== slateDate || !Array.isArray(v.choices)) return new Map();
    const out = new Map<number, "tail" | "fade" | "pass">();
    for (const pair of v.choices) {
      if (!Array.isArray(pair) || typeof pair[0] !== "number") continue;
      if (pair[1] !== "tail" && pair[1] !== "fade" && pair[1] !== "pass") continue;
      out.set(pair[0], pair[1]);
    }
    return out;
  } catch {
    return new Map();
  }
}

export function writeGuestChoices(slateDate: string, choices: ReadonlyMap<number, "tail" | "fade" | "pass">): void {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify({ slateDate, choices: [...choices.entries()] }));
  } catch {
    /* storage unavailable: the deck still works for this visit */
  }
}

export function clearGuestChoices(): void {
  try { localStorage.removeItem(GUEST_KEY); } catch { /* nothing to clear */ }
}

/* Short hand cache so the hero on a second page paints with the same deck
   instantly instead of flashing the no-hand box while it refetches. */
const HAND_KEY = "ts:tof:hand";
const HAND_TTL_MS = 60_000;

export function readHandCache<T>(): T | null {
  try {
    const raw = sessionStorage.getItem(HAND_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { at?: number; data?: T };
    if (typeof v.at !== "number" || Date.now() - v.at > HAND_TTL_MS || v.data == null) return null;
    return v.data;
  } catch {
    return null;
  }
}
export function writeHandCache<T>(data: T): void {
  try { sessionStorage.setItem(HAND_KEY, JSON.stringify({ at: Date.now(), data })); } catch { /* fine */ }
}
