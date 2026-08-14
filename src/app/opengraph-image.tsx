import { renderRootOg, size, alt, contentType } from "./_root-og";

export const runtime = "nodejs";
// Renders per-request since the KV fetchers went no-store (deliberate:
// freshness over CDN caching, Codex #76). Explicit so the build doesn't
// attempt a static render, fail on the uncached fetch, and log an error.
export const dynamic = "force-dynamic";
export { size, alt, contentType };

// File-convention fallback. Used by scrapers that don't follow our explicit
// og:image meta tag. X follows og:image and lands on the fingerprinted
// Route Handler at /og/home (see app/og/home/route.ts + page.tsx metadata),
// which is what actually busts X's CDN when the leaderboard changes.
export default async function RootOgImage() {
  return renderRootOg();
}
