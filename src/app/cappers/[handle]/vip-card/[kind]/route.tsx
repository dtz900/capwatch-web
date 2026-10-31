import { capperVipEnabledFor } from "@/lib/flags";
import { isPromoKind } from "@/lib/vip/promote";
import { cardHasData, loadCardData, renderVipCard } from "../_vip-card-renderer";

// Promote share card PNG: /cappers/{handle}/vip-card/{brand|launch|receipt|record}[?t=ticket].
// Drawn from the platform's live numbers; a receipt only for a revealed win.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string; kind: string }> },
) {
  const { handle, kind } = await params;
  if (!isPromoKind(kind) || !capperVipEnabledFor(handle)) return new Response("Not found", { status: 404 });
  const ticket = new URL(request.url).searchParams.get("t");
  try {
    const data = await loadCardData(handle, kind, ticket);
    if (!data || !cardHasData(kind, data)) return new Response("Not found", { status: 404 });
    return await renderVipCard(kind, data);
  } catch (err) {
    console.error("[vip-card] render failed", { handle, kind, ticket, err });
    return new Response("Card unavailable", { status: 502 });
  }
}
