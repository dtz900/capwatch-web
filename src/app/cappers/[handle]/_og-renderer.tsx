import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { fetchCapperProfile, fetchLeaderboard } from "@/lib/api";
import { formatRecord, formatRoiNumeric, formatUnitsForTitle } from "@/lib/seo";
import { marketFilterLabel } from "@/lib/capperFilters";
import type { BetTypeFilter, Window } from "@/lib/types";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Verified MLB capper record on TailSlips";

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
const AMBER = "#f5c54a";
const CYAN = "#47c7ff";

// Tier accents. Mirror the live site: top-3 use gold, the FADE AI model uses
// premium blue, everyone else gets the muted treatment.
const GOLD = "#f5c54a";
const BLUE = "#60a5fa";
const BLUE_SOFT = "rgba(37, 99, 235, 0.15)";
const BLUE_BORDER = "rgba(37, 99, 235, 0.6)";
// Pill accent: violet for the standard "MLB CAPPER RECORD" mark.
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
      avatarShadow: "0 0 0 3px #60a5fa, 0 0 32px rgba(96, 165, 250, 0.45)",
    };
  }
  if (tier === "top3" && rank !== null) {
    return {
      pill: {
        text: "MLB CAPPER RECORD",
        color: VIOLET,
        background: VIOLET_SOFT,
        border: VIOLET_BORDER,
      },
      ribbonRank: rank,
      avatarBorder: GOLD,
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
  filterLabel: string;
  trajectorySeries: number[];
  tier: Tier;
  rank: number | null;
}

const PRIMARY_CACHE = "public, max-age=30, s-maxage=30, stale-while-revalidate=300";
const FALLBACK_CACHE = "public, max-age=30, s-maxage=30, stale-while-revalidate=120";

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
 * all bet types, sorted by units profit. Rank is intentionally not filtered
 * by the card's bet_type so it always reads as "this capper's standing on
 * the overall board" rather than shifting per filter slice.
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
    console.error("[og-renderer] fetchCapperRank failed", { handle, err });
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

function windowLabel(w: Window): string | null {
  if (w === "season") return "Season";
  if (w === "last_30") return "Last 30";
  if (w === "last_7") return "Last 7";
  return null;
}

function betTypeLabel(bt: BetTypeFilter): string | null {
  if (bt === "straights") return "Straights";
  if (bt === "parlays") return "Parlays";
  return null;
}

function buildFilterLabel(w: Window, bt: BetTypeFilter): string {
  const parts = [betTypeLabel(bt), windowLabel(w)].filter(Boolean) as string[];
  return parts.join(" · ");
}

export interface RenderOpts {
  window?: Window;
  bet_type?: BetTypeFilter;
  /** When set, render the per-market straight-pick slice (e.g. "spread"),
   * matching the page's Market filter. A market implies straights. */
  market?: string;
}

const DEFAULT_OG_WINDOW: Window = "season";

export async function renderCapperOg(
  handle: string,
  opts: RenderOpts = {},
): Promise<Response> {
  const window: Window = opts.window ?? DEFAULT_OG_WINDOW;
  const market = opts.market;
  // A specific market scopes to straight picks; market_slices are identical on
  // the all/straights rows, so fetch straights when a market is requested.
  const bet_type: BetTypeFilter = market ? "straights" : opts.bet_type ?? "all";

  let displayName: string | null = null;
  let avatarSourceUrl: string | null = null;
  let record = "0-0";
  let unitsRaw = 0;
  let roiPct = 0;
  let picksCount = 0;
  let trackedSince: string | null = null;
  let hasData = false;
  let marketLabel: string | null = null;
  let trajectorySeries: number[] = [];

  try {
    const profile = await fetchCapperProfile(handle, {
      history_limit: 1,
      history_offset: 0,
      bet_type: bet_type !== "all" ? bet_type : undefined,
    });
    const agg = profile.aggregates[window] ?? profile.aggregates["all_time"];
    displayName = profile.capper.display_name;
    avatarSourceUrl = profile.capper.profile_image_url;
    const slice = market ? agg?.market_slices?.[market] ?? null : null;
    // tracked_since lives on the all-time aggregate. Pull it directly so the
    // subline is consistent regardless of the requested filter window.
    const trackedSinceSrc =
      profile.aggregates["all_time"]?.tracked_since ?? agg?.tracked_since ?? null;
    if (market && slice) {
      marketLabel = marketFilterLabel(market);
      trajectorySeries = slice.trajectory ?? [];
      if (slice.picks_count > 0) {
        record = formatRecord(slice);
        unitsRaw = slice.units_profit;
        roiPct = slice.roi_pct ?? 0;
        picksCount = slice.picks_count;
        trackedSince = trackedSinceSrc;
        hasData = true;
      }
    } else if (agg && agg.picks_count > 0) {
      record = formatRecord(agg);
      unitsRaw = agg.units_profit;
      roiPct = agg.roi_pct;
      picksCount = agg.picks_count;
      trackedSince = trackedSinceSrc;
      trajectorySeries = profile.trajectory?.[window] ?? [];
      hasData = true;
    }
  } catch (err) {
    console.error("[og-renderer] fetchCapperProfile failed", { handle, window, bet_type, market, err });
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
    filterLabel:
      market && marketLabel
        ? [marketLabel, windowLabel(window)].filter(Boolean).join(" · ")
        : buildFilterLabel(window, bet_type),
    trajectorySeries,
    tier,
    rank,
  };

  try {
    const primary = new ImageResponse(buildPremiumOgJsx(inputs), { ...size });
    const buf = await primary.arrayBuffer();
    return new Response(buf, {
      headers: { "content-type": "image/png", "cache-control": PRIMARY_CACHE },
    });
  } catch (err) {
    console.error("[og-renderer] primary render failed", { handle, err });
    try {
      const fallback = new ImageResponse(buildFallbackJsx(handle, logoDataUri), { ...size });
      const buf = await fallback.arrayBuffer();
      return new Response(buf, {
        headers: { "content-type": "image/png", "cache-control": FALLBACK_CACHE },
      });
    } catch (err2) {
      console.error("[og-renderer] fallback render failed", { handle, err2 });
      try {
        const emergency = new ImageResponse((
          <div style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: BG,
            color: TEXT,
            padding: 64,
            fontFamily: "system-ui, sans-serif",
          }}>
            <div style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 900,
              color: POS,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}>
              TailSlips
            </div>
            <div style={{
              display: "flex",
              marginTop: 28,
              fontSize: 76,
              lineHeight: 1,
              fontWeight: 900,
            }}>
              @{handle}
            </div>
            <div style={{
              display: "flex",
              marginTop: 22,
              fontSize: 30,
              color: TEXT_SOFT,
            }}>
              Verified MLB capper record
            </div>
          </div>
        ), { ...size });
        const buf = await emergency.arrayBuffer();
        return new Response(buf, {
          headers: { "content-type": "image/png", "cache-control": FALLBACK_CACHE },
        });
      } catch {
        return new Response(TRANSPARENT_PNG, {
          headers: { "content-type": "image/png", "cache-control": FALLBACK_CACHE },
        });
      }
    }
  }
}

