import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { fetchSlate } from "@/lib/api";
import type { SlateCapperSummary } from "@/lib/types";

/**
 * Final-standings card: the shareable image for the nightly leaderboard
 * thread. Data comes from fetchSlate's capper_summary (staking-scheme
 * corrected), so the image can never disagree with tailslips.com/slate.
 *
 *   /og/standings            -> today's slate
 *   /og/standings?date=ISO   -> a specific slate date
 *
 * Design: winner poster split. The night's top sharp takes the left half
 * (210px avatar wearing the 3D crown, units at poster scale); ranks 2-10
 * run as a ledger column on the right. Off-white on near-black, green/red
 * only for units, Manrope, the crown as the only accent.
 *
 * crown-3d.png is generated from the logo's crown mark with the 22deg worn
 * tilt baked into the pixels: satori clips CSS-rotated images to their
 * unrotated box, so the asset must carry its own rotation. Everyone renders
 * (content exclusions apply to tweet TEXT and tags, never the board).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const W = 1200;
const H = 630;

const BG = "#0a0a0c";
const OFF = "#f7f3e9";
const OFF_DIM = "rgba(247, 243, 233, 0.60)";
const OFF_FAINT = "rgba(247, 243, 233, 0.35)";
const HAIR = "rgba(247, 243, 233, 0.10)";
const POS = "#4ade80";
const NEG = "#f87171";

async function fontData(name: string): Promise<Buffer | null> {
  try {
    return await readFile(join(process.cwd(), "public", "fonts", name));
  } catch {
    return null;
  }
}

async function fileDataUri(name: string): Promise<string | null> {
  try {
    const buf = await readFile(join(process.cwd(), "public", name));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

async function avatarDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!type.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 400_000) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function bigAvatarUrl(url: string | null): string | null {
  if (!url) return null;
  return url.replace("_normal.", "_400x400.");
}

function record(c: SlateCapperSummary): string {
  let r = `${c.wins}-${c.losses}`;
  if (c.pushes > 0) r += `-${c.pushes}`;
  return r;
}

function units(v: number): string {
  const one = Math.abs(v * 10 - Math.round(v * 10)) < 1e-9;
  return `${v >= 0 ? "+" : ""}${v.toFixed(one ? 1 : 2)}u`;
}

function unitColor(v: number): string {
  return v >= 0 ? POS : NEG;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || "today";

  let rows: SlateCapperSummary[] = [];
  let dateLabel = "";
  let graded = 0;
  let sharps = 0;
  try {
    const slate = await fetchSlate(date);
    rows = (slate.capper_summary ?? [])
      .filter((c) => c.graded_count > 0)
      .sort((a, b) => b.net_units - a.net_units)
      .slice(0, 10);
    sharps = (slate.capper_summary ?? []).filter((c) => c.graded_count > 0).length;
    graded = slate.day_summary?.graded_count ?? 0;
    const d = new Date(`${slate.date}T12:00:00Z`);
    dateLabel = d
      .toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
      .toUpperCase();
  } catch {
    // fall through to the empty-card render
  }

  const hero = rows[0];
  const [m500, m700, m800] = await Promise.all([
    fontData("manrope-500.woff"),
    fontData("manrope-700.woff"),
    fontData("manrope-800.woff"),
  ]);
  const [logo, crown3d, heroAvatar, ...avatars] = await Promise.all([
    fileDataUri("logo-horizontal-aligned-tight.png"),
    fileDataUri("crown-3d.png"),
    hero ? avatarDataUri(bigAvatarUrl(hero.profile_image_url)) : Promise.resolve(null),
    ...rows.slice(1).map((c) => avatarDataUri(c.profile_image_url)),
  ]);

  const circle = (
    uri: string | null,
    handle: string | null,
    size: number,
    border = `1px solid ${HAIR}`,
  ) =>
    uri ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={uri}
        alt=""
        width={size}
        height={size}
        style={{ borderRadius: size, border }}
      />
    ) : (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size,
          background: "rgba(255,255,255,0.06)",
          border,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.max(12, Math.round(size * 0.34)),
          fontWeight: 700,
          color: OFF_DIM,
        }}
      >
        {(handle ?? "??").slice(0, 2).toUpperCase()}
      </div>
    );

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          background: BG,
          color: OFF,
          padding: "30px 48px 20px",
          fontFamily: "Manrope, Arial, sans-serif",
        }}
      >
        {/* Marquee */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: 5, color: OFF }}>
            FINAL STANDINGS · {dateLabel}
          </span>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: 3, color: OFF_FAINT }}>
            {graded} PICKS · {sharps} SHARPS
          </span>
        </div>
        <div style={{ display: "flex", height: 2, background: HAIR, marginTop: 14 }} />
        <div style={{ display: "flex", height: 1, background: HAIR, marginTop: 3 }} />

        {!hero ? (
          <div
            style={{
              display: "flex",
              flexGrow: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 26, color: OFF_DIM }}>No graded picks yet.</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexGrow: 1, marginTop: 10 }}>
            {/* Winner poster */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 430,
                gap: 10,
                paddingTop: 58,
              }}
            >
              <div style={{ display: "flex", position: "relative" }}>
                {circle(heroAvatar, hero.handle, 210, `4px solid ${unitColor(hero.net_units)}`)}
                {crown3d && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={crown3d}
                    alt=""
                    width={122}
                    style={{
                      position: "absolute",
                      top: -56,
                      right: -6,
                    }}
                  />
                )}
              </div>
              <span style={{ fontSize: 33, fontWeight: 800, color: OFF, marginTop: 6 }}>
                @{hero.handle ?? hero.display_name ?? "capper"}
              </span>
              <span
                style={{ fontSize: 13, fontWeight: 800, letterSpacing: 3, color: OFF_FAINT }}
              >
                TONIGHT&apos;S TOP SHARP · {record(hero)} · {hero.graded_count} GRADED
              </span>
              <span
                style={{
                  fontSize: 84,
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: -2,
                  color: unitColor(hero.net_units),
                }}
              >
                {units(hero.net_units)}
              </span>
            </div>
            <div style={{ display: "flex", width: 1, background: HAIR, margin: "6px 34px" }} />
            {/* Ledger column: ranks 02-10 */}
            <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
              {rows.slice(1).map((c, i) => (
                <div
                  key={c.capper_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexGrow: 1,
                    gap: 12,
                    borderBottom: i < 8 ? `1px solid ${HAIR}` : "none",
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 800, color: OFF_FAINT, width: 32 }}>
                    {String(i + 2).padStart(2, "0")}
                  </span>
                  {circle(avatars[i], c.handle, 30)}
                  <span style={{ fontSize: 19, fontWeight: 700, color: OFF }}>
                    @{c.handle ?? c.display_name ?? "capper"}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: OFF_FAINT }}>
                    {record(c)}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 21,
                      fontWeight: 800,
                      color: unitColor(c.net_units),
                    }}
                  >
                    {units(c.net_units)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 8,
            borderTop: `1px solid ${HAIR}`,
            paddingTop: 12,
          }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="TailSlips" height={28} />
          ) : (
            <span style={{ fontSize: 22, fontWeight: 800 }}>TailSlips</span>
          )}
          <span style={{ fontSize: 18, color: OFF_DIM, fontWeight: 700 }}>tailslips.com/slate</span>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts:
        m500 && m700 && m800
          ? [
              { name: "Manrope", data: m500, weight: 500 },
              { name: "Manrope", data: m700, weight: 700 },
              { name: "Manrope", data: m800, weight: 800 },
            ]
          : undefined,
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
