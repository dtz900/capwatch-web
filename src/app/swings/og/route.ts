import { renderSwingsOg, type SwingTicket } from "../_swings-og-renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ticket(sp: URLSearchParams, prefix: "w" | "l"): SwingTicket | null {
  const handle = sp.get(`${prefix}h`);
  const units = Number(sp.get(`${prefix}u`));
  if (!handle || !Number.isFinite(units)) return null;
  return {
    handle,
    desc: sp.get(`${prefix}d`) ?? "",
    odds: sp.get(`${prefix}o`) ?? "",
    stake: sp.get(`${prefix}s`) ?? "",
    units,
    avatarUrl: sp.get(`${prefix}a`),
  };
}

export async function GET(request: Request): Promise<Response> {
  const sp = new URL(request.url).searchParams;
  return renderSwingsOg({
    date: sp.get("date") ?? "",
    win: ticket(sp, "w"),
    loss: ticket(sp, "l"),
  });
}
