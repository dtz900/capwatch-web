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

/** Podium medals: metallic medallion disc per rank. */
const MEDALS: Record<number, { grad: string; ring: string; numeral: string; label: string }> = {
  1: {
    grad: "linear-gradient(135deg,#ffe9a8 0%,#f5c54a 46%,#a9760c 100%)",
    ring: "#ffe9a8",
    numeral: "#4a3608",
    label: "#f5c54a",
  },
  2: {
    grad: "linear-gradient(135deg,#ffffff 0%,#cfd4da 46%,#7c848f 100%)",
    ring: "#ffffff",
    numeral: "#2c3038",
    label: "#d4d4d8",
  },
  3: {
    grad: "linear-gradient(135deg,#f3d3b0 0%,#c8814a 46%,#78451f 100%)",
    ring: "#f3d3b0",
    numeral: "#3a2210",
    label: "#c8814a",
  },
};

/** Metallic medallion as an SVG data-uri: sunburst rim, laurel wreath, star,
 * radial sheen. Shapes only (the OG renderer can't lay out SVG <text>); the
 * rank numeral is layered over it as real text in the card. */
const MEDAL_METALS: Record<number, { light: string; base: string; dark: string; deep: string; rim1: string; rim2: string; leaf: string }> = {
  1: { light: "#fff2c8", base: "#f3c34a", dark: "#b3810f", deep: "#7a5608", rim1: "#ecc05a", rim2: "#a9760c", leaf: "#f0d488" },
  2: { light: "#ffffff", base: "#d6dae0", dark: "#8b93a0", deep: "#565d68", rim1: "#e2e6ea", rim2: "#8b93a0", leaf: "#eef1f4" },
  3: { light: "#f8ddbb", base: "#cf8850", dark: "#8a5227", deep: "#5c3416", rim1: "#dda06a", rim2: "#8a5227", leaf: "#e6b384" },
};

