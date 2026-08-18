import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// My Tails intro card for the new-follower welcome DM. The right side is a
// faithful recreation of the real BetSlipRail ticket (same teal gradient,
// entry rows, WON pills, TODAY / ALL TIME footer) so the DM shows the actual
// product. Query-param driven with real graded picks baked in as defaults;
// nothing is stored.
//
// Params:
//   date  YYYY-MM-DD, rendered as the slip's day label (default 2026-08-17,
//         matching the baked-in picks; pass it when overriding rows)
//   p     repeatable rows, "selection|matchup|capper|odds|stake|profit"
//         e.g. p=Reds ML|STL @ CIN|swampy_swami|%2B102|1|1.02
//   today signed units for the TODAY box, e.g. 5.39

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const size = { width: 1200, height: 630 };

const BG = "#0a0a0c";
const TEXT = "#f7f3e9";
const POS = "#19f57c";
const NEG = "#ef4444";
const SLIP_TEAL = "#2fd9c0";
const SUB = "#6da399";
const FAINT = "#4c7d72";

interface SlipRow {
  selection: string;
  matchup: string;
  capper: string;
  odds: string;
  stake: number;
  profit: number;
}

// Real graded picks from the 2026-08-17 board.
const DEFAULT_TODAY = 5.25;
const DEFAULT_ROWS: SlipRow[] = [
  { selection: "Tigers ML", matchup: "DET @ PIT", capper: "swampy_swami", odds: "-113", stake: 1, profit: 0.88 },
  { selection: "Cardinals ML", matchup: "STL @ CIN", capper: "robotbets", odds: "-115", stake: 3, profit: 2.61 },
  { selection: "Royals ML", matchup: "ATH @ KC", capper: "robotbets", odds: "-170", stake: 3, profit: 1.76 },
];

function parseRows(sp: URLSearchParams): SlipRow[] {
  const out: SlipRow[] = [];
  for (const raw of sp.getAll("p")) {
    const [selection, matchup, capper, odds, stake, profit] = raw.split("|");
    if (selection && capper) {
      out.push({
        selection,
        matchup: matchup ?? "",
        capper,
        odds: odds ?? "",
        stake: Number(stake) || 1,
        profit: Number(profit) || 0,
      });
    }
  }
  // The 630px canvas fits exactly three ticket legs plus the P&L footer;
  // more would clip out the bottom of a non-scrolling PNG.
  const rows = out.length > 0 ? out : DEFAULT_ROWS;
  return rows.slice(0, 3);
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

function unitsStr(v: number): string {
  const oneDecimalIsExact = Math.abs(v * 10 - Math.round(v * 10)) < 1e-9;
  return `${v >= 0 ? "+" : ""}${v.toFixed(oneDecimalIsExact ? 1 : 2)}u`;
}

function toWin(odds: string, stake: number): string {
  const o = Number(odds.replace("+", ""));
  if (!Number.isFinite(o) || o === 0) return "";
  const net = o > 0 ? o / 100 : 100 / Math.abs(o);
  return `${stake}u to win ${(stake * net).toFixed(2)}u`;
}

async function readPublicPngDataUri(filename: string): Promise<string | null> {
  try {
    const buf = await readFile(join(process.cwd(), "public", filename));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/* Ticket leg, mirroring SlipEntryRow's graded state at ~1.4x scale. Outcome
   follows the sign of profit, same semantics as the real rail. */
function slipEntryRow(r: SlipRow) {
  const won = r.profit > 0;
  const push = r.profit === 0;
  const resColor = push ? SUB : won ? POS : NEG;
  const pill = push ? "PUSH" : won ? "WON" : "LOST";
  const pillBg = push ? "rgba(255,255,255,0.06)" : won ? "rgba(25,245,124,0.15)" : "rgba(239,68,68,0.15)";
  const pillBorder = push
    ? "1px solid rgba(255,255,255,0.20)"
    : won
      ? "1px solid rgba(25,245,124,0.40)"
      : "1px solid rgba(239,68,68,0.40)";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 12,
        background: "rgba(8,12,11,0.75)",
        border: "1px solid rgba(47,217,192,0.10)",
        padding: "16px 18px",
        marginBottom: 11,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 21, fontWeight: 800, color: "#ffffff", lineHeight: 1.15 }}>
            {r.selection}
          </div>
          <div style={{ display: "flex", marginTop: 3, fontSize: 15, color: SUB }}>
            {`${r.matchup} · @${r.capper}`}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 22, fontWeight: 800, color: SLIP_TEAL }}>
          {r.odds}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 13,
          paddingTop: 13,
          borderTop: "1px dashed rgba(47,217,192,0.18)",
        }}
      >
        <div style={{ display: "flex", fontSize: 15, color: SUB }}>{toWin(r.odds, r.stake)}</div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 19, fontWeight: 800, color: resColor, marginRight: 10 }}>
            {unitsStr(r.profit)}
          </div>
          <div
            style={{
              display: "flex",
              borderRadius: 8,
              border: pillBorder,
              background: pillBg,
              padding: "3px 10px",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1.4,
              color: resColor,
            }}
          >
            {pill}
          </div>
        </div>
      </div>
    </div>
  );
}

