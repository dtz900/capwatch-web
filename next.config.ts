import type { NextConfig } from "next";

// Duplicated from src/components/leaderboard/LeaderboardPage.tsx: next.config
// cannot import app code. A vitest test asserts the two lists match.
const LEADERBOARD_FILTER_KEYS = ["window", "sort", "bet_type", "active_only", "sport", "v"];

const nextConfig: NextConfig = {
  // PostHog reverse proxy: events post to tailslips.com/ingest instead of
  // *.posthog.com, which most ad blockers drop. PostHog requires the
  // trailing-slash redirect off so its API paths pass through untouched.
  async rewrites() {
    return {
      // The default leaderboard at / is prerendered (ISR). Any filter in the
      // query selects a different board, so those requests are rewritten to
      // the dynamic /board route; the visible URL stays `/?sport=nfl`.
      // beforeFiles: it has to win over the static / page. Keep the key list
      // in sync with LEADERBOARD_FILTER_KEYS in LeaderboardPage.tsx.
      beforeFiles: LEADERBOARD_FILTER_KEYS.map((key) => ({
        source: "/",
        has: [{ type: "query" as const, key }],
        destination: "/board",
      })),
      afterFiles: [
        { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
        { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
      ],
    };
  },
  skipTrailingSlashRedirect: true,
  // Native module: resvg resolves a platform-specific binding at runtime
  // (@resvg/resvg-js-<platform>); bundling it breaks the resolution, so it
  // must stay external. Used by the slate OG card's scale=2 supersample path.
  serverExternalPackages: ["@resvg/resvg-js"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pbs.twimg.com", pathname: "/profile_images/**" },
    ],
  },
};

export default nextConfig;