function buildMedalSvg(rank: number): string {
  const m = MEDAL_METALS[rank] ?? MEDAL_METALS[3];
  const S = 120;
  const cx = 60;
  const cy = 60;
  const outerR = 55;
  const innerR = 47;
  const discR = 44;

  // sunburst rim
  const teeth = 22;
  const total = teeth * 2;
  const rimPts: string[] = [];
  for (let i = 0; i < total; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i / total) * Math.PI * 2 - Math.PI / 2;
    rimPts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }

  // laurel wreath: five leaves per side, mirrored across the vertical axis
  const leafR = 31;
  const leafAngles = [118, 140, 162, 184, 206];
  const leaves: string[] = [];
  for (const A of leafAngles) {
    const rad = (A * Math.PI) / 180;
    const x = cx + leafR * Math.cos(rad);
    const y = cy + leafR * Math.sin(rad);
    const rot = A + 90;
    leaves.push(
      `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="7" ry="3" fill="${m.leaf}" opacity="0.92" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`,
    );
    const x2 = 2 * cx - x;
    leaves.push(
      `<ellipse cx="${x2.toFixed(1)}" cy="${y.toFixed(1)}" rx="7" ry="3" fill="${m.leaf}" opacity="0.92" transform="rotate(${(-rot).toFixed(1)} ${x2.toFixed(1)} ${y.toFixed(1)})"/>`,
    );
  }

  // star at top center
  const starPts: string[] = [];
  const scx = cx;
  const scy = cy - 31;
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 7 : 3;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    starPts.push(`${(scx + r * Math.cos(a)).toFixed(1)},${(scy + r * Math.sin(a)).toFixed(1)}`);
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">` +
    `<defs>` +
    `<radialGradient id="disc" cx="38%" cy="32%" r="72%">` +
    `<stop offset="0%" stop-color="${m.light}"/>` +
    `<stop offset="52%" stop-color="${m.base}"/>` +
    `<stop offset="100%" stop-color="${m.dark}"/>` +
    `</radialGradient>` +
    `<linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="${m.rim1}"/>` +
    `<stop offset="100%" stop-color="${m.rim2}"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<polygon points="${rimPts.join(" ")}" fill="url(#rim)" stroke="${m.rim2}" stroke-width="1"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${discR}" fill="url(#disc)" stroke="${m.deep}" stroke-width="1.5"/>` +
    `<circle cx="${cx}" cy="${cy}" r="36" fill="none" stroke="${m.deep}" stroke-width="1.5" opacity="0.5"/>` +
    `<circle cx="${cx}" cy="${cy}" r="33.5" fill="none" stroke="${m.light}" stroke-width="1" opacity="0.5"/>` +
    leaves.join("") +
    `<polygon points="${starPts.join(" ")}" fill="${m.light}"/>` +
    `<ellipse cx="44" cy="40" rx="22" ry="13" fill="#ffffff" opacity="0.16"/>` +
    `</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

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

/** Frozen trajectory -> SVG data-uri for a dedicated chart BAND of height h.
 * The zero line sits at a fixed elevation inside the band so wins climb and
 * drawdowns dip, with a reserved label strip at the very bottom. Returns the
 * zero-line y so the card can draw a crisp axis + labels over the band. */
function trajectoryChart(
  series: number[],
  w: number,
  h: number,
): { uri: string; zeroY: number } | null {
  if (series.length < 2) return null;
  const points = [0, ...series];
  const last = points[points.length - 1];
  const min = Math.min(0, ...points);
  const max = Math.max(0.001, ...points);

  const padX = 0;
  const padRight = 6;
  const padTop = 20;
  const labelStrip = 34; // reserved at the bottom for JUN 1 / JUN 30
  const drawdownRoom = 46; // space below the axis for losing stretches
  const zeroY = h - labelStrip - drawdownRoom;
  const posScale = (zeroY - padTop) / max;
  const negScale = min < 0 ? Math.min(posScale, (drawdownRoom - 6) / -min) : 0;
  const innerW = w - padX - padRight;
  const stepX = innerW / (points.length - 1);
  const yFor = (v: number) => (v >= 0 ? zeroY - v * posScale : zeroY - v * negScale);

  const linePts = points.map((v, i) => `${(padX + i * stepX).toFixed(2)},${yFor(v).toFixed(2)}`);
  const line = "M" + linePts.join(" L");
  const lastX = padX + (points.length - 1) * stepX;
  const lastY = yFor(last);
  const area =
    `M${padX},${zeroY.toFixed(2)} L` + linePts.join(" L") + ` L${lastX.toFixed(2)},${zeroY.toFixed(2)} Z`;
  const stroke = last >= 0 ? "#19f57c" : "#ef4444";
  const fillRgb = last >= 0 ? "25,245,124" : "239,68,68";

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="rgba(${fillRgb},0.28)"/>` +
    `<stop offset="100%" stop-color="rgba(${fillRgb},0.02)"/>` +
    `</linearGradient></defs>` +
    `<path d="${area}" fill="url(#g)"/>` +
    `<path d="${line}" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` +
    `<circle cx="${lastX.toFixed(2)}" cy="${lastY.toFixed(2)}" r="5" fill="${stroke}"/>` +
    `<circle cx="${lastX.toFixed(2)}" cy="${lastY.toFixed(2)}" r="11" fill="${stroke}" opacity="0.2"/>` +
    `</svg>`;
  return { uri: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`, zeroY };
}

export type AwardVariant = "a" | "b";

const MONTH_ABBR = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

function awardCard(
  award: MonthlyAward,
  avatarUri: string | null,
  logoUri: string | null,
  _variant: AwardVariant = "a",
) {
  const pill = RANK_PILLS[award.rank] ?? RANK_PILLS[3];
  const medal = MEDALS[award.rank] ?? MEDALS[3];
  const medalUri = buildMedalSvg(award.rank);
  const category = AWARD_CATEGORIES[award.category];
  const units = `${award.unitsProfit >= 0 ? "+" : ""}${award.unitsProfit.toFixed(1)}`;
  const unitsColor = award.unitsProfit >= 0 ? POS : NEG;
  const record = `${award.wins}-${award.losses}${award.pushes ? `-${award.pushes}` : ""}`;
  const stats = [
    { label: "Record", value: record },
    { label: "Win rate", value: `${(award.winRate * 100).toFixed(1)}%` },
    { label: "ROI", value: `${award.roiPct >= 0 ? "+" : ""}${award.roiPct.toFixed(1)}%` },
    { label: "Graded picks", value: String(award.picksCount) },
  ];

  const CHART_H = 250;
  const chart = trajectoryChart(award.trajectory, 1200, CHART_H);

  // Axis labels: first and last day of the award month.
  const [y, m] = award.month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const startLabel = `${MONTH_ABBR[m - 1]} 1`;
  const endLabel = `${MONTH_ABBR[m - 1]} ${lastDay}`;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: BG,
        color: TEXT,
      }}
    >
      {/* brand bar */}
      <div style={{ display: "flex", height: 6, background: BRAND_BAR }} />

      {/* ===== TEXT ZONE (solid black, nothing overlaps the chart) ===== */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "40px 60px 26px 60px",
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          {logoUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUri} alt="TailSlips" height={40} style={{ height: 40 }} />
          ) : (
            <div style={{ display: "flex", fontSize: 28, fontWeight: 900, color: MINT }}>TAILSLIPS</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
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
            <div
              style={{
                display: "flex",
                marginTop: 7,
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

        {/* identity + avatar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 30,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* podium medallion (SVG art + numeral overlay) */}
            <div style={{ position: "relative", display: "flex", width: 104, height: 104 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={medalUri} alt="" width={104} height={104} style={{ width: 104, height: 104 }} />
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 104,
                  height: 104,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 44,
                  fontWeight: 900,
                  letterSpacing: -2,
                  color: medal.numeral,
                  textShadow: "0 1px 0 rgba(255,255,255,0.45)",
                }}
              >
                {award.rank}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 22 }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 18,
                  fontWeight: 800,
                  color: medal.label,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                }}
              >
                {`#${award.rank} ${category.headline}`}
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: 6,
                  fontSize: 52,
                  fontWeight: 900,
                  letterSpacing: -1.5,
                  color: TEXT,
                }}
              >
                {`@${award.handle}`}
              </div>
            </div>
          </div>
          {avatarUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUri}
              alt=""
              width={104}
              height={104}
              style={{ width: 104, height: 104, borderRadius: 16, objectFit: "cover", border: `1px solid ${BORDER}` }}
            />
          ) : (
            <div
              style={{
                width: 104,
                height: 104,
                borderRadius: 16,
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${BORDER}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 44,
                color: TEXT_MUTED,
                fontWeight: 900,
              }}
            >
              {award.displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        {/* net profit + inline stats, pinned to the bottom of the text zone */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginTop: "auto",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 15,
                color: TEXT_MUTED,
                fontWeight: 700,
                letterSpacing: 2.8,
                textTransform: "uppercase",
              }}
            >
              Net profit
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 2,
                fontSize: 92,
                fontWeight: 900,
                letterSpacing: -4,
                lineHeight: 1,
                color: unitsColor,
              }}
            >
              {`${units}u`}
            </div>
          </div>
          <div style={{ display: "flex", marginBottom: 8 }}>
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  paddingLeft: i > 0 ? 34 : 0,
                  marginLeft: i > 0 ? 34 : 0,
                  ...(i > 0 ? { borderLeft: `1px solid ${BORDER}` } : {}),
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 13,
                    color: TEXT_MUTED,
                    fontWeight: 700,
                    letterSpacing: 1.8,
                    textTransform: "uppercase",
                  }}
                >
                  {stat.label}
                </div>
                <div style={{ display: "flex", marginTop: 6, fontSize: 30, fontWeight: 800, color: TEXT }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== CHART ZONE (its own band; only the draw + axis live here) ===== */}
      <div
        style={{
          position: "relative",
          display: "flex",
          width: 1200,
          height: CHART_H,
          borderTop: `1px solid ${BORDER}`,
          overflow: "hidden",
        }}
      >
        {chart ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={chart.uri}
            alt=""
            width={1200}
            height={CHART_H}
            style={{ position: "absolute", left: 0, top: 0, width: 1200, height: CHART_H }}
          />
        ) : null}
        {/* crisp x-axis at zero */}
        {chart ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              width: 1200,
              top: chart.zeroY,
              height: 1,
              display: "flex",
              background: "rgba(247,243,233,0.16)",
            }}
          />
        ) : null}
        {/* axis labels */}
        <div
          style={{
            position: "absolute",
            left: 60,
            bottom: 12,
            display: "flex",
            fontSize: 14,
            color: TEXT_MUTED,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {startLabel}
        </div>
        <div
          style={{
            position: "absolute",
            right: 60,
            bottom: 12,
            display: "flex",
            fontSize: 14,
            color: TEXT_MUTED,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {endLabel}
        </div>
        {/* footnote sits on the divider, left side */}
        <div
          style={{
            position: "absolute",
            left: 60,
            top: 14,
            display: "flex",
            fontSize: 13,
            color: TEXT_MUTED,
            letterSpacing: 1.6,
            textTransform: "uppercase",
          }}
        >
          {`${category.footnote} · Awarded ${award.issuedAt}`}
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