const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

function parseRecordLine(record: string): { wins: number; losses: number; pushes: number } {
  const [wins, losses, pushes] = record.split("-").map((part) => Number.parseInt(part, 10));
  return {
    wins: Number.isFinite(wins) ? wins : 0,
    losses: Number.isFinite(losses) ? losses : 0,
    pushes: Number.isFinite(pushes) ? pushes : 0,
  };
}

function Capsule({ text, color }: { text: string; color: string }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      padding: "7px 11px",
      borderRadius: 999,
      border: `1px solid ${color}`,
      background: "rgba(255,255,255,0.035)",
      color,
      fontSize: 10,
      fontWeight: 900,
      textTransform: "uppercase",
      letterSpacing: 1.6,
      maxWidth: 285,
    }}>
      {text}
    </div>
  );
}

function sparklineGeometry(series: number[], width: number, height: number) {
  const points = [0, ...series];
  const min = Math.min(0, ...points);
  const max = Math.max(0, ...points);
  const range = max - min || 1;
  const padX = 4;
  const padY = 8;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : innerW;
  const yFor = (value: number) => padY + innerH - ((value - min) / range) * innerH;
  const zeroY = yFor(0);
  const linePoints = points
    .map((value, index) => `${padX + index * stepX},${yFor(value)}`)
    .join(" ");
  const areaPath =
    `M ${padX},${zeroY} ` +
    points.map((value, index) => `L ${padX + index * stepX},${yFor(value)}`).join(" ") +
    ` L ${padX + (points.length - 1) * stepX},${zeroY} Z`;
  const last = points[points.length - 1] ?? 0;
  const lastX = padX + (points.length - 1) * stepX;
  const lastY = yFor(last);
  return { areaPath, last, lastX, lastY, linePoints, zeroY };
}

