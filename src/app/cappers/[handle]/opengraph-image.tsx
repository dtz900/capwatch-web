import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { fetchCapperProfile } from "@/lib/api";
import { formatRecord, formatRoiForTitle, formatUnitsForTitle } from "@/lib/seo";

export const runtime = "nodejs";
export const alt = "Verified MLB capper record on TailSlips";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Color tokens from globals.css. Keep these in sync with the live theme so the
// OG card matches what users see on the page.
const BG = "#0a0a0c";
const CARD = "rgba(255, 255, 255, 0.025)";
const BORDER = "rgba(255, 255, 255, 0.10)";
const TEXT = "#fafafa";
const TEXT_SOFT = "#d4d4d8";
const TEXT_MUTED = "#71717a";
const POS = "#19f57c";
const NEG = "#ef4444";

interface RenderInputs {
  handle: string;
  displayName: string | null;
  avatarDataUri: string | null;
  logoDataUri: string | null;
  hasData: boolean;
  record: string;
  unitsRaw: number;
  roiPct: number;
  picksCount: number;
  trackedSinceLabel: string;
}

const PRIMARY_CACHE = "public, max-age=300, s-maxage=300, stale-while-revalidate=86400";
const FALLBACK_CACHE = "public, max-age=60, s-maxage=60, stale-while-revalidate=300";

