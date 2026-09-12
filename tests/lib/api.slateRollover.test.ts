import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SlateResponse } from "@/lib/types";

// Real @upstash/redis is swapped for an in-memory Map so fetchSlate's actual
// key derivation (in src/lib/api.ts) and withKvCache/readLastKnownGood (in
// src/lib/kv-cache.ts) run for real. Only the network (fetch) and the wall
// clock (Date) are faked below.
let store: Map<string, unknown>;
let getSpy: ReturnType<typeof vi.fn>;
let setSpy: ReturnType<typeof vi.fn>;

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(function RedisMock(this: {
    get: typeof getSpy;
    set: typeof setSpy;
  }) {
    this.get = getSpy;
    this.set = setSpy;
  }),
}));

beforeEach(() => {
  vi.resetModules();
  store = new Map();
  getSpy = vi.fn(async (key: string) => (store.has(key) ? store.get(key) : null));
  setSpy = vi.fn(async (key: string, value: unknown) => {
    store.set(key, value);
    return "OK";
  });
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
  // Only Date is faked. fetchWithRetry's real setTimeout backoff still runs
  // (same ~1s cost the existing "throws on non-2xx" test in api.test.ts
  // already pays), so the retry loop behaves exactly as it does in prod.
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function sampleSlate(date: string): SlateResponse {
  return {
    date,
    games: [],
    most_picked: [],
    day_summary: {
      graded_count: 0, pending_count: 0, wins: 0, losses: 0, pushes: 0, voids: 0, net_units: 0,
    },
    capper_summary: [],
  };
}

describe("fetchSlate last-known-good across the slate-day rollover", () => {
  it("does not replay yesterday's stale slate under today's literal 'today' key", async () => {
    // Day 1: an ET afternoon/evening, well past the 6am rollover.
    // currentSlateDay() resolves to 2026-09-14 at this instant.
    vi.setSystemTime(new Date("2026-09-14T20:00:00Z"));

    const day1Slate = sampleSlate("2026-09-14");
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => day1Slate,
    } as unknown as Response);

    const { fetchSlate } = await import("@/lib/api");

    const day1Result = await fetchSlate("today", "mlb");
    expect(day1Result).toEqual(day1Slate);
    // The literal short-TTL key is unaffected by this fix.
    expect(store.get("slate:v1:today")).toEqual(day1Slate);
    // The LKG copy is keyed by the concrete resolved period, not the
    // literal "today" selector.
    expect(store.get("slate:v1:today:2026-09-14")).toEqual(day1Slate);
    expect(store.has("slate:v1:today:lkg")).toBe(false);

    // Simulate the short (15s) primary TTL expiring, same-day: a stall on
    // day 1 should still be able to fall back to day 1's own stale copy.
    store.delete("slate:v1:today");
    fetchSpy.mockRejectedValue(new Error("upstream stall"));
    const sameDayFallback = await fetchSlate("today", "mlb");
    expect(sameDayFallback).toEqual(day1Slate);

    // Day 2: past the next 6am ET rollover. currentSlateDay() now resolves
    // to 2026-09-15. The primary "slate:v1:today" key is (still) expired,
    // and there is no LKG copy under today's real period
    // ("slate:v1:today:2026-09-15"); only yesterday's exists.
    vi.setSystemTime(new Date("2026-09-15T20:00:00Z"));
    store.delete("slate:v1:today");
    fetchSpy.mockRejectedValue(new Error("upstream stall day 2"));

    // Without the period-aware LKG key, this would have resolved to
    // day1Slate (a stale slate dated 2026-09-14 served as "today" on
    // 2026-09-15). With it, there is no matching LKG entry, so the
    // original fetch error propagates instead of silently serving the
    // wrong day.
    await expect(fetchSlate("today", "mlb")).rejects.toThrow("upstream stall day 2");
  }, 15_000);
});
