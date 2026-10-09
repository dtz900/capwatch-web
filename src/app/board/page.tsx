import type { Metadata } from "next";
import {
  LeaderboardPage,
  buildLeaderboardMetadata,
  parseLeaderboardFilters,
  type LeaderboardSearchParams,
} from "@/components/leaderboard/LeaderboardPage";

// Every filtered leaderboard view. Reached only through the next.config
// rewrite of `/?<filter>`, so the visible URL stays `/?sport=nfl` and the
// canonical, share links and crawlers are unchanged. A direct hit on /board
// is redirected to / by the middleware. Reading searchParams makes this
// route dynamic, which is the point: the static default board lives at /.
export const maxDuration = 30;

interface PageProps {
  searchParams: Promise<LeaderboardSearchParams>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  return buildLeaderboardMetadata(parseLeaderboardFilters(sp), sp.v);
}

export default async function Board({ searchParams }: PageProps) {
  const sp = await searchParams;
  return <LeaderboardPage filters={parseLeaderboardFilters(sp)} />;
}
