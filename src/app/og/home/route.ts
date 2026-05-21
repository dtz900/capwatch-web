import { renderRootOg } from "../../_root-og";

// Explicit Route Handler variant of the homepage OG image. The homepage's
// generateMetadata points openGraph.images here with a query-string
// fingerprint (?d=YYYY-MM-DD&p=graded_picks&c=cappers) so X's CDN sees a
// fresh URL whenever the leaderboard changes. The query params themselves
// don't affect rendering; they exist purely as a cache-busting key.
//
// X has no manual cache-invalidation path anymore (cards-dev.twitter.com
// validator was retired), so the URL itself is the only lever we have to
// force a re-scrape.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return renderRootOg();
}
