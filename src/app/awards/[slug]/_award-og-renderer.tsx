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

/** Frozen trajectory -> SVG data-uri, mirroring the profile hero sparkline
 * (RecentTrajectory) exactly, scaled to card size: full-resolution series with
 * a prepended 0, zero-anchored area fill, thin line, dashed zero baseline,
 * dot + halo endpoint. The ceiling (padTop) keeps any line out of the
 * headline zone. */
function trajectoryChart(
  series: number[],
  w: number,
  h: number,
): { uri: string; zeroY: number } | null {
  if (series.length < 2) return null;
  const points = [0, ...series];
  const last = points[points.length - 1];
  const min = Math.min(0, ...points);
  const max = Math.max(0, ...points);
  const range = max - min || 1;
  const padX = 2;
  const padRight = 9;
  const padTop = 24;
  const padBottom = 8;
  const innerW = w - padX - padRight;
  const innerH = h - padTop - padBottom;
  const stepX = innerW / (points.length - 1);
  const yFor = (v: number) => padTop + innerH - ((v - min) / range) * innerH;
  const zeroY = yFor(0);
  const linePts = points.map((v, i) => `${(padX + i * stepX).toFixed(2)},${yFor(v).toFixed(2)}`);
  const line = "M" + linePts.join(" L");
  const lastX = padX + (points.length - 1) * stepX;
  const area =
    `M${padX},${zeroY.toFixed(2)} L` + linePts.join(" L") + ` L${lastX.toFixed(2)},${zeroY.toFixed(2)} Z`;
  const lastY = yFor(last);
  const posColor = "#19f57c";
  const negColor = "#ef4444";
  const stroke = last >= 0 ? posColor : negColor;
  const fillRgb = last >= 0 ? "25,245,124" : "239,68,68";
  // The draw sits behind the content: line and fill at reduced alpha, a
  // clear solid x-axis anchoring it, and only the endpoint dot at full
  // brightness so the month still "arrives" at the number.
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="rgba(${fillRgb},0.11)"/>` +
    `<stop offset="100%" stop-color="rgba(${fillRgb},0)"/>` +
    `</linearGradient></defs>` +
    `<path d="${area}" fill="url(#g)"/>` +
    `<path d="${line}" fill="none" stroke="rgba(${fillRgb},0.48)" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round"/>` +
    `<circle cx="${lastX.toFixed(2)}" cy="${lastY.toFixed(2)}" r="4.5" fill="${stroke}"/>` +
    `<circle cx="${lastX.toFixed(2)}" cy="${lastY.toFixed(2)}" r="10" fill="${stroke}" opacity="0.18"/>` +
    `</svg>`;
  return { uri: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`, zeroY };
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
  const chart = trajectoryChart(award.trajectory, 1200, 360);
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
      {chart ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={chart.uri}
          alt=""
          width={1200}
          height={360}
          style={{ position: "absolute", left: 0, bottom: 0, width: 1200, height: 360 }}
        />
      ) : null}

      {/* gentle bottom scrim for the stat row */}
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: 1200,
          height: 84,
          display: "flex",
          background: "linear-gradient(180deg, rgba(10,10,12,0) 0%, rgba(10,10,12,0.62) 85%)",
        }}
      />
      {chart ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            width: 1200,
            bottom: 360 - chart.zeroY - 2,
            height: 2,
            display: "flex",
            background: "rgba(247,243,233,0.55)",
          }}
        />
      ) : null}

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

      {/* stat line + footnote pinned to the bottom, riding over the draw */}
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          bottom: 26,
          display: "flex",
          flexDirection: "column",
        }}
      >
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
        <div style={{ display: "flex", marginTop: 9, alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              fontSize: 13,
              color: TEXT_MUTED,
              letterSpacing: 1.7,
              textTransform: "uppercase",
            }}
          >
            {`${category.footnote} · Awarded ${award.issuedAt} ·`}
          </div>
          <div
            style={{
              display: "flex",
              marginLeft: 8,
              fontSize: 13,
              color: MINT,
              fontWeight: 800,
              letterSpacing: 1.9,
              textTransform: "uppercase",
            }}
          >
            tailslips.com
          </div>
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
