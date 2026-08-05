import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Daily "Biggest swings" card: biggest single winning ticket vs biggest single
// losing ticket for a slate date. Fully query-param driven (the platform's
// daily_leaderboard_tweet.py emits a prefilled URL); nothing is stored.
// Same visual language as the award cards: flat scoreboard plaque, no foil.

export const size = { width: 1200, height: 630 };

const BG = "#0a0a0c";
const TEXT = "#f7f3e9";
const TEXT_MUTED = "#71717a";
const BORDER = "rgba(255,255,255,0.10)";
const POS = "#19f57c";
const NEG = "#ef4444";
const MINT = "#5eead4";
const BRAND_BAR = "linear-gradient(90deg,#5eead4 0%,#19f57c 100%)";

export interface SwingTicket {
  handle: string;
  /** Bet description, e.g. "Dodgers ML" or "4 leg moneyline parlay" */
  desc: string;
  /** Display odds, e.g. "-160" / "+238"; empty for parlays without one */
  odds: string;
  /** Stake in units, e.g. "20u"; empty defaults to 1u */
  stake: string;
  /** Signed units, e.g. -20 or 11.82 */
  units: number;
  avatarUrl: string | null;
}

export interface SwingsCardData {
  /** YYYY-MM-DD slate date */
  date: string;
  win: SwingTicket | null;
  loss: SwingTicket | null;
}

const MONTH_ABBR = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

function dateLabel(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  if (!m || !d) return iso;
  return `${MONTH_ABBR[m - 1]} ${d}`;
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

// Hot/cold treatment: the win side burns warm, the loss side ices over. The
// units number itself keeps the site's P&L green/red.
const HOT = "#fb923c";
const COLD = "#7dd3fc";

function ticketPanel(
  kind: "win" | "loss",
  t: SwingTicket | null,
  avatarUri: string | null,
) {
  const hot = kind === "win";
  const accent = hot ? HOT : COLD;
  const unitsColor = hot ? POS : NEG;
  const label = hot ? "Biggest win" : "Biggest loss";
  const emoji = hot ? "🔥" : "🧊";
  // Warm ember glow rising from the bottom on the hot side; icy wash sinking
  // from the top on the cold side.
  const wash = hot
    ? "radial-gradient(circle at 28% 100%, rgba(251,146,60,0.22) 0%, rgba(251,146,60,0.05) 45%, rgba(0,0,0,0) 68%)"
    : "radial-gradient(circle at 72% 0%, rgba(125,211,252,0.20) 0%, rgba(125,211,252,0.05) 45%, rgba(0,0,0,0) 68%)";
  if (!t) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: TEXT_MUTED, fontSize: 28 }}>
        —
      </div>
    );
  }
  const units = `${t.units >= 0 ? "+" : ""}${t.units.toFixed(1)}u`;
  const meta = [t.odds ? `${t.odds}` : "", t.stake ? `${t.stake} stake` : "1u stake"]
    .filter(Boolean)
    .join(" · ");
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "34px 52px 32px 52px",
        backgroundImage: wash,
        borderTop: `3px solid ${accent}`,
      }}
    >
      {/* panel label */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", fontSize: 30, marginRight: 14 }}>{emoji}</div>
        <div
          style={{
            display: "flex",
            fontSize: 21,
            color: accent,
            fontWeight: 900,
            letterSpacing: 3.6,
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
      </div>

      {/* identity */}
      <div style={{ display: "flex", alignItems: "center", marginTop: 28 }}>
        {avatarUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUri}
            alt=""
            width={88}
            height={88}
            style={{
              width: 88,
              height: 88,
              borderRadius: 14,
              objectFit: "cover",
              border: `2px solid ${accent}`,
            }}
          />
        ) : (
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 14,
              background: "rgba(255,255,255,0.03)",
              border: `2px solid ${accent}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              color: TEXT_MUTED,
              fontWeight: 900,
            }}
          >
            {t.handle.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div
          style={{
            display: "flex",
            marginLeft: 20,
            fontSize: 40,
            fontWeight: 900,
            letterSpacing: -1,
            color: TEXT,
          }}
        >
          {`@${t.handle}`}
        </div>
      </div>

      {/* the bet that caused it */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 28,
          paddingLeft: 18,
          borderLeft: `3px solid ${accent}`,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 13,
            color: TEXT_MUTED,
            fontWeight: 700,
            letterSpacing: 2.2,
            textTransform: "uppercase",
          }}
        >
          The bet
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 6,
            fontSize: 31,
            fontWeight: 800,
            color: TEXT,
            lineHeight: 1.2,
          }}
        >
          {t.desc}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 6,
            fontSize: 18,
            color: TEXT_MUTED,
            fontWeight: 700,
            letterSpacing: 1.6,
            textTransform: "uppercase",
          }}
        >
          {meta}
        </div>
      </div>

      {/* result, pinned to the bottom */}
      <div
        style={{
          display: "flex",
          marginTop: "auto",
          fontSize: 100,
          fontWeight: 900,
          letterSpacing: -4,
          lineHeight: 1,
          color: unitsColor,
        }}
      >
        {units}
      </div>
    </div>
  );
}

function swingsCard(
  data: SwingsCardData,
  winAvatar: string | null,
  lossAvatar: string | null,
  logoUri: string | null,
) {
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
      <div style={{ display: "flex", height: 6, background: BRAND_BAR }} />

      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "36px 56px 22px 56px",
        }}
      >
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
            {`Biggest swings · ${dateLabel(data.date)} · ${data.date.slice(0, 4)}`}
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

      {/* split panels */}
      <div style={{ flex: 1, display: "flex", borderTop: `1px solid ${BORDER}` }}>
        {ticketPanel("win", data.win, winAvatar)}
        <div style={{ display: "flex", width: 1, background: BORDER }} />
        {ticketPanel("loss", data.loss, lossAvatar)}
      </div>

      {/* footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `1px solid ${BORDER}`,
          padding: "18px 56px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 13,
            color: TEXT_MUTED,
            letterSpacing: 1.6,
            textTransform: "uppercase",
          }}
        >
          Single ticket, straights and parlays · Every pick graded from the original tweet
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 13,
            color: MINT,
            fontWeight: 800,
            letterSpacing: 1.6,
            textTransform: "uppercase",
          }}
        >
          tailslips.com/slate
        </div>
      </div>
    </div>
  );
}

export async function renderSwingsOg(data: SwingsCardData): Promise<Response> {
  const [winAvatar, lossAvatar, logoFsUri] = await Promise.all([
    imageDataUri(data.win?.avatarUrl ?? null),
    imageDataUri(data.loss?.avatarUrl ?? null),
    readPublicPngDataUri("logo-horizontal-aligned-tight.png"),
  ]);
  const logoUri =
    logoFsUri ?? (await imageDataUri("https://tailslips.com/logo-horizontal-aligned-tight.png"));

  const img = new ImageResponse(swingsCard(data, winAvatar, lossAvatar, logoUri), { ...size });
  const buf = await img.arrayBuffer();
  return new Response(buf, {
    // Param-driven and re-generated daily; never let a CDN pin an old card.
    headers: { "content-type": "image/png", "cache-control": "no-store, max-age=0" },
  });
}
