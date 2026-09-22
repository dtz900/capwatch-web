import { describe, it, expect, beforeEach } from "vitest";
import { isLocked, seededShuffle, orderDeck, readPendingPlay, writePendingPlay, clearPendingPlay, unitsLabel } from "@/lib/tof/deck";
import type { TofCard } from "@/lib/types";

const NOW = new Date("2026-09-22T20:00:00Z");
const card = (id: number, startIso: string): TofCard => ({
  id, position: id, category: "wildcard", handle: "x", display_name: null, profile_image_url: null,
  capper_streak: 0, capper_record: null, sport: "MLB", matchup: "A @ B", game_start_at: startIso,
  game_state: "scheduled", home_score: null, away_score: null, market_group: "ML", tail_label: "A ML",
  tail_odds: -110, fade_label: "B ML", fade_odds_at_deal: null, fade_odds_source: "pending", note: "",
  rival: null, field_count: null, tail_outcome: null, fade_outcome: null, tail_units: null, fade_units: null, crowd: null,
});

describe("isLocked", () => {
  it("locks at the start time", () => {
    expect(isLocked(card(1, "2026-09-22T21:00:00Z"), NOW)).toBe(false);
    expect(isLocked(card(1, "2026-09-22T20:00:00Z"), NOW)).toBe(true);
    expect(isLocked(card(1, "2026-09-22T19:00:00Z"), NOW)).toBe(true);
  });
});

describe("seededShuffle", () => {
  it("is stable for a seed and does not mutate", () => {
    const items = [1, 2, 3, 4, 5, 6];
    const a = seededShuffle(items, "u1:2026-09-22");
    const b = seededShuffle(items, "u1:2026-09-22");
    expect(a).toEqual(b);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(seededShuffle(items, "u2:2026-09-22")).not.toEqual(a);
  });
});

describe("orderDeck", () => {
  const cards = [card(1, "2026-09-22T19:00:00Z"), card(2, "2026-09-22T22:00:00Z"), card(3, "2026-09-22T23:00:00Z")];
  it("drops played cards, keeps open first, locked at the back face up", () => {
    const { open, locked } = orderDeck(cards, new Set([2]), NOW, null);
    expect(open.map((c) => c.id)).toEqual([3]);
    expect(locked.map((c) => c.id)).toEqual([1]);
  });
  it("keeps deal order for anonymous users and shuffles per seed", () => {
    const anon = orderDeck(cards, new Set(), NOW, null);
    expect(anon.open.map((c) => c.id)).toEqual([2, 3]);
    const seeded = orderDeck(cards, new Set(), NOW, "u1:2026-09-22");
    expect([...seeded.open.map((c) => c.id)].sort()).toEqual([2, 3]);
  });
});

describe("pending play storage", () => {
  beforeEach(() => localStorage.clear());
  it("round trips and clears", () => {
    expect(readPendingPlay()).toBeNull();
    writePendingPlay({ cardId: 5, choice: "fade", slateDate: "2026-09-22" });
    expect(readPendingPlay()).toEqual({ cardId: 5, choice: "fade", slateDate: "2026-09-22" });
    clearPendingPlay();
    expect(readPendingPlay()).toBeNull();
  });
});

describe("unitsLabel", () => {
  it("formats signed units", () => {
    expect(unitsLabel(1.25)).toBe("+1.25u");
    expect(unitsLabel(-1)).toBe("-1.00u");
    expect(unitsLabel(0)).toBe("0.00u");
    expect(unitsLabel(null)).toBe("0.00u");
  });
});
