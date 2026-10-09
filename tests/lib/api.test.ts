import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchLeaderboard } from "@/lib/api";
import type { LeaderboardResponse } from "@/lib/types";

afterEach(() => vi.restoreAllMocks());

describe("fetchLeaderboard", () => {
  it("hits /api/public/cappers with the supplied filters", async () => {
    const sample: LeaderboardResponse = {
      window: "all_time", sort: "roi_pct", min_picks: 5, active_only: true, bet_type: "all" as const,
      leaderboard: [],
    };
    // A real Response: the fetch helpers buffer the body inside their timeout.
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify(sample)));

    const out = await fetchLeaderboard({
      window: "all_time", sort: "roi_pct", min_picks: 5, active_only: true, bet_type: "all" as const,
    });
    expect(out).toEqual(sample);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/public\/cappers\?window=all_time&sort=roi_pct&bet_type=all&min_picks=5&active_only=true/),
      // no-store on purpose: KV is the only data-freshness bound; the Next
      // data cache caused the stale-profile poisoned-refill loop.
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("throws on non-2xx", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async () => new Response(null, { status: 500 }));
    await expect(
      fetchLeaderboard({ window: "all_time", sort: "roi_pct", min_picks: 5, active_only: true, bet_type: "all" })
    ).rejects.toThrow();
  });
});
