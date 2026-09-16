import { fetchSlate, fetchWeekStandings } from "@/lib/api";
import type { SlateCapperSummary } from "@/lib/types";
import { renderStandingsCard, type StandingsCardRow } from "../_standings-card";

/**
 * Final-standings card: the shareable image for the nightly leaderboard
 * thread. Data comes from fetchSlate's capper_summary (staking-scheme
 * corrected), so the image can never disagree with tailslips.com/slate.
 *
 *   /og/standings                  -> today's slate
 *   /og/standings?date=ISO         -> a specific slate date
 *   /og/standings?date=ISO&week=1  -> the Mon-Sun week containing that
 *                                     date, summed exactly the way the
 *                                     site's week toggle sums it
 *   /og/standings?sport=nfl&week=N -> the NFL week
 *
 * The drawing lives in ../_standings-card.tsx, shared with the archive card
 * at /leaderboards/<slug>/og.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || "today";
  const sport = url.searchParams.get("sport") === "nfl" ? "nfl" : "mlb";
  // MLB: `week=1` is a flag for the Mon-Sun rollup around `date`.
  // NFL: `week=N` is the league week number; the API serves the whole week
  // as one slate, so no per-day summing is needed.
  const nflWeek = sport === "nfl" ? Number(url.searchParams.get("week")) : NaN;
  const week = sport === "nfl" ? Number.isInteger(nflWeek) && nflWeek >= 1 : url.searchParams.get("week") === "1";

  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00Z`)
      .toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
      .toUpperCase();

  let rows: SlateCapperSummary[] = [];
  let dateLabel = "";
  let graded = 0;
  let sharps = 0;
  try {
    let summary: SlateCapperSummary[] = [];
    if (sport === "nfl") {
      const slate = await fetchSlate("today", "nfl", week ? nflWeek : undefined);
      summary = slate.capper_summary ?? [];
      graded = slate.day_summary?.graded_count ?? 0;
      const n = slate.week?.week ?? (week ? nflWeek : undefined);
      dateLabel = n != null ? `NFL WEEK ${n}` : "NFL";
    } else if (week) {
      // The week needs a concrete slate date to anchor Mon-Sun; "today"
      // resolves through the daily fetch first.
      const anchor = date === "today" ? (await fetchSlate("today")).date : date;
      const wk = await fetchWeekStandings(anchor);
      if (!wk) throw new Error("no week data");
      summary = wk.capper_summary ?? [];
      graded = wk.summary?.graded_count ?? 0;
      dateLabel = `WEEK OF ${fmt(wk.week_start)}`;
    } else {
      const slate = await fetchSlate(date);
      summary = slate.capper_summary ?? [];
      graded = slate.day_summary?.graded_count ?? 0;
      dateLabel = fmt(slate.date);
    }
    rows = summary
      .filter((c) => c.graded_count > 0)
      .sort((a, b) => b.net_units - a.net_units)
      .slice(0, 10);
    sharps = summary.filter((c) => c.graded_count > 0).length;
  } catch {
    // fall through to the empty-card render
  }

  const cardRows: StandingsCardRow[] = rows.map((c) => ({
    key: c.capper_id,
    handle: c.handle,
    displayName: c.display_name,
    avatarUrl: c.profile_image_url,
    wins: c.wins,
    losses: c.losses,
    pushes: c.pushes,
    graded: c.graded_count,
    netUnits: c.net_units,
  }));

  return renderStandingsCard({
    marquee:
      sport === "nfl" ? `${dateLabel} · FINAL` : week ? `WEEK FINAL · ${dateLabel}` : `FINAL STANDINGS · ${dateLabel}`,
    strip: `${graded} PICKS · ${sharps} SHARPS`,
    heroLabel: week ? "SHARP OF THE WEEK" : "TONIGHT'S TOP SHARP",
    footer: "tailslips.com/slate",
    rows: cardRows,
  });
}
