import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
