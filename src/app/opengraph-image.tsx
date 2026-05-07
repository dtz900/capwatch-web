import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "TailSlips · Verified MLB capper rankings";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#0a0a0c";
const TEXT = "#fafafa";
const TEXT_SOFT = "#d4d4d8";
const TEXT_MUTED = "#71717a";

async function readLogoDataUri(): Promise<string | null> {
  try {
    const path = join(process.cwd(), "public", "logo-horizontal-aligned-tight.png");
    const buf = await readFile(path);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function RootOgImage() {
  const logoDataUri = await readLogoDataUri();

  const primary = new ImageResponse(buildJsx(logoDataUri), { ...size });
  return primary;
}

function buildJsx(logoDataUri: string | null) {
  return (
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
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}
    >
      {logoDataUri ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoDataUri} alt="TailSlips" height={52} style={{ height: 52 }} />
      ) : (
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -0.5, display: "flex" }}>
          TAILSLIPS
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: 84,
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
            fontSize: 26,
            color: TEXT_MUTED,
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
          fontSize: 18,
          color: TEXT_MUTED,
          fontWeight: 600,
        }}
      >
        <div style={{ display: "flex" }}>The capper leaderboard you can verify.</div>
        <div style={{ color: TEXT_SOFT, fontWeight: 700, display: "flex" }}>tailslips.com</div>
      </div>
    </div>
  );
}
