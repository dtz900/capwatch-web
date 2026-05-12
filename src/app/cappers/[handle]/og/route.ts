import { renderCapperOg } from "../_og-renderer";
import type { BetTypeFilter, Window } from "@/lib/types";

// Route Handler variant of the OG image route, used when the page wants the
// preview to reflect a specific filter cut (bet type + window). The
// file-convention `opengraph-image.tsx` sibling renders the default all-time
// view; this route reads `w` and `bt` query params off the request URL so a
// shared URL like `/cappers/foo/og?w=season&bt=straights&p=99` produces a
// preview that matches the page's filtered view exactly.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_WINDOWS: ReadonlyArray<Window> = ["all_time", "season", "last_30", "last_7"];
const VALID_BET_TYPES: ReadonlyArray<BetTypeFilter> = ["all", "straights", "parlays"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;
  const url = new URL(request.url);
  const w = url.searchParams.get("w");
  const bt = url.searchParams.get("bt");
  const window: Window = VALID_WINDOWS.includes(w as Window) ? (w as Window) : "all_time";
  const bet_type: BetTypeFilter = VALID_BET_TYPES.includes(bt as BetTypeFilter)
    ? (bt as BetTypeFilter)
    : "all";
  return renderCapperOg(handle, { window, bet_type });
}
