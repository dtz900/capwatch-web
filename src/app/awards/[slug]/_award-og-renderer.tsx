import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { AWARD_CATEGORIES, getAward, type MonthlyAward } from "@/lib/awards";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "TailSlips monthly capper award";

const BG = "#0b0d11";

/** Podium metals. #1 shares the Parlay Palace gold-foil family (gold surface =
 * hall of fame); #2 and #3 step down to silver and bronze, mirroring the
 * leaderboard podium so climbing to the gold card means something. */
interface Metal {
  foil: string;
  unitsGradient: string;
  accent: string;
  light: string;
  deep: string;
  badgeText: string;
  glow: string;
}

const METALS: Record<number, Metal> = {
  1: {
    foil: "linear-gradient(135deg,#caa45a 0%,#f3e3b3 22%,#9c7a36 46%,#e9cf93 68%,#8a6e3a 100%)",
    unitsGradient: "linear-gradient(180deg,#fdf3d6 0%,#e9cf93 42%,#c7a259 100%)",
    accent: "#caa45a",
    light: "#e3c787",
    deep: "#c7a259",
    badgeText: "#241a08",
    glow: "202,164,90",
  },
  2: {
    foil: "linear-gradient(135deg,#8f97a3 0%,#eef1f5 22%,#666e79 46%,#d9dee5 68%,#565d66 100%)",
    unitsGradient: "linear-gradient(180deg,#ffffff 0%,#d9dee5 42%,#98a1ad 100%)",
    accent: "#aab2bd",
    light: "#d3d9e0",
    deep: "#8f97a3",
    badgeText: "#14171c",
    glow: "170,178,189",
  },
  3: {
    foil: "linear-gradient(135deg,#a2683a 0%,#e7b98c 22%,#7d4e28 46%,#d9a06b 68%,#66421f 100%)",
    unitsGradient: "linear-gradient(180deg,#f6e2cd 0%,#d9a06b 42%,#a2683a 100%)",
    accent: "#c8814a",
    light: "#dfb088",
    deep: "#a2683a",
    badgeText: "#241304",
    glow: "200,129,74",
  },
};

const TEXT_SOFT = "rgba(255,255,255,0.82)";
const TEXT_FAINT = "rgba(255,255,255,0.45)";

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

