import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PostHog reverse proxy: events post to tailslips.com/ingest instead of
  // *.posthog.com, which most ad blockers drop. PostHog requires the
  // trailing-slash redirect off so its API paths pass through untouched.
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
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
