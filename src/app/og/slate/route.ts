import { renderSlateOg } from "../../slate/_slate-og-renderer";

// Explicit Route Handler for the slate OG image. The slate page's
// generateMetadata points openGraph.images here with a query-string
// fingerprint (?date=today|tomorrow&d=YYYY-MM-DD&p=picks&s=sharps&g=graded&h=hash)
// so X's CDN sees a fresh URL whenever the slate changes intra-day, even if
// the pick count stays the same. `date` is the only param that affects
// rendering; the rest exist purely as cache-busting keys.
//
// X retired cards-dev.twitter.com/validator, so the URL itself is the only
// way to force a re-scrape after a share has been pinned.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date") === "tomorrow" ? "tomorrow" : "today";
  return renderSlateOg({ dateParam });
}
