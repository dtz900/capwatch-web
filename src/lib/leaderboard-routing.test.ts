import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { LEADERBOARD_FILTER_KEYS } from "@/components/leaderboard/LeaderboardPage";

/**
 * The static / page and the dynamic /board route only work together if
 * every filter key rewrites to /board before the static file is served.
 * A key missing here would serve the default board for that filter.
 */
describe("leaderboard filter rewrites", () => {
  it("rewrites / to /board for every filter key, before files", async () => {
    const rewrites = await nextConfig.rewrites!();
    expect(Array.isArray(rewrites)).toBe(false);
    const before = (rewrites as { beforeFiles: { source: string; has?: { type: string; key?: string }[]; destination: string }[] }).beforeFiles;
    const rewritten = before
      .filter((r) => r.source === "/" && r.destination === "/board")
      .flatMap((r) => (r.has ?? []).filter((h) => h.type === "query").map((h) => h.key));
    expect(new Set(rewritten)).toEqual(new Set(LEADERBOARD_FILTER_KEYS));
  });

  it("keeps the PostHog proxy rewrites", async () => {
    const rewrites = await nextConfig.rewrites!();
    const after = (rewrites as { afterFiles: { source: string }[] }).afterFiles.map((r) => r.source);
    expect(after).toContain("/ingest/:path*");
  });
});
