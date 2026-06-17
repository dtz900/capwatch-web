import { NextResponse } from "next/server";
import { fetchCapperProfile } from "@/lib/api";
import type { BetTypeFilter, Window } from "@/lib/types";

// Server-side proxy for the public capper profile. Lets the client island
// append history pages and refetch bet-type slices without touching API_BASE
// or running into CORS, and reuses lib/api's KV cache + retry wrapper.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_WINDOWS = new Set<Window>(["last_7", "last_30", "season", "all_time"]);
const VALID_BET_TYPES = new Set<BetTypeFilter>(["all", "straights", "parlays"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;
  const sp = new URL(request.url).searchParams;

  const wRaw = sp.get("window") ?? "season";
  const btRaw = sp.get("bet_type") ?? "all";
  const window = (VALID_WINDOWS.has(wRaw as Window) ? wRaw : "season") as Window;
  const betType = (VALID_BET_TYPES.has(btRaw as BetTypeFilter) ? btRaw : "all") as BetTypeFilter;
  const market = (sp.get("market") ?? "").trim();
  const outcome = (sp.get("outcome") ?? "").trim();
  const startRaw = (sp.get("start") ?? "").trim();
  const endRaw = (sp.get("end") ?? "").trim();
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  const rangeValid = isoDate.test(startRaw) && isoDate.test(endRaw) && startRaw <= endRaw;
  const start = rangeValid ? startRaw : undefined;
  const end = rangeValid ? endRaw : undefined;
  const offset = Math.max(0, parseInt(sp.get("offset") ?? "0", 10) || 0);
  const rawLimit = parseInt(sp.get("limit") ?? "25", 10) || 25;
  const limit = Math.min(200, Math.max(1, rawLimit));

  try {
    const profile = await fetchCapperProfile(handle, {
      history_limit: limit,
      history_offset: offset,
      market: market || undefined,
      outcome: outcome || undefined,
      bet_type: betType !== "all" ? betType : undefined,
      start,
      end,
    });
    return NextResponse.json(profile);
  } catch (err) {
    if (err instanceof Error && err.message === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