function awardCard(award: MonthlyAward, avatarUri: string | null, crownUri: string | null) {
  const metal = METALS[award.rank] ?? METALS[3];
  const category = AWARD_CATEGORIES[award.category];
  const record = `${award.wins}-${award.losses}${award.pushes ? `-${award.pushes}` : ""}`;
  const winPct = `${(award.winRate * 100).toFixed(1)}%`;
  const roi = `${award.roiPct >= 0 ? "+" : ""}${award.roiPct.toFixed(1)}% ROI`;
  const metaParts = [record, `${winPct} WIN`, roi, `${award.picksCount} GRADED PICKS`];

  return (
    // foil frame
    <div style={{ width: "100%", height: "100%", display: "flex", background: metal.foil, padding: 6 }}>
      {/* inner card */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          background: BG,
          overflow: "hidden",
        }}
      >
        {/* atmosphere */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: `radial-gradient(circle at 18% 12%,rgba(${metal.glow},0.20),transparent 34%),radial-gradient(circle at 88% 92%,rgba(${metal.glow},0.12),transparent 40%),linear-gradient(135deg,#11141a,#07080b)`,
          }}
        />

        {/* kicker (top-left) */}
        <div style={{ position: "absolute", top: 52, left: 60, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 20,
              color: metal.light,
              fontWeight: 800,
              letterSpacing: 5,
              textTransform: "uppercase",
            }}
          >
            TailSlips · Monthly Award
          </div>
          <div style={{ display: "flex", marginTop: 10, width: 56, height: 2, background: metal.accent }} />
          <div
            style={{
              display: "flex",
              marginTop: 12,
              fontSize: 17,
              color: "#fff",
              fontWeight: 700,
              letterSpacing: 3.5,
              textTransform: "uppercase",
            }}
          >
            {award.monthLabel}
          </div>
        </div>

        {/* tailslips.com (top-right) */}
        <div
          style={{
            position: "absolute",
            top: 56,
            right: 60,
            fontSize: 18,
            color: metal.accent,
            fontWeight: 800,
            letterSpacing: 4,
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          tailslips.com
        </div>

        {/* avatar with rank badge (right side) */}
        <div
          style={{
            position: "absolute",
            top: 178,
            right: 96,
            display: "flex",
            width: 216,
            height: 216,
          }}
        >
          {avatarUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUri}
              alt=""
              width={216}
              height={216}
              style={{
                width: 216,
                height: 216,
                borderRadius: 999,
                objectFit: "cover",
                border: `5px solid ${metal.accent}`,
                boxShadow: `0 0 0 10px rgba(${metal.glow},0.14), 0 0 60px rgba(${metal.glow},0.35)`,
              }}
            />
          ) : (
            <div
              style={{
                width: 216,
                height: 216,
                borderRadius: 999,
                background: "#171b22",
                border: `5px solid ${metal.accent}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 84,
                color: metal.light,
                fontWeight: 900,
              }}
            >
              {award.displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          {crownUri && award.rank === 1 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={crownUri}
              alt=""
              width={96}
              height={96}
              style={{
                position: "absolute",
                top: -58,
                left: -30,
                width: 96,
                height: 96,
                transform: "rotate(-24deg)",
                filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.7))",
              }}
            />
          ) : null}
          {/* rank badge pinned to the avatar */}
          <div
            style={{
              position: "absolute",
              bottom: -6,
              right: -6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 74,
              height: 74,
              borderRadius: 999,
              background: metal.foil,
              color: metal.badgeText,
              fontSize: 34,
              fontWeight: 900,
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            }}
          >
            {`#${award.rank}`}
          </div>
        </div>

        {/* headline block (left, bottom-anchored) */}
        <div style={{ position: "absolute", left: 60, right: 380, bottom: 52, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 58,
              fontWeight: 900,
              color: "#fff",
              letterSpacing: -1,
              lineHeight: 1,
            }}
          >
            {`#${award.rank} ${category.headline}`}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 10,
              fontSize: 34,
              fontWeight: 800,
              color: metal.light,
            }}
          >
            {`@${award.handle}`}
          </div>

          {/* focal units */}
          <div style={{ display: "flex", alignItems: "flex-end", marginTop: 18 }}>
            <div
              style={{
                fontSize: 168,
                fontWeight: 900,
                letterSpacing: -6,
                lineHeight: 0.9,
                backgroundImage: metal.unitsGradient,
                backgroundClip: "text",
                color: "transparent",
                display: "flex",
              }}
            >
              {formatUnits(award.unitsProfit)}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 60,
                fontWeight: 900,
                marginLeft: 10,
                marginBottom: 18,
                color: metal.deep,
              }}
            >
              u
            </div>
          </div>

          {/* meta row */}
          <div
            style={{
              display: "flex",
              marginTop: 16,
              fontSize: 21,
              color: TEXT_SOFT,
              fontWeight: 800,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {metaParts.map((part, i) => (
              <div key={i} style={{ display: "flex" }}>
                {i > 0 ? (
                  <div style={{ display: "flex", margin: "0 14px", color: "rgba(255,255,255,0.32)" }}>·</div>
                ) : null}
                {part}
              </div>
            ))}
          </div>

          {/* footnote */}
          <div
            style={{
              display: "flex",
              marginTop: 14,
              fontSize: 15,
              color: TEXT_FAINT,
              letterSpacing: 2.2,
              textTransform: "uppercase",
            }}
          >
            {category.footnote}
          </div>
        </div>
      </div>
    </div>
  );
}

export async function renderAwardOg(slug: string): Promise<Response> {
  const award = getAward(slug);
  if (!award) {
    const img = new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            background: METALS[1].foil,
            padding: 6,
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              background: BG,
              color: "#fff",
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

  const [avatarUri, crownFsUri] = await Promise.all([
    imageDataUri(award.avatarUrl),
    readPublicPngDataUri("parlay-palace-crown.png"),
  ]);
  // The fs read can miss in the serverless bundle (public/ isn't traced for
  // this route); fall back to fetching the deployed asset.
  const crownUri =
    crownFsUri ?? (await imageDataUri("https://tailslips.com/parlay-palace-crown.png"));

  const img = new ImageResponse(awardCard(award, avatarUri, crownUri), { ...size });
  const buf = await img.arrayBuffer();
  return new Response(buf, {
    headers: {
      "content-type": "image/png",
      // Award data is frozen in the registry, so long cache is safe.
      "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
