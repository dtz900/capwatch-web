import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { fetchPalaceEntry } from "@/lib/api";
import { formatUnits2 } from "@/lib/formatters";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Winning MLB parlay on TailSlips";

// Palette mirrors the live Parlay Palace card. Gold-foil hall-of-fame, no neon.
const BG = "#0b0d11";
const FOIL =
  "linear-gradient(135deg,#caa45a 0%,#f3e3b3 22%,#9c7a36 46%,#e9cf93 68%,#8a6e3a 100%)";
const UNITS_GRADIENT =
  "linear-gradient(180deg,#fdf3d6 0%,#e9cf93 42%,#c7a259 100%)";
const SCRIM =
  "linear-gradient(180deg,rgba(11,13,17,0) 0%,rgba(11,13,17,0) 22%,rgba(11,13,17,0.12) 34%,rgba(11,13,17,0.38) 46%,rgba(11,13,17,0.72) 56%,rgba(11,13,17,0.95) 64%,#0b0d11 72%,#0b0d11 100%)";
const GOLD = "#caa45a";
const GOLD_LIGHT = "#e3c787";
const GOLD_DEEP = "#c7a259";

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
    if (buf.byteLength === 0 || buf.byteLength > 1_500_000) return null;
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function readPublicPngDataUri(filename: string): Promise<string | null> {
  try {
    const path = join(process.cwd(), "public", filename);
    const buf = await readFile(path);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function renderPalaceOg(slug: string): Promise<Response> {
  let entry = null;
  try { entry = await fetchPalaceEntry(slug); }
  catch (err) { console.error("[pp-og-renderer] fetchPalaceEntry failed", err); }
  if (!entry) {
    return new Response(TRANSPARENT_PNG, {
      headers: { "content-type": "image/png",
                 "cache-control": "public, max-age=30, s-maxage=30, stale-while-revalidate=120" } });
  }

  const [heroUri, crownUri] = await Promise.all([
    entry.hero_kind === "photo" ? heroDataUri(entry.hero_url) : Promise.resolve(null),
    readPublicPngDataUri("parlay-palace-crown.png"),
  ]);

  const units = formatUnits2(entry.units_profit ?? 0);
  const metaParts = [
    entry.leg_count != null ? `${entry.leg_count}-LEG PARLAY` : "PARLAY",
    entry.combined_odds != null ? `+${entry.combined_odds}` : null,
    entry.capper_handle ? `@${entry.capper_handle}` : null,
  ].filter(Boolean) as string[];

  try {
    const img = new ImageResponse((
      // foil frame
      <div style={{ width: "100%", height: "100%", display: "flex",
        background: FOIL, padding: 6 }}>
        {/* inner card */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column",
          position: "relative", background: BG, overflow: "hidden" }}>
          {/* full-bleed photo. The scrim below blends it into the dark
             nameplate so the gold units read on any hero. */}
          {heroUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroUri} alt="" width={1188} height={618}
              style={{ position: "absolute", inset: 0, width: 1188,
                height: 618, objectFit: "cover" }} />
          ) : null}

          {/* long cinematic scrim: clear at top, fades to solid by ~y=445 */}
          <div style={{ position: "absolute", top: 0, left: 0,
            width: 1188, height: 618, display: "flex",
            background: SCRIM }} />

          {/* kicker (top-left) with crown sitting on top */}
          <div style={{ position: "absolute", top: 96, left: 56,
            display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", flexDirection: "column",
              padding: "14px 18px", background: "rgba(8,9,12,0.55)",
              borderRadius: 10 }}>
              <div style={{ fontSize: 20, color: GOLD_LIGHT, fontWeight: 800,
                letterSpacing: 5, textTransform: "uppercase", display: "flex" }}>
                Parlay Palace
              </div>
              <div style={{ display: "flex", marginTop: 8, width: 56,
                height: 2, background: GOLD }} />
              {entry.slate_date && (
                <div style={{ display: "flex", marginTop: 10, fontSize: 16,
                  color: "#fff", fontWeight: 700, letterSpacing: 3.5,
                  textTransform: "uppercase" }}>
                  {entry.slate_date}
                </div>
              )}
            </div>
            {crownUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={crownUri} alt="" width={80} height={80}
                style={{ position: "absolute", top: -64, left: -22,
                  width: 80, height: 80, transform: "rotate(-22deg)",
                  filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.7))" }} />
            ) : null}
          </div>

          {/* tailslips.com (top-right) */}
          <div style={{ position: "absolute", top: 56, right: 60,
            fontSize: 18, color: GOLD, fontWeight: 800,
            letterSpacing: 4, textTransform: "uppercase", display: "flex" }}>
            tailslips.com
          </div>

          {/* name plate (bottom, sits on the solid dark panel) */}
          <div style={{ position: "absolute", left: 60, right: 60, bottom: 44,
            display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <div style={{
                fontSize: 188, fontWeight: 900, letterSpacing: -7,
                lineHeight: 0.9,
                backgroundImage: UNITS_GRADIENT,
                backgroundClip: "text",
                color: "transparent",
                display: "flex",
              }}>
                {units}
              </div>
              <div style={{
                display: "flex", fontSize: 64, fontWeight: 900,
                marginLeft: 12, marginBottom: 24, color: GOLD_DEEP,
              }}>
                u
              </div>
            </div>
            <div style={{ display: "flex", marginTop: 14, fontSize: 22,
              color: "rgba(255,255,255,0.82)", fontWeight: 800,
              letterSpacing: 4, textTransform: "uppercase" }}>
              {metaParts.map((part, i) => (
                <div key={i} style={{ display: "flex",
                  color: part.startsWith("@") ? GOLD_LIGHT : undefined }}>
                  {i > 0 ? (
                    <div style={{ display: "flex", margin: "0 16px",
                      color: "rgba(255,255,255,0.32)" }}>·</div>
                  ) : null}
                  {part}
                </div>
              ))}
            </div>
          </div>

          {/* media attribution (bottom-right) */}
          <div style={{ position: "absolute", bottom: 28, right: 60,
            fontSize: 12, color: "rgba(255,255,255,0.42)",
            letterSpacing: 2.4, textTransform: "uppercase", display: "flex" }}>
            {entry.body?.media_attribution ?? "Media: MLB Advanced Media"}
          </div>
        </div>
      </div>
    ), { ...size });
    const buf = await img.arrayBuffer();
    return new Response(buf, { headers: { "content-type": "image/png",
      "cache-control":
        "public, max-age=60, s-maxage=60, stale-while-revalidate=300" } });
  } catch (err) {
    console.error("[pp-og-renderer] ImageResponse failed", err);
    return new Response(TRANSPARENT_PNG, {
      headers: { "content-type": "image/png",
                 "cache-control": "public, max-age=30, s-maxage=30, stale-while-revalidate=120" } });
  }
}
