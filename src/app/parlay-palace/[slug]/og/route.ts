import { renderPalaceOg } from "../_pp-og-renderer";

// Route-handler OG image for Parlay Palace shares. The page metadata points
// here with query-string fingerprints so X sees a new image URL after card
// redesigns, entry edits, or each explicit Share-on-X click.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  return renderPalaceOg(slug);
}
