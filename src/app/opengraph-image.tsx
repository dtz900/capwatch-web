import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "TailSlips · Verified MLB capper rankings";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#0a0a0c";
const TEXT = "#f5f5f5";
const MUTED = "#9a9aa1";
const BRAND_GOLD = "#f5c54a";

export default function RootOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: BG,
          color: TEXT,
          padding: "72px 80px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: "Manrope, system-ui, sans-serif",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: BRAND_GOLD,
              color: "#1a1305",
              fontWeight: 800,
              fontSize: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            T
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>TAILSLIPS</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              lineHeight: 1.0,
              letterSpacing: -3,
              maxWidth: 1000,
              display: "flex",
            }}
          >
            Verified MLB picks from tracked Twitter cappers.
          </div>
          <div
            style={{
              fontSize: 28,
              color: MUTED,
              marginTop: 28,
              fontWeight: 600,
              maxWidth: 980,
              lineHeight: 1.3,
              display: "flex",
            }}
          >
            Every public pick parsed within seconds, graded against the final game outcome.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 20,
            color: MUTED,
            fontWeight: 600,
          }}
        >
          <div style={{ display: "flex" }}>The capper leaderboard you can verify.</div>
          <div style={{ color: BRAND_GOLD, fontWeight: 700, display: "flex" }}>tailslips.com</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
