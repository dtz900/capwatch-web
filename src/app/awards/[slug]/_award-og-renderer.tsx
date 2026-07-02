import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { AWARD_CATEGORIES, getAward, type MonthlyAward } from "@/lib/awards";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "TailSlips monthly capper award";

// Site design tokens (globals.css). The card is a flat scoreboard plaque in
// the site's own language: near-black, off-white, thin borders, P&L green,
// one brand-gradient bar. No foil, no glows.
const BG = "#0a0a0c";
const TEXT = "#f7f3e9";
const TEXT_MUTED = "#71717a";
const BORDER = "rgba(255,255,255,0.10)";
const POS = "#19f57c";
const NEG = "#ef4444";
const MINT = "#5eead4";
const BRAND_BAR = "linear-gradient(90deg,#5eead4 0%,#19f57c 100%)";

/** Podium rank pill, exactly the leaderboard PodiumCard tokens. */
const RANK_PILLS: Record<number, { color: string; bg: string; border: string }> = {
  1: { color: "#f5c54a", bg: "rgba(245,197,74,0.10)", border: "rgba(245,197,74,0.30)" },
  2: { color: "#d4d4d8", bg: "rgba(212,212,216,0.06)", border: "rgba(212,212,216,0.18)" },
  3: { color: "#c8814a", bg: "rgba(200,129,74,0.06)", border: "rgba(200,129,74,0.20)" },
};

async function imageDataUri(url: string | null): Promise<string | null> {
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

function formatUnits(u: number): string {
  const sign = u >= 0 ? "+" : "";
  return `${sign}${u.toFixed(1)}`;
}

/** Frozen trajectory -> SVG area chart data-uri. The capper's actual month,
 * drawn in the site's sparkline language at poster scale. */
function trajectoryChartUri(series: number[], w: number, h: number): string | null {
  if (series.length < 2) return null;
  const values = [...series, 0];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padTop = 16;
  const padBottom = 6;
  const span = max - min || 1;
  const padRight = 20;
  const yOf = (v: number) => padTop + ((max - v) / span) * (h - padTop - padBottom);
  const xOf = (i: number) => (i / (series.length - 1)) * (w - padRight);
  const pts = series.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`);
  const line = "M" + pts.join(" L");
  const area = `${line} L${(w - padRight).toFixed(1)},${h} L0,${h} Z`;
  const zeroY = yOf(0).toFixed(1);
  const lastX = xOf(series.length - 1);
  const lastY = yOf(series[series.length - 1]);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="#19f57c" stop-opacity="0.24"/>` +
    `<stop offset="100%" stop-color="#19f57c" stop-opacity="0"/>` +
    `</linearGradient></defs>` +
    `<path d="${area}" fill="url(#g)"/>` +
    `<line x1="0" y1="${zeroY}" x2="${w}" y2="${zeroY}" stroke="rgba(247,243,233,0.13)" stroke-width="1" stroke-dasharray="3 7"/>` +
    `<path d="${line}" fill="none" stroke="#19f57c" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>` +
    `<circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="13" fill="rgba(25,245,124,0.22)"/>` +
    `<circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="5.5" fill="#19f57c"/>` +
    `</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export type AwardVariant = "a" | "b";

function awardCard(
  award: MonthlyAward,
  avatarUri: string | null,
  logoUri: string | null,
  variant: AwardVariant = "a",
) {
  const pill = RANK_PILLS[award.rank] ?? RANK_PILLS[3];
  const category = AWARD_CATEGORIES[award.category];
  const units = `${award.unitsProfit >= 0 ? "+" : ""}${award.unitsProfit.toFixed(1)}`;
  const unitsColor = award.unitsProfit >= 0 ? POS : NEG;
  const record = `${award.wins}-${award.losses}${award.pushes ? `-${award.pushes}` : ""}`;
  const statLine = [
    `${record} RECORD`,
    `${(award.winRate * 100).toFixed(1)}% WIN`,
    `${award.roiPct >= 0 ? "+" : ""}${award.roiPct.toFixed(1)}% ROI`,
    `${award.picksCount} GRADED PICKS`,
  ];
  const chartUri = trajectoryChartUri(award.trajectory, 1200, 330);
  const bigAvatar = variant === "b";
  const avatarSize = bigAvatar ? 208 : 120;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: BG,
        color: TEXT,
        overflow: "hidden",
      }}
    >
      {/* the capper's actual month, full-bleed along the bottom */}
      {chartUri ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={chartUri}
          alt=""
          width={1200}
          height={330}
          style={{ position: "absolute", left: 0, bottom: 0, width: 1200, height: 330 }}
        />
      ) : null}

      {/* scrims: quiet the chart under the headline (left) and the stat row
          (bottom) so type never fights the line */}
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: 760,
          height: 330,
          display: "flex",
          background:
            "linear-gradient(90deg, rgba(10,10,12,0.94) 0%, rgba(10,10,12,0.62) 48%, rgba(10,10,12,0) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: 1200,
          height: 128,
          display: "flex",
          background: "linear-gradient(180deg, rgba(10,10,12,0) 0%, rgba(10,10,12,0.94) 72%)",
        }}
      />

      {/* brand bar */}
      <div style={{ display: "flex", height: 6, background: BRAND_BAR }} />

      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "38px 60px 0 60px",
        }}
      >
        {logoUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUri} alt="TailSlips" height={42} style={{ height: 42 }} />
        ) : (
          <div style={{ display: "flex", fontSize: 28, fontWeight: 900, color: MINT }}>TAILSLIPS</div>
        )}
        <div
          style={{
            display: "flex",
            fontSize: 16,
            color: TEXT_MUTED,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          {`Monthly Award · ${award.monthLabel}`}
        </div>
      </div>

      {/* headline block */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "36px 60px 0 60px",
          paddingRight: bigAvatar ? 320 : 60,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 800,
            color: pill.color,
            letterSpacing: 3.2,
            textTransform: "uppercase",
          }}
        >
          {`#${award.rank} ${category.headline}`}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 8,
            fontSize: 64,
            fontWeight: 900,
            letterSpacing: -1.5,
            color: TEXT,
          }}
        >
          {`@${award.handle}`}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 26,
            fontSize: 16,
            color: TEXT_MUTED,
            fontWeight: 700,
            letterSpacing: 2.8,
            textTransform: "uppercase",
          }}
        >
          {`Net profit · ${award.monthLabel}`}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 2,
            fontSize: 132,
            fontWeight: 900,
            letterSpacing: -5,
            lineHeight: 1,
            color: unitsColor,
          }}
        >
          {`${units}u`}
        </div>
      </div>

      {/* avatar */}
      <div
        style={{
          position: "absolute",
          top: bigAvatar ? 148 : 122,
          right: 60,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {avatarUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUri}
            alt=""
            width={avatarSize}
            height={avatarSize}
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: 18,
              objectFit: "cover",
              border: bigAvatar ? `2px solid ${pill.border}` : `1px solid ${BORDER}`,
            }}
          />
        ) : (
          <div
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: 18,
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${BORDER}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: avatarSize / 2.4,
              color: TEXT_MUTED,
              fontWeight: 900,
            }}
          >
            {award.displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
        {bigAvatar ? (
          <div
            style={{
              display: "flex",
              marginTop: 12,
              padding: "8px 14px",
              borderRadius: 8,
              background: pill.bg,
              border: `1px solid ${pill.border}`,
              color: pill.color,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {`#${award.rank}`}
          </div>
        ) : null}
      </div>

      {/* bottom row over the chart */}
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          bottom: 28,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 21,
              fontWeight: 800,
              color: TEXT,
              letterSpacing: 2.2,
            }}
          >
            {statLine.map((part, i) => (
              <div key={i} style={{ display: "flex" }}>
                {i > 0 ? (
                  <div style={{ display: "flex", margin: "0 14px", color: "rgba(255,255,255,0.30)" }}>·</div>
                ) : null}
                {part}
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 9,
              fontSize: 13,
              color: TEXT_MUTED,
              letterSpacing: 1.7,
              textTransform: "uppercase",
            }}
          >
            {`${category.footnote} · Awarded ${award.issuedAt}`}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 15,
            color: MINT,
            fontWeight: 800,
            letterSpacing: 2.4,
            textTransform: "uppercase",
          }}
        >
          tailslips.com
        </div>
      </div>
    </div>
  );
}

