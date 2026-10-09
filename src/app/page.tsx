import type { Metadata } from "next";
import {
  DEFAULT_LEADERBOARD_FILTERS,
  LeaderboardPage,
  buildLeaderboardMetadata,
} from "@/components/leaderboard/LeaderboardPage";

// The default board, prerendered. This route must never read searchParams,
// cookies or headers: any request-time API would make it dynamic again and
// bring back the per-visit render (3.8s TTFB, 2026-10-08). Filtered views
// (`/?sport=nfl`, `/?window=all_time`, ...) are rewritten to /board by
// next.config and stay dynamic.
//
// ISR: render on first request, serve from edge cache for 5 minutes,
// regenerate in background. Heavy aggregates only refresh once/day so 5 min
// of staleness is invisible, and the platform purges this page
// (revalidatePath("/")) after every aggregates refresh. The "N live"
// indicator updates near-realtime via LivePicksProvider polling, separate
// from this cache.
export const revalidate = 300; // keep equal to STATIC_BOARD_REVALIDATE_SEC (must be a literal)
export const maxDuration = 30;

// The shared fetchers default to cache: "no-store" (right for /board and the
// KV-wrapped pages, see the note in api.ts), and one no-store fetch is enough
// to make a route dynamic; a segment-level fetchCache override does not undo
// an explicit option. prerender mode puts the fetches in the Data Cache,
// tagged, so the purge route revalidates them together with this page.
const MODE = { prerender: true } as const;

export async function generateMetadata(): Promise<Metadata> {
  return buildLeaderboardMetadata(DEFAULT_LEADERBOARD_FILTERS, undefined, MODE);
}

export default async function Home() {
  return <LeaderboardPage filters={DEFAULT_LEADERBOARD_FILTERS} mode={MODE} />;
}