async function fetchAvatarDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "TailSlipsBot/1.0 (+https://tailslips.com)" },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > 1_500_000) return null;
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function readLogoDataUri(): Promise<string | null> {
  try {
    const path = join(process.cwd(), "public", "logo-horizontal-aligned-tight.png");
    const buf = await readFile(path);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function CapperOgImage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  let displayName: string | null = null;
  let avatarSourceUrl: string | null = null;
  let record = "0-0";
  let unitsRaw = 0;
  let roiPct = 0;
  let picksCount = 0;
  let trackedSince: string | null = null;
  let hasData = false;

  try {
    const profile = await fetchCapperProfile(handle, { history_limit: 1, history_offset: 0 });
    const allTime = profile.aggregates["all_time"];
    displayName = profile.capper.display_name;
    avatarSourceUrl = profile.capper.profile_image_url;
    if (allTime && allTime.picks_count > 0) {
      record = formatRecord(allTime);
      unitsRaw = allTime.units_profit;
      roiPct = allTime.roi_pct;
      picksCount = allTime.picks_count;
      trackedSince = allTime.tracked_since ?? null;
      hasData = true;
    }
  } catch (err) {
    console.error("[opengraph-image] fetchCapperProfile failed", { handle, err });
  }

  const [avatarDataUri, logoDataUri] = await Promise.all([
    fetchAvatarDataUri(avatarSourceUrl),
    readLogoDataUri(),
  ]);

  const inputs: RenderInputs = {
    handle,
    displayName,
    avatarDataUri,
    logoDataUri,
    hasData,
    record,
    unitsRaw,
    roiPct,
    picksCount,
    trackedSinceLabel: trackedSince ? formatTrackedSince(trackedSince) : "",
  };

  // Force the satori render to complete inside the try block by awaiting
  // arrayBuffer(). new ImageResponse() returns synchronously and renders
  // lazily when the body is read, so without forcing, render errors escape
  // the try and surface as a 500 to social crawlers.
  try {
    const primary = new ImageResponse(buildOgJsx(inputs), { ...size });
    const buf = await primary.arrayBuffer();
    return new Response(buf, {
      headers: { "content-type": "image/png", "cache-control": PRIMARY_CACHE },
    });
  } catch (err) {
    console.error("[opengraph-image] primary render failed", { handle, err });
    try {
      const fallback = new ImageResponse(buildFallbackJsx(handle, logoDataUri), { ...size });
      const buf = await fallback.arrayBuffer();
      return new Response(buf, {
        headers: { "content-type": "image/png", "cache-control": FALLBACK_CACHE },
      });
    } catch (err2) {
      console.error("[opengraph-image] fallback render failed", { handle, err2 });
      return new Response(TRANSPARENT_PNG, {
        headers: { "content-type": "image/png", "cache-control": FALLBACK_CACHE },
      });
    }
  }
}

const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

function buildOgJsx(inputs: RenderInputs) {
  const { handle, displayName, avatarDataUri, logoDataUri, hasData, record, unitsRaw, roiPct, picksCount, trackedSinceLabel } = inputs;
  const unitsLabel = formatUnitsForTitle(unitsRaw);
  const roiLabel = formatRoiForTitle(roiPct);
  const unitsColor = unitsRaw >= 0 ? POS : NEG;
  const roiColor = roiPct >= 0 ? POS : NEG;
  const initial = handle.slice(0, 1).toUpperCase();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: BG,
        fontFamily: "system-ui, sans-serif",
        color: TEXT,
        padding: "56px 64px",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 36,
        }}
      >
        {logoDataUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoDataUri} alt="TailSlips" height={42} style={{ height: 42 }} />
        ) : (
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, display: "flex" }}>
            TAILSLIPS
          </div>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "8px 16px",
            border: `1px solid ${BORDER}`,
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 700,
            color: TEXT_MUTED,
            letterSpacing: 1.6,
            textTransform: "uppercase",
          }}
        >
          Verified MLB capper record
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        {avatarDataUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarDataUri}
            alt=""
            width={140}
            height={140}
            style={{
              width: 140,
              height: 140,
              borderRadius: 999,
              border: `3px solid ${BORDER}`,
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: 999,
              background: CARD,
              border: `3px solid ${BORDER}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 60,
              fontWeight: 800,
              color: TEXT_SOFT,
            }}
          >
            {initial}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1,
              display: "flex",
            }}
          >
            @{handle}
          </div>
          {displayName && displayName !== handle ? (
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: TEXT_MUTED,
                marginTop: 10,
                display: "flex",
              }}
            >
              {displayName}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 56 }}>
        {hasData ? (
          <div style={{ display: "flex", gap: 16, width: "100%" }}>
            <StatTile label="Record" value={record} valueColor={TEXT} />
            <StatTile label="Units" value={unitsLabel} valueColor={unitsColor} />
            <StatTile label="ROI" value={roiLabel} valueColor={roiColor} />
            <StatTile label="Graded picks" value={String(picksCount)} valueColor={TEXT} />
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              padding: "28px 36px",
              border: `1px solid ${BORDER}`,
              borderRadius: 18,
              fontSize: 22,
              color: TEXT_MUTED,
              fontWeight: 600,
            }}
          >
            Tracked on TailSlips. Pick history grading in progress.
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          bottom: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 17,
          color: TEXT_MUTED,
          fontWeight: 600,
        }}
      >
        <div style={{ display: "flex" }}>
          {trackedSinceLabel
            ? `Tracked since ${trackedSinceLabel}. Every public pick parsed live, graded against final outcomes.`
            : "Every public pick parsed live, graded against final outcomes."}
        </div>
        <div style={{ display: "flex", color: TEXT_SOFT, fontWeight: 700 }}>tailslips.com</div>
      </div>
    </div>
  );
}

function buildFallbackJsx(handle: string, logoDataUri: string | null) {
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
      }}
    >
      {logoDataUri ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoDataUri} alt="TailSlips" height={48} style={{ height: 48 }} />
      ) : (
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.5, display: "flex" }}>
          TAILSLIPS
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 80, fontWeight: 800, letterSpacing: -2, display: "flex" }}>
          @{handle}
        </div>
        <div
          style={{
            fontSize: 26,
            color: TEXT_MUTED,
            marginTop: 16,
            fontWeight: 600,
            display: "flex",
          }}
        >
          Verified MLB capper record on TailSlips
        </div>
      </div>
      <div style={{ color: TEXT_SOFT, fontWeight: 700, fontSize: 22, display: "flex" }}>
        tailslips.com
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 18,
        padding: "22px 26px",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: TEXT_MUTED,
          letterSpacing: 2,
          textTransform: "uppercase",
          display: "flex",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 52,
          fontWeight: 800,
          color: valueColor,
          marginTop: 10,
          letterSpacing: -1.5,
          lineHeight: 1,
          display: "flex",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function formatTrackedSince(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  } catch {
    return "";
  }
}
