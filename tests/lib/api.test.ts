import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchLeaderboard } from "@/lib/api";
import type { LeaderboardResponse } from "@/lib/types";

afterEach(() => vi.restoreAllMocks());

describe("fetchLeaderboard", () => {
  it("hits /api/public/cappers with the supplied filters", async () => {
    const sample: LeaderboardResponse = {
      window: "all_time", sort: "roi_pct", min_picks: 5, active_only: true,
      leaderboard: [],
    };
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true, json: async () => sample,
    } as unknown as Response);

    const out = await fetchLeaderboard({
      window: "all_time", sort: "roi_pct", min_picks: 5, active_only: true,
    });
    expect(out).toEqual(sample);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/public\/cappers\?window=all_time&sort=roi_pct&min_picks=5&active_only=true/),
      expect.objectContaining({ next: { revalidate: 600 } }),
    );
  });

  it("throws on non-2xx", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 500 } as unknown as Response);
    await expect(
      fetchLeaderboard({ window: "all_time", sort: "roi_pct", min_picks: 5, active_only: true })
    ).rejects.toThrow();
  });
});
