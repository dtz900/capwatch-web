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
 * Design: the night's winner is CROWNED, not listed: hero panel with the
 * TailSlips crown over their avatar and the night's focal number; 02-03
 * as supporting cast; 04-10 compact. Gold is reserved for the crown
 * moment, green/red for units, off-white for everything else.
 * Everyone renders, same as the site (content exclusions apply to tweet
 * TEXT and tags only, never the board).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const W = 1200;
const H = 630;

const BG = "#0a0a0c";
const OFF = "#f7f3e9";
const OFF_DIM = "rgba(247, 243, 233, 0.62)";
const OFF_FAINT = "rgba(247, 243, 233, 0.38)";
const HAIR = "rgba(247, 243, 233, 0.10)";
const PANEL_BG = "rgba(255, 255, 255, 0.02)";
const POS = "#4ade80";
const NEG = "#f87171";
const GOLD = "#f5c54a";
const GOLD_DIM = "rgba(245, 197, 74, 0.45)";

async function fileDataUri(name: string): Promise<string | null> {
  try {
    const buf = await readFile(join(process.cwd(), "public", name));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Fetch an avatar to a data URI; null on any failure (initials fallback).
 * Short timeout per fetch: a rotten pbs.twimg URL must not stall the card. */
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

/** Twitter serves _normal (48px) avatar URLs; the hero needs the 400x400. */
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
    dateLabel = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  } catch {
    // fall through to the empty-card render
  }

  const hero = rows[0];
  const [logo, crown, heroAvatar, ...avatars] = await Promise.all([
    fileDataUri("logo-horizontal-aligned-tight.png"),
    fileDataUri("logo-crown.png"),
    hero ? avatarDataUri(bigAvatarUrl(hero.profile_image_url)) : Promise.resolve(null),
    ...rows.slice(1).map((c) => avatarDataUri(c.profile_image_url)),
  ]);

  const supporting = rows.slice(1, 3);
  const rest = rows.slice(3);

  const smallAvatar = (c: SlateCapperSummary, i: number, size: number) => {
    const uri = avatars[i];
    if (uri) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={uri}
          alt=""
          width={size}
          height={size}
          style={{ borderRadius: size, border: `1px solid ${HAIR}` }}
        />
      );
    }
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size,
          background: "rgba(255,255,255,0.06)",
          border: `1px solid ${HAIR}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.38,
          fontWeight: 700,
          color: OFF_DIM,
        }}
      >
        {(c.handle ?? "??").slice(0, 2).toUpperCase()}
      </div>
    );
  };

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
          padding: "30px 48px 22px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
              Final standings
            </span>
            <span style={{ fontSize: 20, color: OFF_DIM, fontWeight: 700 }}>
              {dateLabel}
            </span>
          </div>
          <span
            style={{
              fontSize: 16,
              color: OFF_FAINT,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {graded} picks · {sharps} sharps
          </span>
        </div>

        {!hero ? (
          <div
            style={{
              display: "flex",
              flexGrow: 1,
              alignItems: "center",
              justifyContent: "center",
              background: PANEL_BG,
              border: `1px solid ${HAIR}`,
              borderRadius: 16,
              marginTop: 18,
            }}
          >
            <span style={{ fontSize: 26, color: OFF_DIM }}>No graded picks yet.</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexGrow: 1, marginTop: 18, gap: 20 }}>
            {/* Hero: the night's crowned winner. Gold lives here and only
                here; a faint radial glow lifts the panel off the page. */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: 430,
                background:
                  "radial-gradient(circle at 50% 32%, rgba(245,197,74,0.10), rgba(255,255,255,0.015) 62%)",
                border: `1px solid ${GOLD_DIM}`,
                borderRadius: 18,
                gap: 10,
                paddingTop: 6,
              }}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: 4,
                  textTransform: "uppercase",
                  color: GOLD,
                }}
              >
                Tonight&apos;s top sharp
              </span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                {crown && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={crown} alt="" width={64} style={{ marginBottom: -6 }} />
                )}
                {heroAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={heroAvatar}
                    alt=""
                    width={128}
                    height={128}
                    style={{
                      borderRadius: 128,
                      border: `3px solid ${GOLD_DIM}`,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 128,
                      height: 128,
                      borderRadius: 128,
                      background: "rgba(255,255,255,0.06)",
                      border: `3px solid ${GOLD_DIM}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 46,
                      fontWeight: 800,
                      color: OFF_DIM,
                    }}
                  >
                    {(hero.handle ?? "??").slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 30, fontWeight: 800 }}>
                @{hero.handle ?? hero.display_name ?? "capper"}
              </span>
              <span
                style={{
                  fontSize: 62,
                  fontWeight: 800,
                  lineHeight: 1,
                  color: hero.net_units >= 0 ? POS : NEG,
                }}
              >
                {units(hero.net_units)}
              </span>
              <span style={{ fontSize: 19, color: OFF_DIM, fontWeight: 700 }}>
                {record(hero)} · {hero.graded_count} graded
              </span>
            </div>

            {/* Supporting cast: 02-03 prominent, 04-10 compact. */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flexGrow: 1,
                background: PANEL_BG,
                border: `1px solid ${HAIR}`,
                borderRadius: 18,
                padding: "2px 24px",
              }}
            >
              {supporting.map((c, i) => (
                <div
                  key={c.capper_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 15,
                    height: 66,
                    borderBottom: `1px solid ${HAIR}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 21,
                      fontWeight: 800,
                      color: OFF_DIM,
                      width: 34,
                    }}
                  >
                    {String(i + 2).padStart(2, "0")}
                  </span>
                  {smallAvatar(c, i, 44)}
                  <span style={{ fontSize: 24, fontWeight: 800, flexGrow: 1 }}>
                    @{c.handle ?? c.display_name ?? "capper"}
                  </span>
                  <span style={{ fontSize: 18, color: OFF_DIM, fontWeight: 700 }}>
                    {record(c)}
                  </span>
                  <span
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      color: c.net_units >= 0 ? POS : NEG,
                      width: 112,
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    {units(c.net_units)}
                  </span>
                </div>
              ))}
              {rest.map((c, i) => (
                <div
                  key={c.capper_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexGrow: 1,
                    borderBottom: i < rest.length - 1 ? `1px solid ${HAIR}` : "none",
                  }}
                >
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: OFF_FAINT,
                      width: 30,
                    }}
                  >
                    {String(i + 4).padStart(2, "0")}
                  </span>
                  {smallAvatar(c, i + 2, 30)}
                  <span style={{ fontSize: 18, fontWeight: 700, flexGrow: 1 }}>
                    @{c.handle ?? c.display_name ?? "capper"}
                  </span>
                  <span style={{ fontSize: 15, color: OFF_DIM, fontWeight: 700 }}>
                    {record(c)}
                  </span>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: c.net_units >= 0 ? POS : NEG,
                      width: 88,
                      display: "flex",
                      justifyContent: "flex-end",
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
            marginTop: 16,
          }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="TailSlips" height={26} />
          ) : (
            <span style={{ fontSize: 22, fontWeight: 800 }}>TailSlips</span>
          )}
          <span style={{ fontSize: 18, color: OFF_DIM, fontWeight: 700 }}>
            tailslips.com/slate
          </span>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
