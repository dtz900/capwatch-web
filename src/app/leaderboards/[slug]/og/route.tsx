import { getArchive } from "@/lib/leaderboard-archives";
import { renderArchiveOg } from "../_archive-og-renderer";

/**
 * OG card for a final leaderboard archive, rendered from the frozen JSON so
 * the image can never disagree with the page. Its own design (podium record),
 * deliberately not the nightly standings poster.
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
  return renderArchiveOg(a);
}
