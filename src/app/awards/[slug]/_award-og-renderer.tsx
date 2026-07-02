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
  // Ticket geometry. The slip sits inset on its own canvas so the punched
  // notches and perforation always cut into a surface we control, regardless
  // of where the image is displayed (feed, page, DM, light mode).
  const CANVAS = "#04070b";
  const CANVAS_PAD = 26;
  const TICKET_W = 1200 - CANVAS_PAD * 2;
  const STUB_W = 300;
  const PUNCH = CANVAS;
  const TICKET = "#0e1218";
  const perforation = Array.from({ length: 22 });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: CANVAS,
        padding: CANVAS_PAD,
      }}
    >
    <div
      style={{
        flex: 1,
        display: "flex",
        position: "relative",
        background: TICKET,
        color: TEXT,
        overflow: "hidden",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* main section */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "40px 52px 34px 54px",
        }}
      >
        {/* header: logo + award line */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {logoUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUri} alt="TailSlips" height={40} style={{ height: 40 }} />
          ) : (
            <div style={{ display: "flex", fontSize: 26, fontWeight: 900, color: MINT }}>TAILSLIPS</div>
          )}
          <div
            style={{
              display: "flex",
              fontSize: 15,
              color: TEXT_MUTED,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            Monthly Award
          </div>
        </div>

        {/* identity */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 32 }}>
          <div
            style={{
              display: "flex",
              fontSize: 20,
              fontWeight: 800,
              color: pill.color,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {`#${award.rank} ${category.headline} · ${award.monthLabel}`}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 10,
              fontSize: 56,
              fontWeight: 900,
              letterSpacing: -1.5,
              color: TEXT,
            }}
          >
            {`@${award.handle}`}
          </div>
        </div>

        {/* focal number */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 30 }}>
          <div
            style={{
              display: "flex",
              fontSize: 15,
              color: TEXT_MUTED,
              fontWeight: 700,
              letterSpacing: 2.6,
              textTransform: "uppercase",
            }}
          >
            Net profit
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 4,
              fontSize: 106,
              fontWeight: 900,
              letterSpacing: -4,
              lineHeight: 1,
              color: unitsColor,
            }}
          >
            {`${units}u`}
          </div>
        </div>

        {/* stat row */}
        <div
          style={{
            display: "flex",
            marginTop: 30,
            paddingTop: 24,
            borderTop: `1px solid ${BORDER}`,
          }}
        >
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                paddingRight: 44,
                paddingLeft: i > 0 ? 44 : 0,
                ...(i > 0 ? { borderLeft: `1px solid ${BORDER}` } : {}),
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 14,
                  color: TEXT_MUTED,
                  fontWeight: 700,
                  letterSpacing: 2.2,
                  textTransform: "uppercase",
                }}
              >
                {stat.label}
              </div>
              <div style={{ display: "flex", marginTop: 7, fontSize: 32, fontWeight: 800, color: TEXT }}>
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
            marginTop: 26,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 13,
              color: TEXT_MUTED,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              marginRight: 28,
            }}
          >
            {category.footnote}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 14,
              color: MINT,
              fontWeight: 800,
              letterSpacing: 2.2,
              textTransform: "uppercase",
            }}
          >
            tailslips.com
          </div>
        </div>
      </div>

      {/* stub */}
      <div
        style={{
          width: STUB_W,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: pill.bg,
          position: "relative",
        }}
      >
        {avatarUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUri}
            alt=""
            width={158}
            height={158}
            style={{
              width: 158,
              height: 158,
              borderRadius: 16,
              objectFit: "cover",
              border: `2px solid ${pill.border}`,
            }}
          />
        ) : (
          <div
            style={{
              width: 158,
              height: 158,
              borderRadius: 16,
              background: "rgba(255,255,255,0.04)",
              border: `2px solid ${pill.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 64,
              color: pill.color,
              fontWeight: 900,
            }}
          >
            {award.displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div
          style={{
            display: "flex",
            marginTop: 26,
            fontSize: 92,
            fontWeight: 900,
            lineHeight: 1,
            color: pill.color,
          }}
        >
          {`#${award.rank}`}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 12,
            fontSize: 16,
            fontWeight: 800,
            color: TEXT,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          {category.headline}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 6,
            fontSize: 14,
            fontWeight: 700,
            color: TEXT_MUTED,
            letterSpacing: 2.4,
            textTransform: "uppercase",
          }}
        >
          {award.monthLabel}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 22,
            fontSize: 12,
            fontWeight: 700,
            color: TEXT_MUTED,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {`Awarded ${award.issuedAt}`}
        </div>
      </div>

      {/* perforation dots along the stub edge */}
      <div
        style={{
          position: "absolute",
          top: 30,
          bottom: 30,
          left: TICKET_W - STUB_W - 3,
          width: 6,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {perforation.map((_, i) => (
          <div
            key={i}
            style={{ display: "flex", width: 6, height: 6, borderRadius: 999, background: PUNCH }}
          />
        ))}
      </div>

      {/* punched ticket notches at the stub boundary */}
      <div
        style={{
          position: "absolute",
          top: -16,
          left: TICKET_W - STUB_W - 16,
          width: 32,
          height: 32,
          borderRadius: 999,
          background: PUNCH,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -16,
          left: TICKET_W - STUB_W - 16,
          width: 32,
          height: 32,
          borderRadius: 999,
          background: PUNCH,
          display: "flex",
        }}
      />

      {/* brand bar pinned to the top of the main section only */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: TICKET_W - STUB_W,
          height: 6,
          background: BRAND_BAR,
          display: "flex",
        }}
      />
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