export async function renderAwardOg(
  slug: string,
  opts: { debug?: boolean; variant?: AwardVariant } = {},
): Promise<Response> {
  const award = getAward(slug);
  if (!award) {
    const img = new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: BG,
          }}
        >
          <div style={{ display: "flex", height: 6, background: BRAND_BAR }} />
          <div
            style={{
              flex: 1,
              display: "flex",
              color: TEXT,
              alignItems: "center",
              justifyContent: "center",
              fontSize: 56,
              fontWeight: 900,
            }}
          >
            TailSlips Monthly Awards
          </div>
        </div>
      ),
      { ...size },
    );
    const buf = await img.arrayBuffer();
    return new Response(buf, {
      headers: { "content-type": "image/png", "cache-control": "no-store, max-age=0" },
    });
  }

  const [avatarUri, logoFsUri] = await Promise.all([
    imageDataUri(award.avatarUrl),
    readPublicPngDataUri("logo-horizontal-aligned-tight.png"),
  ]);
  // The fs read can miss in the serverless bundle (public/ isn't traced for
  // this route); fall back to fetching the deployed asset.
  const logoUri =
    logoFsUri ?? (await imageDataUri("https://tailslips.com/logo-horizontal-aligned-tight.png"));

  try {
    const img = new ImageResponse(awardCard(award, avatarUri, logoUri, opts.variant ?? "a"), { ...size });
    const buf = await img.arrayBuffer();
    return new Response(buf, {
      headers: {
        "content-type": "image/png",
        // Award data is frozen in the registry, so long cache is safe.
        "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error("[award-og-renderer] ImageResponse failed", err);
    if (opts.debug) {
      const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
      return new Response(msg, {
        status: 500,
        headers: { "content-type": "text/plain", "cache-control": "no-store, max-age=0" },
      });
    }
    const fallback = new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: BG,
          }}
        >
          <div style={{ display: "flex", height: 6, background: BRAND_BAR }} />
          <div
            style={{
              flex: 1,
              display: "flex",
              color: TEXT,
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
              fontWeight: 900,
            }}
          >
            {`TailSlips Monthly Award · @${award.handle}`}
          </div>
        </div>
      ),
      { ...size },
    );
    const buf = await fallback.arrayBuffer();
    return new Response(buf, {
      headers: { "content-type": "image/png", "cache-control": "no-store, max-age=0" },
    });
  }
}
