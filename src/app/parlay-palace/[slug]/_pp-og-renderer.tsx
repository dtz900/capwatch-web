import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { fetchPalaceEntry } from "@/lib/api";
import { formatUnits2 } from "@/lib/formatters";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Winning MLB parlay on TailSlips";

const BG = "#0b0d11";
const FOIL =
  "linear-gradient(135deg,#caa45a 0%,#f3e3b3 22%,#9c7a36 46%,#e9cf93 68%,#8a6e3a 100%)";
const UNITS_GRADIENT =
  "linear-gradient(180deg,#fdf3d6 0%,#e9cf93 42%,#c7a259 100%)";
const GOLD_LIGHT = "#e3c787";
const GOLD_DEEP = "#c7a259";

const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAen63NgAAAAASUVORK5CYII=",
  "base64",
);

async function heroDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 2500);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "TailSlipsBot/1.0 (+https://tailslips.com)" },
    });
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
  try {
    entry = await fetchPalaceEntry(slug);
  } catch (err) {
    console.error("[pp-og-renderer] fetchPalaceEntry failed", err);
  }
  if (!entry) {
    return pngResponse(TRANSPARENT_PNG, "public, max-age=30, s-maxage=30, stale-while-revalidate=120");
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
  const legs = (entry.body?.legs ?? []).slice(0, 3);

  try {
    const img = new ImageResponse((
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 50% 10%, rgba(202,164,90,0.22), rgba(11,13,17,0.96) 48%, #050608 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(90deg, rgba(202,164,90,0.10), transparent 22%, transparent 78%, rgba(202,164,90,0.10))",
          }}
        />
        <div
          style={{
            width: 440,
            height: 600,
            display: "flex",
            background: FOIL,
            padding: 4,
            borderRadius: 24,
            boxShadow: "0 28px 70px rgba(0,0,0,0.72)",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              position: "relative",
              background: BG,
              borderRadius: 20,
              overflow: "hidden",
            }}
          >
            <div style={{ height: 315, display: "flex", position: "relative", overflow: "hidden" }}>
              {heroUri ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroUri}
                  alt=""
                  width={432}
                  height={315}
                  style={{ position: "absolute", inset: 0, width: 432, height: 315, objectFit: "cover" }}
                />
              ) : null}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  background:
                    "linear-gradient(180deg, rgba(11,13,17,0.05) 0%, rgba(11,13,17,0.18) 42%, rgba(11,13,17,0.80) 82%, #0b0d11 100%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 22,
                  left: 22,
                  display: "flex",
                  flexDirection: "column",
                  padding: "10px 12px",
                  background: "rgba(8,9,12,0.55)",
                  borderRadius: 8,
                }}
              >
                <div style={{ display: "flex", fontSize: 12, color: GOLD_LIGHT, fontWeight: 900, letterSpacing: 3.2 }}>
                  PARLAY PALACE
                </div>
                {entry.slate_date ? (
                  <div style={{ display: "flex", marginTop: 9, fontSize: 12, color: "#fff", fontWeight: 800 }}>
                    {entry.slate_date}
                  </div>
                ) : null}
              </div>
              {crownUri ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={crownUri}
                  alt=""
                  width={58}
                  height={58}
                  style={{ position: "absolute", left: 16, bottom: 50, width: 58, height: 58, transform: "rotate(-22deg)" }}
                />
              ) : null}
              <div style={{ position: "absolute", left: 22, bottom: 28, display: "flex", alignItems: "flex-end" }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: 70,
                    fontWeight: 950,
                    lineHeight: 0.9,
                    backgroundImage: UNITS_GRADIENT,
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {units}
                </div>
                <div
                  style={{
                    display: "flex",
                    color: GOLD_DEEP,
                    fontSize: 26,
                    fontWeight: 900,
                    marginLeft: 6,
                    marginBottom: 8,
                  }}
                >
                  u
                </div>
              </div>
              <div
                style={{
                  position: "absolute",
                  left: 22,
                  bottom: 8,
                  display: "flex",
                  fontSize: 10,
                  color: "rgba(255,255,255,0.78)",
                  fontWeight: 900,
                  letterSpacing: 1.1,
                }}
              >
                {metaParts.join(" - ")}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", padding: "16px 20px 0" }}>
              <div
                style={{
                  display: "flex",
                  color: "rgba(255,255,255,0.66)",
                  fontSize: 13,
                  lineHeight: 1.45,
                  maxHeight: 76,
                  overflow: "hidden",
                }}
              >
                {entry.recap_blurb ?? "Every leg captured, graded, and preserved on TailSlips."}
              </div>
              <div style={{ display: "flex", flexDirection: "column", marginTop: 14, gap: 10 }}>
                {legs.map((leg, i) => (
                  <div key={leg.leg_index ?? i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", color: "#fff", fontSize: 15, fontWeight: 850 }}>
                        {leg.player_name ?? leg.selection ?? "Winning leg"}
                      </div>
                      <div style={{ display: "flex", color: "rgba(255,255,255,0.48)", fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                        {leg.selection ?? leg.market ?? `Leg ${i + 1}`}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        color: GOLD_LIGHT,
                        fontSize: 13,
                        fontWeight: 900,
                        padding: "7px 10px",
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: 8,
                      }}
                    >
                      {leg.result_text ?? "Hit"}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 900, letterSpacing: 2 }}>
                  1U GREW TO
                </div>
                <div style={{ display: "flex", color: GOLD_LIGHT, fontSize: 20, fontWeight: 950 }}>
                  {units}u
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ), { ...size });
    const buf = await img.arrayBuffer();
    return pngResponse(buf, "public, max-age=60, s-maxage=60, stale-while-revalidate=300");
  } catch (err) {
    console.error("[pp-og-renderer] ImageResponse failed", err);
    return pngResponse(TRANSPARENT_PNG, "public, max-age=30, s-maxage=30, stale-while-revalidate=120");
  }
}

function pngResponse(body: BodyInit, cacheControl: string): Response {
  return new Response(body, {
    headers: { "content-type": "image/png", "cache-control": cacheControl },
  });
}