function OgSparkline({ series }: { series: number[] }) {
  const width = 594;
  const height = 116;
  if (series.length < 2) {
    return (
      <div style={{
        display: "flex",
        height,
        alignItems: "center",
        justifyContent: "center",
        color: TEXT_MUTED,
        fontSize: 22,
        fontWeight: 800,
      }}>
        Trajectory building
      </div>
    );
  }
  const geo = sparklineGeometry(series, width, height);
  const positive = geo.last >= 0;
  const stroke = positive ? POS : NEG;
  const fill = positive ? "rgba(25,245,124,0.18)" : "rgba(239,68,68,0.16)";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "flex" }}>
      <line
        x1={4}
        y1={geo.zeroY}
        x2={width - 4}
        y2={geo.zeroY}
        stroke="rgba(255,255,255,0.10)"
        strokeDasharray="5 5"
      />
      <path d={geo.areaPath} fill={fill} />
      <polyline
        points={geo.linePoints}
        fill="none"
        stroke={stroke}
        strokeWidth={4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={geo.lastX} cy={geo.lastY} r={7} fill={stroke} />
      <circle cx={geo.lastX} cy={geo.lastY} r={13} fill={stroke} opacity={0.16} />
    </svg>
  );
}

function buildPremiumOgJsx(inputs: RenderInputs) {
  const {
    handle,
    displayName,
    avatarDataUri,
    logoDataUri,
    hasData,
    record,
    unitsRaw,
    roiPct,
    picksCount,
    trackedSinceLabel,
    filterLabel,
    trajectorySeries,
    tier,
    rank,
  } = inputs;
  const unitsLabel = formatUnitsForTitle(unitsRaw);
  const roiLabel = formatRoiNumeric(roiPct);
  const unitsColor = unitsRaw >= 0 ? POS : NEG;
  const roiColor = roiPct >= 0 ? POS : NEG;
  const initial = handle.slice(0, 1).toUpperCase();
  const visuals = tierVisuals(tier, rank);
  const parsed = parseRecordLine(record);
  const decisions = parsed.wins + parsed.losses;
  const winPct = decisions > 0 ? Math.round((parsed.wins / decisions) * 100) : 0;
  const subline = filterLabel
    ? `${filterLabel} - ${picksCount} graded picks`
    : trackedSinceLabel
      ? `Tracked since ${trackedSinceLabel} - ${picksCount} graded picks`
      : `${picksCount} graded picks`;
  const primaryFilterLabel = filterLabel || "Season";
  const marketContext = filterLabel.toLowerCase().includes("total")
    ? "Market filter"
    : filterLabel
      ? "Filtered view"
      : "All bets";

  return (
    <div style={{
      width: "100%",
      height: "100%",
      display: "flex",
      background:
        "radial-gradient(circle at 18% 16%, rgba(71,199,255,0.18), transparent 30%), radial-gradient(circle at 82% 8%, rgba(245,197,74,0.16), transparent 28%), linear-gradient(135deg, #060709 0%, #11131a 52%, #07080b 100%)",
      fontFamily: "system-ui, sans-serif",
      color: TEXT,
      padding: 34,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute",
        left: -120,
        bottom: -180,
        width: 620,
        height: 620,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
      }} />
      <div style={{
        position: "absolute",
        right: -80,
        top: 70,
        width: 360,
        height: 900,
        transform: "rotate(20deg)",
        background: "linear-gradient(180deg, rgba(25,245,124,0.14), rgba(71,199,255,0.05), transparent)",
        display: "flex",
      }} />
      {visuals.ribbonRank !== null ? <CornerRibbon rank={visuals.ribbonRank} /> : null}

      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        border: "1px solid rgba(255,255,255,0.13)",
        borderRadius: 28,
        background: "rgba(8,10,14,0.78)",
        boxShadow: "0 28px 80px rgba(0,0,0,0.58), inset 0 1px 0 rgba(255,255,255,0.08)",
        overflow: "hidden",
        position: "relative",
      }}>
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 5,
          background: `linear-gradient(90deg, ${POS}, ${CYAN}, ${AMBER})`,
          display: "flex",
        }} />

        <div style={{
          width: 345,
          display: "flex",
          flexDirection: "column",
          padding: "38px 32px",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))",
        }}>
          {logoDataUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoDataUri} alt="TailSlips" height={50} style={{ height: 50, width: 199 }} />
          ) : (
            <div style={{ fontSize: 32, fontWeight: 900, display: "flex" }}>TAILSLIPS</div>
          )}

          <div style={{ display: "flex", marginTop: 42, alignItems: "center" }}>
            {avatarDataUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarDataUri} alt="" width={140} height={140}
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 999,
                  border: `4px solid ${tier === "standard" ? "rgba(255,255,255,0.16)" : visuals.avatarBorder}`,
                  boxShadow: visuals.avatarShadow === "none"
                    ? "0 16px 40px rgba(0,0,0,0.45)"
                    : visuals.avatarShadow,
                  objectFit: "cover",
                }} />
            ) : (
              <div style={{
                width: 140,
                height: 140,
                borderRadius: 999,
                background: "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))",
                border: "4px solid rgba(255,255,255,0.16)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 58,
                fontWeight: 900,
                color: TEXT_SOFT,
              }}>
                {initial}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 30 }}>
            <div style={{ display: "flex", fontSize: 46, fontWeight: 900, lineHeight: 1 }}>
              @{handle}
            </div>
            {displayName && displayName !== handle ? (
              <div style={{ display: "flex", fontSize: 20, color: TEXT_MUTED, marginTop: 8, fontWeight: 800 }}>
                {displayName}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 28 }}>
            {visuals.pill ? <Capsule text={visuals.pill.text} color={visuals.pill.color} /> : null}
          </div>

          <div style={{ display: "flex", marginTop: "auto", color: TEXT_MUTED, fontSize: 15, fontWeight: 800 }}>
            {subline}
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "38px 44px 34px", minWidth: 0 }}>
          {hasData ? (
            <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 18,
                padding: "13px 16px",
                borderRadius: 16,
                background: "linear-gradient(90deg, rgba(71,199,255,0.16), rgba(25,245,124,0.08))",
                border: `1px solid ${CYAN}`,
              }}>
                <div style={{
                  display: "flex",
                  fontSize: 16,
                  fontWeight: 900,
                  color: CYAN,
                  textTransform: "uppercase",
                  letterSpacing: 2.8,
                }}>
                  {marketContext}
                </div>
                <div style={{
                  display: "flex",
                  fontSize: 28,
                  fontWeight: 950,
                  color: TEXT,
                  textTransform: "uppercase",
                  letterSpacing: 1.6,
                }}>
                  {primaryFilterLabel}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                  <div style={{ display: "flex", color: TEXT_MUTED, fontSize: 18, fontWeight: 900, textTransform: "uppercase", letterSpacing: 3 }}>
                    Net profit
                  </div>
                  <div style={{
                    display: "flex",
                    marginTop: 8,
                    fontSize: 108,
                    fontWeight: 950,
                    lineHeight: 0.92,
                    color: unitsColor,
                    textShadow: unitsRaw >= 0
                      ? "0 0 34px rgba(25,245,124,0.24)"
                      : "0 0 34px rgba(239,68,68,0.22)",
                  }}>
                    {unitsLabel}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", paddingTop: 8, width: 178 }}>
                  <div style={{ display: "flex", fontSize: 17, color: TEXT_MUTED, fontWeight: 900, textTransform: "uppercase", letterSpacing: 3 }}>
                    ROI
                  </div>
                  <div style={{ display: "flex", marginTop: 8, fontSize: 52, fontWeight: 900, color: roiColor }}>
                    {roiLabel}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.16), rgba(255,255,255,0.02))", marginTop: 20 }} />

              <div style={{ display: "flex", gap: 14, marginTop: 18, width: "100%" }}>
                <StatTile label="Record" value={record} valueColor={TEXT} />
                <StatTile label="Win rate" value={`${winPct}%`} valueColor={winPct >= 50 ? POS : TEXT} />
                <StatTile label="Graded picks" value={String(picksCount)} valueColor={TEXT} />
              </div>

              <div style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 18,
                padding: "14px 18px 10px",
                borderRadius: 18,
                background: "rgba(255,255,255,0.035)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", fontSize: 15, color: TEXT_MUTED, fontWeight: 900, textTransform: "uppercase", letterSpacing: 2.8 }}>
                    Profit trajectory
                  </div>
                  <div style={{ display: "flex", fontSize: 16, color: TEXT_SOFT, fontWeight: 900 }}>
                    {primaryFilterLabel}
                  </div>
                </div>
                <div style={{ display: "flex", marginTop: 8 }}>
                  <OgSparkline series={trajectorySeries} />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
              <div style={{ display: "flex", fontSize: 64, fontWeight: 900 }}>Tracked on TailSlips</div>
              <div style={{ display: "flex", marginTop: 18, fontSize: 26, color: TEXT_MUTED, fontWeight: 700 }}>
                Pick history grading in progress.
              </div>
            </div>
          )}

          <div style={{ display: "flex", marginTop: "auto", alignItems: "center", justifyContent: "space-between", color: TEXT_MUTED, fontSize: 15, fontWeight: 800 }}>
            <div style={{ display: "flex" }}>Verified MLB picks. Public tweets parsed and graded.</div>
            <div style={{ display: "flex", color: TEXT_SOFT }}>tailslips.com</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildOgJsx(inputs: RenderInputs) {
  const {
    handle,
    displayName,
    avatarDataUri,
    logoDataUri,
    hasData,
    record,
    unitsRaw,
    roiPct,
    picksCount,
    trackedSinceLabel,
    filterLabel,
    tier,
    rank,
  } = inputs;
  const unitsLabel = formatUnitsForTitle(unitsRaw);
  const roiLabel = formatRoiNumeric(roiPct);
  const unitsColor = unitsRaw >= 0 ? POS : NEG;
  const roiColor = roiPct >= 0 ? POS : NEG;
  const initial = handle.slice(0, 1).toUpperCase();
  const visuals = tierVisuals(tier, rank);

  // Subline composition. When a filter is active, lead with the filter cut
  // so viewers immediately know they're seeing a slice (Straights, Season,
  // etc.) and not the default all-time view.
  const baseSubline = trackedSinceLabel
    ? `Tracked since ${trackedSinceLabel} · ${picksCount} graded picks`
    : `${picksCount} graded picks`;
  const subline = filterLabel ? `${filterLabel} · ${picksCount} graded picks` : baseSubline;

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
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: "18px 22px",
      }}
    >
      <div
        style={{
          fontSize: 13,
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
          fontSize: 48,
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
