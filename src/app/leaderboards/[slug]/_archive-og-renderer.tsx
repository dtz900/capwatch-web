import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { LeaderboardArchive, ArchiveRow } from "@/lib/leaderboard-archives";
import {
  CARD_H,
  CARD_W,
  avatarDataUri,
  bigAvatarUrl,
  fileDataUri,
  fontData,
} from "@/app/og/_standings-card";

/**
 * Archive card: the permanent record of a final board, distinct from the
 * nightly standings poster on purpose. A typographic week title, a mono
 * stats strip, the top three on staggered podium tiles (crown on first),
 * and the site's league wash behind it (red NFL, blue MLB; the same tint
 * components/ui/SportTint paints behind the page) so the two sports read
 * apart at a glance.
 *
 * Palette rules: off-white is the only light color, green/red only on
 * units, the crown is the only accent. Tiles are thin hairline borders on
 * a low-alpha fill, rounded 12, no glows.
 */

const BG = "#0a0a0c";
const OFF = "#f7f3e9";
const OFF_SOFT = "rgba(247, 243, 233, 0.72)";
const OFF_DIM = "rgba(247, 243, 233, 0.55)";
const OFF_FAINT = "rgba(247, 243, 233, 0.32)";
const HAIR = "rgba(247, 243, 233, 0.10)";
const TILE = "rgba(247, 243, 233, 0.025)";
const POS = "#4ade80";
const NEG = "#f87171";

// League wash, same hues as SportTint, kept faint. Satori wants the far
// stop to be the page color rather than transparent on the root box.
const WASH: Record<"nfl" | "mlb", string> = {
  nfl: `radial-gradient(circle at 50% -20%, rgba(220, 38, 38, 0.30) 0%, ${BG} 60%)`,
  mlb: `radial-gradient(circle at 50% -20%, rgba(37, 99, 235, 0.32) 0%, ${BG} 60%)`,
};

function units(v: number): string {
  const one = Math.abs(v * 10 - Math.round(v * 10)) < 1e-9;
  return `${v >= 0 ? "+" : ""}${v.toFixed(one ? 1 : 2)}u`;
}

function record(r: ArchiveRow): string {
  return r.pushes > 0 ? `${r.wins}-${r.losses}-${r.pushes}` : `${r.wins}-${r.losses}`;
}

function unitColor(v: number): string {
  return v >= 0 ? POS : NEG;
}

async function monoFont(name: string): Promise<Buffer | null> {
  try {
    return await readFile(join(process.cwd(), "public", "fonts", name));
  } catch {
    return null;
  }
}

