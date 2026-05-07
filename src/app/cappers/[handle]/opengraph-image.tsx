import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { fetchCapperProfile, fetchLeaderboard } from "@/lib/api";
import { formatRecord, formatRoiNumeric, formatUnitsForTitle } from "@/lib/seo";

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

// Tier accents. Mirror the live site: top-3 use gold, the FADE AI model uses
// premium blue, everyone else gets the muted treatment.
const GOLD = "#f5c54a";
const BLUE = "#60a5fa";
const BLUE_SOFT = "rgba(37, 99, 235, 0.15)";
const BLUE_BORDER = "rgba(37, 99, 235, 0.6)";
// Pill accent: violet for the standard "MLB CAPPER RECORD" mark. Differentiates
// from the green stats and gold ribbon while reading as premium.
const VIOLET = "#c4b5fd";
const VIOLET_SOFT = "rgba(167, 139, 250, 0.12)";
const VIOLET_BORDER = "rgba(167, 139, 250, 0.45)";

type Tier = "model" | "top3" | "standard";

interface PillSpec {
  text: string;
  color: string;
  background: string;
  border: string;
}

interface TierVisuals {
  pill: PillSpec | null;
  ribbonRank: number | null;
  avatarBorder: string;
  avatarShadow: string;
}

function tierVisuals(tier: Tier, rank: number | null): TierVisuals {
  if (tier === "model") {
    return {
      pill: {
        text: "AI MODEL · MLB",
        color: BLUE,
        background: BLUE_SOFT,
        border: BLUE_BORDER,
      },
      ribbonRank: null,
      avatarBorder: BLUE,
      // Soft blue halo + crisp blue ring.
      avatarShadow: "0 0 0 3px #60a5fa, 0 0 32px rgba(96, 165, 250, 0.45)",
    };
  }
  if (tier === "top3" && rank !== null) {
    return {
      // Keep the standard pill alongside the ribbon. Pill is the universal
      // brand mark; ribbon is the rank stamp. They serve different roles.
      pill: {
        text: "MLB CAPPER RECORD",
        color: VIOLET,
        background: VIOLET_SOFT,
        border: VIOLET_BORDER,
      },
      ribbonRank: rank,
      avatarBorder: GOLD,
      // Layered gold halo: ring + outer glow. Reads as a medal mount.
      avatarShadow:
        "0 0 0 3px #f5c54a, 0 0 0 7px rgba(245, 197, 74, 0.18), 0 0 38px rgba(245, 197, 74, 0.45)",
    };
  }
  return {
    pill: {
      text: "MLB CAPPER RECORD",
      color: TEXT_MUTED,
      background: "transparent",
      border: BORDER,
    },
    ribbonRank: null,
    avatarBorder: BORDER,
    avatarShadow: "none",
  };
}

function CornerRibbon({ rank }: { rank: number }) {
  // Diagonal corner ribbon, top-right. Anchored slightly off the right edge
  // so the rotated banner clips against the card's overflow:hidden frame and
  // reads as wrapping the corner. Multi-stop linear gradient gives the
  // metallic gold-foil feel; the inner highlight + drop shadow add depth so
  // it looks pressed onto the card, not floated over it.
  //
  // Two-line medal layout: big rank number on top, small caps qualifier
  // below ("BY UNITS"). The rank alone is ambiguous; the qualifier ties
  // back to the UNITS stat tile and matches the leaderboard sort.
  return (
    <div
      style={{
        position: "absolute",
        top: 38,
        right: -72,
        width: 280,
        transform: "rotate(45deg)",
        transformOrigin: "center center",
        background:
          "linear-gradient(135deg, #8a6312 0%, #c79224 18%, #f5c54a 42%, #fff1b8 50%, #f5c54a 58%, #c79224 82%, #8a6312 100%)",
        color: "#1a0e00",
        padding: "10px 0 12px",
        boxShadow:
          "0 10px 24px rgba(0, 0, 0, 0.55), 0 0 1px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.55), inset 0 -1px 0 rgba(0, 0, 0, 0.25)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
      }}
    >
      <div
        style={{
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: 1,
          lineHeight: 1,
          display: "flex",
        }}
      >
        #{rank}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 2.6,
          marginTop: 3,
          display: "flex",
          opacity: 0.85,
        }}
      >
        BY UNITS
      </div>
    </div>
  );
}

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
  tier: Tier;
  rank: number | null;
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

