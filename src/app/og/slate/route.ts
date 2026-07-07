import { renderSlateOg } from "../../slate/_slate-og-renderer";

// Explicit Route Handler for the slate OG image. The slate page's
// generateMetadata points openGraph.images here with a query-string
// fingerprint (?date=today|tomorrow&game=AWAY-HOME&d=YYYY-MM-DD&p=picks&s=sharps&g=graded&h=hash)
// so X's CDN sees a fresh URL whenever the slate changes intra-day, even if
// the pick count stays the same. `date` and `game` are the only params that
// affect rendering; the rest exist purely as cache-busting keys.
//
// `game` features a specific matchup on the card (slug "AWAY-HOME" in either
// order, or a numeric game_id). Omit it and the card falls back to the most-
// bet game. This is what lets David tweet /slate?game=SEA-MIA and have that
// exact matchup land on the OG card.
//
// X retired cards-dev.twitter.com/validator, so the URL itself is the only
// way to force a re-scrape after a share has been pinned.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date") === "tomorrow" ? "tomorrow" : "today";
  const gameSlug = url.searchParams.get("game") ?? undefined;
  return renderSlateOg({ dateParam, gameSlug });
}
