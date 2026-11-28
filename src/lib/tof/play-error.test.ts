import { describe, it, expect } from "vitest";
import { playErrorOutcome } from "@/lib/tof/play-error";

const now = new Date("2026-11-27T20:00:00Z");
const started = { game_start_at: "2026-11-27T19:00:00Z" };
const future = { game_start_at: "2026-11-27T23:00:00Z" };
const rls = { code: "42501", message: 'new row violates row-level security policy for table "tof_plays"' };

describe("playErrorOutcome", () => {
  it("duplicate play", () => {
    expect(playErrorOutcome({ code: "23505", message: "dup" }, future, now)).toEqual({ message: "Already played.", log: false });
  });
  it("RLS refusal on a started game is the lock case", () => {
    expect(playErrorOutcome(rls, started, now)).toEqual({ message: "That card just locked.", log: false });
  });
  it("RLS refusal on a future start is not blamed on a lock and is logged", () => {
    const r = playErrorOutcome(rls, future, now);
    expect(r.message).not.toMatch(/locked/i);
    expect(r.message).toMatch(/not open for plays/i);
    expect(r.log).toBe(true);
  });
  it("RLS refusal with no start time is not called a lock", () => {
    const r = playErrorOutcome({ message: "violates policy" }, { game_start_at: "" }, now);
    expect(r.message).not.toMatch(/locked/i);
    expect(r.log).toBe(true);
  });
  it("expired session", () => {
    expect(playErrorOutcome({ code: "PGRST301", message: "JWT expired" }, future, now).message).toMatch(/session expired/i);
  });
  it("network failure", () => {
    expect(playErrorOutcome({ message: "TypeError: Failed to fetch" }, future, now).message).toMatch(/No connection/);
  });
  it("unknown error gets the generic retry and is logged", () => {
    expect(playErrorOutcome({ code: "XX000", message: "boom" }, future, now)).toEqual({ message: "Could not save that play. Try again.", log: true });
  });
});