export async function renderArchiveOg(a: LeaderboardArchive): Promise<Response> {
  const rows = a.rows.filter((r) => r.graded > 0);
  const podium = rows.slice(0, 3);

  const [m500, m700, m800, mono500, mono700] = await Promise.all([
    fontData("manrope-500.woff"),
    fontData("manrope-700.woff"),
    fontData("manrope-800.woff"),
    monoFont("jetbrains-mono-500.ttf"),
    monoFont("jetbrains-mono-700.ttf"),
  ]);
  const [logo, crown3d, ...avatars] = await Promise.all([
    fileDataUri("logo-horizontal-aligned-tight.png"),
    fileDataUri("crown-3d.png"),
    ...podium.map((r, i) => avatarDataUri(i === 0 ? bigAvatarUrl(r.avatarUrl) : r.avatarUrl)),
  ]);

  const circle = (uri: string | null, handle: string, size: number) =>
    uri ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={uri} alt="" width={size} height={size} style={{ borderRadius: size, border: `2px solid ${HAIR}` }} />
    ) : (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size,
          background: "rgba(247,243,233,0.06)",
          border: `2px solid ${HAIR}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.round(size * 0.34),
          fontWeight: 700,
          color: OFF_DIM,
        }}
      >
        {handle.slice(0, 2).toUpperCase()}
      </div>
    );

  const tileW = 250;
  const heights = [330, 276, 252];
  // Podium order on screen: 2nd, 1st, 3rd.
  const order = [1, 0, 2].filter((i) => i < podium.length);

  const tile = (i: number) => {
    const r = podium[i];
    const first = i === 0;
    const av = first ? 132 : 96;
    return (
      <div
        key={r.handle}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          width: tileW,
          height: heights[i],
          border: `1px solid ${HAIR}`,
          background: TILE,
          borderRadius: 12,
          padding: first ? "26px 14px 18px" : "20px 12px 16px",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", position: "relative" }}>
          {circle(avatars[i], r.handle, av)}
          {first && crown3d && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={crown3d} alt="" width={Math.round(av * 0.6)} style={{ position: "absolute", top: -Math.round(av * 0.28), right: -Math.round(av * 0.04) }} />
          )}
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, color: OFF_FAINT, marginTop: first ? 8 : 4 }}>
          {["FIRST", "SECOND", "THIRD"][i]}
        </span>
        <span
          style={{
            fontSize: first ? 22 : 18,
            fontWeight: 800,
            color: OFF,
            maxWidth: tileW - 24,
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          @{r.handle}
        </span>
        <span style={{ fontSize: first ? 40 : 30, fontWeight: 800, lineHeight: 1, letterSpacing: -1, color: unitColor(r.netUnits) }}>
          {units(r.netUnits)}
        </span>
        <span style={{ fontSize: 13, fontWeight: 500, color: OFF_DIM, fontFamily: "JetBrains Mono, Manrope, monospace" }}>
          {record(r)} · {r.graded} graded
        </span>
      </div>
    );
  };

  const title = a.title.toUpperCase();
  const strip = `${rows.length} SHARPS  ·  ${a.totals.graded.toLocaleString("en-US")} PICKS  ·  ${a.games} GAMES`;

  return new ImageResponse(
    (
      <div
        style={{
          width: CARD_W,
          height: CARD_H,
          display: "flex",
          flexDirection: "column",
          background: WASH[a.sport] ?? BG,
          color: OFF,
          padding: "34px 48px 22px",
          fontFamily: "Manrope, Arial, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 4, color: OFF_FAINT }}>
            FINAL · {a.rangeLabel.toUpperCase()}
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 4, color: OFF_FAINT }}>CAPPER LEADERBOARD</span>
        </div>

        {/* Title + strip */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 76, fontWeight: 800, lineHeight: 1, letterSpacing: -3, color: OFF }}>{title}</span>
          <span
            style={{
              fontSize: 15,
              fontWeight: 500,
              letterSpacing: 2,
              color: OFF_SOFT,
              fontFamily: "JetBrains Mono, Manrope, monospace",
              paddingBottom: 10,
            }}
          >
            {strip}
          </span>
        </div>
        <div style={{ display: "flex", height: 1, background: HAIR, marginTop: 16 }} />

        {/* Body */}
        {podium.length === 0 ? (
          <div style={{ display: "flex", flexGrow: 1, alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 26, color: OFF_DIM }}>No graded picks.</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexGrow: 1, alignItems: "flex-end", justifyContent: "center", marginTop: 18, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>{order.map(tile)}</div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${HAIR}`,
            paddingTop: 12,
          }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="TailSlips" height={26} />
          ) : (
            <span style={{ fontSize: 22, fontWeight: 800 }}>TailSlips</span>
          )}
          <span style={{ fontSize: 16, color: OFF_DIM, fontWeight: 700 }}>tailslips.com/leaderboards/{a.slug}</span>
        </div>
      </div>
    ),
    {
      width: CARD_W,
      height: CARD_H,
      fonts: [
        ...(m500 && m700 && m800
          ? [
              { name: "Manrope", data: m500, weight: 500 as const },
              { name: "Manrope", data: m700, weight: 700 as const },
              { name: "Manrope", data: m800, weight: 800 as const },
            ]
          : []),
        ...(mono500 && mono700
          ? [
              { name: "JetBrains Mono", data: mono500, weight: 500 as const },
              { name: "JetBrains Mono", data: mono700, weight: 700 as const },
            ]
          : []),
      ],
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
