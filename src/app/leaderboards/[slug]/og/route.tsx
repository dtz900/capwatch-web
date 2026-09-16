import { getArchive } from "@/lib/leaderboard-archives";
import { renderStandingsCard, type StandingsCardRow } from "@/app/og/_standings-card";

/**
 * OG card for a final leaderboard archive, rendered from the frozen JSON so
 * the image can never disagree with the page (the live /og/standings card
 * recomputes from the API and drifts as regrades land). Same design as the
 * nightly standings card.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const a = getArchive(slug);
  if (!a) return new Response("Not found", { status: 404 });

  const rows: StandingsCardRow[] = a.rows
    .filter((r) => r.graded > 0)
    .map((r) => ({
      key: r.handle,
      handle: r.handle,
      displayName: r.displayName,
      avatarUrl: r.avatarUrl,
      wins: r.wins,
      losses: r.losses,
      pushes: r.pushes,
      graded: r.graded,
      netUnits: r.netUnits,
    }));

  return renderStandingsCard({
    marquee: `${a.title.toUpperCase()} · FINAL`,
    strip: `${a.totals.graded.toLocaleString("en-US")} PICKS · ${a.rows.length} SHARPS`,
    heroLabel: a.week != null ? "SHARP OF THE WEEK" : "TOP SHARP",
    footer: `tailslips.com/leaderboards/${a.slug}`,
    rows,
    // The archive never changes; let X and the CDN keep it.
    cacheControl: "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
  });
}