/**
 * Resolve the capper's rank using the leaderboard default: season window,
 * all bet types, sorted by units profit. Profile share cards should reflect
 * the capper's overall standing, not the straights-only slate slice.
 */
async function fetchCapperRank(handle: string): Promise<number | null> {
  try {
    const data = await fetchLeaderboard({
      window: "season",
      sort: "units_profit",
      bet_type: "all",
      min_picks: 10,
      active_only: true,
    });
    const idx = data.leaderboard.findIndex((r) => r.handle === handle);
    return idx >= 0 ? idx + 1 : null;
  } catch (err) {
    console.error("[opengraph-image] fetchCapperRank failed", { handle, err });
    return null;
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

  const [avatarDataUri, logoDataUri, rank] = await Promise.all([
    fetchAvatarDataUri(avatarSourceUrl),
    readLogoDataUri(),
    fetchCapperRank(handle),
  ]);

  const tier: Tier =
    handle === "fadeai_" ? "model" : rank !== null && rank <= 3 ? "top3" : "standard";

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
    tier,
    rank,
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
  const { handle, displayName, avatarDataUri, logoDataUri, hasData, record, unitsRaw, roiPct, picksCount, trackedSinceLabel, tier, rank } = inputs;
  const unitsLabel = formatUnitsForTitle(unitsRaw);
  const roiLabel = formatRoiNumeric(roiPct);
  const unitsColor = unitsRaw >= 0 ? POS : NEG;
  const roiColor = roiPct >= 0 ? POS : NEG;
  const initial = handle.slice(0, 1).toUpperCase();
  const visuals = tierVisuals(tier, rank);
  const subline = trackedSinceLabel
    ? `Tracked since ${trackedSinceLabel} · ${picksCount} graded picks`
    : `${picksCount} graded picks`;

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
        padding: "44px 56px 36px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {visuals.ribbonRank !== null ? <CornerRibbon rank={visuals.ribbonRank} /> : null}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 28,
        }}
      >
        {logoDataUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoDataUri} alt="TailSlips" height={56} style={{ height: 56 }} />
        ) : (
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: -0.5, display: "flex" }}>
            TAILSLIPS
          </div>
        )}
        {visuals.pill ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 16px",
              background: visuals.pill.background,
              border: `1px solid ${visuals.pill.border}`,
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              color: visuals.pill.color,
              letterSpacing: 1.8,
              textTransform: "uppercase",
            }}
          >
            {visuals.pill.text}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 32 }}>
        {avatarDataUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarDataUri}
            alt=""
            width={120}
            height={120}
            style={{
              width: 120,
              height: 120,
              borderRadius: 999,
              border: tier === "standard" ? `3px solid ${visuals.avatarBorder}` : "none",
              boxShadow: visuals.avatarShadow,
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 999,
              background: CARD,
              border: tier === "standard" ? `3px solid ${visuals.avatarBorder}` : "none",
              boxShadow: visuals.avatarShadow,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 52,
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
              fontSize: 60,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1,
              display: "flex",
            }}
          >
            @{handle}
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: TEXT_MUTED,
              marginTop: 8,
              display: "flex",
            }}
          >
            {displayName && displayName !== handle ? `${displayName} · ${subline}` : subline}
          </div>
        </div>
      </div>

      {hasData ? (
        <div style={{ display: "flex", gap: 14, width: "100%" }}>
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

      <div
        style={{
          marginTop: "auto",
          paddingTop: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 16,
          color: TEXT_MUTED,
          fontWeight: 600,
        }}
      >
        <div style={{ display: "flex" }}>
          Every public pick graded against final outcomes.
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
  // Uniform 44px across all four tiles. Comfortably fits "109-247-4" and
  // "+999.9u" worst-case strings without wrapping. Per-tile auto-scaling
  // looked uneven on the rendered card.
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: "20px 22px",
      }}
    >
      <div
        style={{
          fontSize: 11,
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
          fontSize: 44,
          fontWeight: 800,
          color: valueColor,
          marginTop: 8,
          letterSpacing: -1.5,
          lineHeight: 1,
          display: "flex",
          whiteSpace: "nowrap",
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
