import { ImageResponse } from "next/og";
import { fetchPalaceEntry } from "@/lib/api";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Winning MLB parlay on TailSlips";

const BG = "#0a0a0c";
const POS = "#19f57c";
const TEXT = "#fafafa";
const MUTED = "#71717a";
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAen63NgAAAAASUVORK5CYII=",
  "base64");

async function heroDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 2500);
  try {
    const r = await fetch(url, { signal: ctrl.signal,
      headers: { "User-Agent": "TailSlipsBot/1.0 (+https://tailslips.com)" } });
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > 3_000_000) return null;
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function renderPalaceOg(slug: string): Promise<Response> {
  let entry = null;
  try { entry = await fetchPalaceEntry(slug); } catch {}
  if (!entry) {
    return new Response(TRANSPARENT_PNG, {
      headers: { "content-type": "image/png",
                 "cache-control": "public, max-age=30, s-maxage=30" } });
  }
  // hero is decorative only; the card stands without it
  const heroUri = entry.hero_kind === "photo"
    ? await heroDataUri(entry.hero_url) : null;
  const units = (entry.units_profit ?? 0).toFixed(2);
  try {
    const img = new ImageResponse((
      <div style={{ width: "100%", height: "100%", display: "flex",
        flexDirection: "column", justifyContent: "space-between",
        background: BG, color: TEXT, padding: "44px 56px",
        fontFamily: "system-ui, sans-serif", position: "relative" }}>
        {heroUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroUri} alt="" width={1200} height={630}
            style={{ position: "absolute", inset: 0, width: 1200,
              height: 630, objectFit: "cover", opacity: 0.45 }} />
        ) : null}
        <div style={{ display: "flex", fontSize: 20, fontWeight: 700,
          color: POS, letterSpacing: 2 }}>
          TAILSLIPS · PARLAY PALACE
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontWeight: 800, color: POS,
            letterSpacing: -3, display: "flex" }}>
            +{units}u
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, marginTop: 10,
            display: "flex" }}>
            @{entry.capper_handle} · {entry.leg_count}-leg · +{entry.combined_odds}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between",
          fontSize: 18, color: MUTED }}>
          <div style={{ display: "flex" }}>Media: MLB Advanced Media</div>
          <div style={{ display: "flex", fontWeight: 700, color: POS }}>
            tailslips.com
          </div>
        </div>
      </div>
    ), { ...size });
    const buf = await img.arrayBuffer();
    return new Response(buf, { headers: { "content-type": "image/png",
      "cache-control":
        "public, max-age=60, s-maxage=60, stale-while-revalidate=300" } });
  } catch {
    return new Response(TRANSPARENT_PNG, {
      headers: { "content-type": "image/png",
                 "cache-control": "public, max-age=30, s-maxage=30" } });
  }
}
