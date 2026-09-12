import { describe, it, expect, vi, afterEach } from "vitest";
import type { LeaderboardResponse } from "@/lib/types";

// api.ts calls withKvCache/readLastKnownGood from "./kv-cache" (a relative
// import from src/lib). Mocking the same file via the "@/lib/..." alias
// intercepts it: both specifiers resolve to src/lib/kv-cache.ts.
const readLastKnownGoodMock = vi.fn();

vi.mock("@/lib/kv-cache", () => ({
  // Pass through to the fetcher, the same shape withKvCache has when Redis
  // is unreachable or a key has expired (exactly the condition this test
  // wants to force).
  withKvCache: async (_key: string, _ttl: number, fetcher: () => unknown) => fetcher(),
  readLastKnownGood: readLastKnownGoodMock,
}));

afterEach(() => {
  vi.restoreAllMocks();
  readLastKnownGoodMock.mockReset();
});

const sample: LeaderboardResponse = {
  window: "all_time",
  sort: "roi_pct",
  min_picks: 5,
  active_only: true,
  bet_type: "all" as const,
  leaderboard: [],
};

describe("fetchLeaderboard stale fallback", () => {
  it("returns the last-known-good copy when the upstream fetch throws and a stale copy exists", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network stall"));
    readLastKnownGoodMock.mockResolvedValue(sample);

    const { fetchLeaderboard } = await import("@/lib/api");
    const out = await fetchLeaderboard({
      window: "all_time",
      sort: "roi_pct",
      min_picks: 5,
      active_only: true,
      bet_type: "all",
    });

    expect(out).toEqual(sample);
    expect(readLastKnownGoodMock).toHaveBeenCalledWith(expect.stringContaining("lb:v1:"));
  });

  it("rethrows when the upstream fetch throws and no stale copy exists", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network stall"));
    readLastKnownGoodMock.mockResolvedValue(null);

    const { fetchLeaderboard } = await import("@/lib/api");
    await expect(
      fetchLeaderboard({
        window: "all_time",
        sort: "roi_pct",
        min_picks: 5,
        active_only: true,
        bet_type: "all",
      }),
    ).rejects.toThrow("network stall");
  });
});
