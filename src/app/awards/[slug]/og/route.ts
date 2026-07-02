import { renderAwardOg, type AwardVariant } from "../_award-og-renderer";

// Route-handler OG image so the award page can render the card inline and the
// DM/share flow can link a plain PNG URL.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const sp = new URL(request.url).searchParams;
  const debug = sp.get("debug") === "1";
  const variant: AwardVariant = sp.get("variant") === "b" ? "b" : "a";
  return renderAwardOg(slug, { debug, variant });
}
