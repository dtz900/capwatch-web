import { DEFAULT_ROOT_OG_FILTERS, renderRootOg } from "../../_root-og";
import type { BetTypeFilter, Sort, Window } from "@/lib/types";

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

const VALID_WINDOWS: ReadonlyArray<Window> = ["all_time", "season", "last_30", "last_7"];
const VALID_SORTS: ReadonlyArray<Sort> = ["roi_pct", "units_profit", "win_rate", "picks_count"];
const VALID_BET_TYPES: ReadonlyArray<BetTypeFilter> = ["all", "straights", "parlays"];

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const w = url.searchParams.get("w");
  const sort = url.searchParams.get("sort");
  const bt = url.searchParams.get("bt");
  return renderRootOg({
    window: VALID_WINDOWS.includes(w as Window) ? (w as Window) : DEFAULT_ROOT_OG_FILTERS.window,
    sort: VALID_SORTS.includes(sort as Sort) ? (sort as Sort) : DEFAULT_ROOT_OG_FILTERS.sort,
    bet_type: VALID_BET_TYPES.includes(bt as BetTypeFilter)
      ? (bt as BetTypeFilter)
      : DEFAULT_ROOT_OG_FILTERS.bet_type,
    active_only: url.searchParams.get("ao") !== "false",
  });
}
