import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { fetchSlate } from "@/lib/api";
import type { SlateCapperSummary } from "@/lib/types";

/**
 * Final-standings card: the shareable image for the nightly leaderboard
 * thread, replacing the manual slate-page screenshot. Renders the day's
 * top 10 by net units exactly as the site computes them (fetchSlate's
 * capper_summary carries staking-scheme-corrected numbers), so the image
 * can never disagree with tailslips.com/slate.
 *
 *   /og/standings            -> today's slate
 *   /og/standings?date=ISO   -> a specific slate date
 *
 * Everyone renders, same as the site (content policy: exclusions apply to
 * tweet TEXT and tags only, never the board itself).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const W = 1200;
const H = 630;

// Same palette as the slate OG: off-white on near-black, green/red reserved
// for units, no other accent colors.
const BG = "#0a0a0c";
const OFF = "#f7f3e9";
const OFF_DIM = "rgba(247, 243, 233, 0.62)";
const OFF_FAINT = "rgba(247, 243, 233, 0.40)";
const HAIR = "rgba(247, 243, 233, 0.12)";
const PANEL_BG = "rgba(255, 255, 255, 0.02)";
const POS = "#4ade80";
const NEG = "#f87171";

async function logoDataUri(): Promise<string | null> {
  try {
    const buf = await readFile(
      join(process.cwd(), "public", "logo-horizontal-aligned-tight.png"),
    );
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
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

  const logo = await logoDataUri();

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
          padding: "36px 56px 28px",
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
          <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
            <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>
              Final standings
            </span>
            <span style={{ fontSize: 22, color: OFF_DIM, fontWeight: 700 }}>
              {dateLabel}
            </span>
          </div>
          <span
            style={{
              fontSize: 18,
              color: OFF_FAINT,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {graded} picks · {sharps} sharps
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            marginTop: 22,
            background: PANEL_BG,
            border: `1px solid ${HAIR}`,
            borderRadius: 16,
            padding: "10px 28px",
          }}
        >
          {rows.length === 0 && (
            <span style={{ fontSize: 26, color: OFF_DIM, margin: "auto" }}>
              No graded picks yet.
            </span>
          )}
          {rows.map((c, i) => (
            <div
              key={c.capper_id}
              style={{
                display: "flex",
                alignItems: "center",
                flexGrow: 1,
                borderBottom: i < rows.length - 1 ? `1px solid ${HAIR}` : "none",
                gap: 20,
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: OFF_FAINT,
                  width: 44,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                style={{
                  fontSize: 27,
                  fontWeight: 700,
                  flexGrow: 1,
                }}
              >
                @{c.handle ?? c.display_name ?? "capper"}
              </span>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: OFF_DIM,
                  width: 110,
                  justifyContent: "flex-end",
                  display: "flex",
                }}
              >
                {record(c)}
              </span>
              <span
                style={{
                  fontSize: 27,
                  fontWeight: 800,
                  color: c.net_units >= 0 ? POS : NEG,
                  width: 140,
                  justifyContent: "flex-end",
                  display: "flex",
                }}
              >
                {units(c.net_units)}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 20,
          }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="TailSlips" height={30} />
          ) : (
            <span style={{ fontSize: 24, fontWeight: 800 }}>TailSlips</span>
          )}
          <span style={{ fontSize: 20, color: OFF_DIM, fontWeight: 700 }}>
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
