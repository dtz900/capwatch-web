import { describe, expect, it } from "vitest";
import { pickMarqueeGame } from "./_slate-og-renderer";
import type { SlateGame } from "@/lib/types";

const game = (id: number, state: SlateGame["game_state"], picks: number): SlateGame =>
  ({ game_id: id, game_state: state, picks: Array.from({ length: picks }, () => ({}) as SlateGame["picks"][number]) }) as SlateGame;

describe("pickMarqueeGame", () => {
  it("prefers a scheduled game over a bigger final one", () => {
    // Week 2 2026 on Saturday: DET@BUF (Thursday, final) had 428 picks.
    expect(pickMarqueeGame([game(1, "final", 428), game(2, "scheduled", 33), game(3, "scheduled", 32)])?.game_id).toBe(2);
  });

  it("ranks live behind scheduled, final last", () => {
    expect(pickMarqueeGame([game(1, "final", 50), game(2, "in_progress", 40)])?.game_id).toBe(2);
    expect(pickMarqueeGame([game(1, "final", 50), game(2, "final", 60)])?.game_id).toBe(2);
  });

  it("ignores games with no picks", () => {
    expect(pickMarqueeGame([game(1, "scheduled", 0), game(2, "final", 3)])?.game_id).toBe(2);
    expect(pickMarqueeGame([game(1, "scheduled", 0)])).toBeNull();
  });
});
