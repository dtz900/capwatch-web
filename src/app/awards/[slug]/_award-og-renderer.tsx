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

function awardCard(award: MonthlyAward, avatarUri: string | null, logoUri: string | null) {
  const pill = RANK_PILLS[award.rank] ?? RANK_PILLS[3];
  const category = AWARD_CATEGORIES[award.category];
  const units = `${award.unitsProfit >= 0 ? "+" : ""}${award.unitsProfit.toFixed(1)}`;
  const unitsColor = award.unitsProfit >= 0 ? POS : NEG;
  const stats = [
    { label: "Record", value: `${award.wins}-${award.losses}${award.pushes ? `-${award.pushes}` : ""}` },
    { label: "Win rate", value: `${(award.winRate * 100).toFixed(1)}%` },
    { label: "ROI", value: `${award.roiPct >= 0 ? "+" : ""}${award.roiPct.toFixed(1)}%` },
    { label: "Graded picks", value: String(award.picksCount) },
  ];

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

      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "34px 64px",
          borderBottom: `1px solid ${BORDER}`,
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
            fontSize: 17,
            color: TEXT_MUTED,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          {`Monthly Award · ${award.monthLabel}`}
        </div>
      </div>

      {/* body */}
      <div style={{ flex: 1, display: "flex", padding: "44px 64px 0 64px" }}>
        {/* left: identity + focal number */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* rank pill */}
          <div style={{ display: "flex" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 18px",
                borderRadius: 8,
                background: pill.bg,
                border: `1px solid ${pill.border}`,
                color: pill.color,
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: 2.5,
                textTransform: "uppercase",
              }}
            >
              {`#${award.rank} ${category.headline}`}
            </div>
          </div>

          {/* handle */}
          <div style={{ display: "flex", marginTop: 24 }}>
            <div style={{ display: "flex", fontSize: 52, fontWeight: 900, letterSpacing: -1, color: TEXT }}>
              {`@${award.handle}`}
            </div>
          </div>

          {/* focal units */}
          <div style={{ display: "flex", alignItems: "flex-end", marginTop: 8 }}>
            <div
              style={{
                display: "flex",
                fontSize: 172,
                fontWeight: 900,
                letterSpacing: -7,
                lineHeight: 1,
                color: unitsColor,
              }}
            >
              {units}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 56,
                fontWeight: 800,
                marginLeft: 8,
                marginBottom: 16,
                color: unitsColor,
                opacity: 0.75,
              }}
            >
              u
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 20,
                fontWeight: 700,
                marginLeft: 22,
                marginBottom: 26,
                color: TEXT_MUTED,
                letterSpacing: 2.5,
                textTransform: "uppercase",
              }}
            >
              Net profit
            </div>
          </div>
        </div>

        {/* right: avatar plaque */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          {avatarUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUri}
              alt=""
              width={184}
              height={184}
              style={{
                width: 184,
                height: 184,
                borderRadius: 16,
                objectFit: "cover",
                border: `1px solid ${BORDER}`,
              }}
            />
          ) : (
            <div
              style={{
                width: 184,
                height: 184,
                borderRadius: 16,
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${BORDER}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 72,
                color: TEXT_MUTED,
                fontWeight: 900,
              }}
            >
              {award.displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div
            style={{
              display: "flex",
              marginTop: 14,
              fontSize: 17,
              color: TEXT_MUTED,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {`Awarded ${award.issuedAt}`}
          </div>
        </div>
      </div>

      {/* stat band */}
      <div
        style={{
          display: "flex",
          margin: "0 64px",
          borderTop: `1px solid ${BORDER}`,
          padding: "26px 0",
        }}
      >
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            style={{
              display: "flex",
              flexDirection: "column",
              paddingRight: 56,
              paddingLeft: i > 0 ? 56 : 0,
              // satori calls .trim() on border values; an undefined key crashes
              // the whole render, so only set the property when it exists.
              ...(i > 0 ? { borderLeft: `1px solid ${BORDER}` } : {}),
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 15,
                color: TEXT_MUTED,
                fontWeight: 700,
                letterSpacing: 2.4,
                textTransform: "uppercase",
              }}
            >
              {stat.label}
            </div>
            <div style={{ display: "flex", marginTop: 8, fontSize: 36, fontWeight: 800, color: TEXT }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 64px 30px 64px",
          borderTop: `1px solid ${BORDER}`,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 15,
            color: TEXT_MUTED,
            letterSpacing: 1.8,
            textTransform: "uppercase",
          }}
        >
          {category.footnote}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 16,
            color: MINT,
            fontWeight: 800,
            letterSpacing: 2.5,
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
  opts: { debug?: boolean } = {},
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
    const img = new ImageResponse(awardCard(award, avatarUri, logoUri), { ...size });
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