function ticket(rows: SlipRow[], today: number, dateIso: string, logoUri: string | null) {
  const totalColor = today > 0 ? POS : today < 0 ? NEG : SUB;
  // The slip is always a dated sample night, never a live "today", so the
  // footer names the date instead of presenting old results as current.
  const dayLabel = dateLabel(dateIso);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 430,
        borderRadius: 22,
        overflow: "hidden",
        background: "linear-gradient(180deg, #0c1f1b 0%, #0a1512 55%, #07100d 100%)",
        border: "1px solid rgba(47,217,192,0.22)",
        boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
      }}
    >
      {/* ticket header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(90deg, #0e2c25 0%, #0a1e19 100%)",
          padding: "15px 20px",
          borderBottom: "1px solid rgba(47,217,192,0.25)",
        }}
      >
        {logoUri ? (
          // eslint-disable-next-line
          <img src={logoUri} alt="TailSlips" height={28} style={{ height: 28 }} />
        ) : (
          <div style={{ display: "flex", fontSize: 20, fontWeight: 900, color: SLIP_TEAL }}>TAILSLIPS</div>
        )}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 27,
              minWidth: 27,
              borderRadius: 999,
              background: SLIP_TEAL,
              color: "#06231d",
              fontSize: 15,
              fontWeight: 800,
              padding: "0 8px",
              marginRight: 12,
            }}
          >
            {rows.length}
          </div>
          <div style={{ display: "flex", fontSize: 19, color: SUB }}>»</div>
        </div>
      </div>

      {/* legs */}
      <div style={{ display: "flex", flexDirection: "column", padding: "14px 14px 3px 14px" }}>
        {rows.map((r) => slipEntryRow(r))}
      </div>

      {/* pinned P&L footer, same as the rail */}
      <div style={{ display: "flex", flexDirection: "column", padding: "0 14px 14px 14px", marginTop: "auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderRadius: 12,
            background: "rgba(4,16,13,0.6)",
            padding: "13px 18px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 12, fontWeight: 700, letterSpacing: 2, color: FAINT }}>
              {dayLabel}
            </div>
            <div style={{ display: "flex", marginTop: 4, fontSize: 30, fontWeight: 800, color: totalColor, lineHeight: 1 }}>
              {unitsStr(today)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: 12, fontWeight: 700, letterSpacing: 2, color: FAINT }}>
              ALL TIME
            </div>
            <div style={{ display: "flex", marginTop: 4, fontSize: 30, fontWeight: 800, color: totalColor, lineHeight: 1 }}>
              {unitsStr(today)}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 8,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.6,
            color: FAINT,
          }}
        >
          START FRESH
        </div>
      </div>
    </div>
  );
}

function card(rows: SlipRow[], today: number, dateIso: string, logoUri: string | null) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        background: BG,
        backgroundImage:
          "radial-gradient(circle at 78% 45%, rgba(47,217,192,0.10) 0%, rgba(47,217,192,0.03) 40%, rgba(0,0,0,0) 65%)",
        color: TEXT,
        padding: "0 64px",
      }}
    >
      {/* pitch */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingRight: 56 }}>
        <div
          style={{
            display: "flex",
            fontSize: 17,
            fontWeight: 800,
            letterSpacing: 3.4,
            color: SLIP_TEAL,
            textTransform: "uppercase",
          }}
        >
          My Tails
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 18,
            fontSize: 66,
            fontWeight: 900,
            letterSpacing: -2,
            lineHeight: 1.04,
            color: TEXT,
          }}
        >
          <div style={{ display: "flex" }}>You tail it.</div>
          <div style={{ display: "flex" }}>We grade it.</div>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 26,
            fontSize: 21,
            lineHeight: 1.5,
            color: "#b9b4a6",
            maxWidth: 540,
          }}
        >
          Build your slip from any capper&apos;s pick on the board. It grades itself at market
          prices and your record follows you.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 34,
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: 2.4,
            color: SLIP_TEAL,
            textTransform: "uppercase",
          }}
        >
          Free with a sign up · tailslips.com
        </div>
      </div>

      {ticket(rows, today, dateIso, logoUri)}
    </div>
  );
}

export async function GET(request: Request): Promise<Response> {
  const sp = new URL(request.url).searchParams;
  const rows = parseRows(sp);
  const todayParam = Number(sp.get("today"));
  const today = sp.get("today") !== null && Number.isFinite(todayParam) ? todayParam : DEFAULT_TODAY;
  const dateIso = sp.get("date") ?? "2026-08-17";

  const logoUri = await readPublicPngDataUri("logo-horizontal-aligned-tight.png");
  const img = new ImageResponse(card(rows, today, dateIso, logoUri), { ...size });
  const buf = await img.arrayBuffer();
  return new Response(buf, {
    headers: { "content-type": "image/png", "cache-control": "no-store, max-age=0" },
  });
}
