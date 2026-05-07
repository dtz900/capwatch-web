import { ImageResponse } from "next/og";
import { fetchCapperProfile } from "@/lib/api";
import { formatRecord, formatRoiForTitle, formatUnitsForTitle } from "@/lib/seo";

export const runtime = "nodejs";
export const alt = "Verified MLB capper record on TailSlips";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#0a0a0c";
const CARD = "#111114";
const BORDER = "#26262b";
const TEXT = "#f5f5f5";
const MUTED = "#9a9aa1";
const POS = "#3ddc84";
const NEG = "#ff6b6b";
const BRAND_GOLD = "#f5c54a";

interface RenderInputs {
  handle: string;
  displayName: string | null;
  avatarDataUri: string | null;
  hasData: boolean;
  record: string;
  unitsRaw: number;
  roiPct: number;
  picksCount: number;
  trackedSinceLabel: string;
}

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
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get("content-type") ?? "image/jpeg";
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
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
    const profile = await fetchCapperProfile(handle, { history_limit: 0, history_offset: 0 });
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
  } catch {
    // fallthrough renders the no-data variant
  }

  // Prefetch the avatar bytes with a timeout. If pbs.twimg.com 403s us or the
  // network hiccups, fall back to the initial-letter circle so the OG route
  // never throws (a 500 here causes social crawlers to cache a failed card).
  const avatarDataUri = await fetchAvatarDataUri(avatarSourceUrl);

  const inputs: RenderInputs = {
    handle,
    displayName,
    avatarDataUri,
    hasData,
    record,
    unitsRaw,
    roiPct,
    picksCount,
    trackedSinceLabel: trackedSince ? formatTrackedSince(trackedSince) : "",
  };

  try {
    return new ImageResponse(buildOgJsx(inputs), {
      ...size,
      headers: {
        "cache-control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new ImageResponse(buildFallbackJsx(handle), {
      ...size,
      headers: {
        "cache-control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
      },
    });
  }
}

function buildOgJsx(inputs: RenderInputs) {
  const { handle, displayName, avatarDataUri, hasData, record, unitsRaw, roiPct, picksCount, trackedSinceLabel } = inputs;
  const unitsLabel = formatUnitsForTitle(unitsRaw);
  const roiLabel = formatRoiForTitle(roiPct);
  const unitsColor = unitsRaw >= 0 ? POS : NEG;
  const roiColor = roiPct >= 0 ? POS : NEG;

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
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: BRAND_GOLD,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1a1305",
              fontWeight: 800,
              fontSize: 22,
            }}
          >
            T
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>TAILSLIPS</div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            border: `1px solid ${BORDER}`,
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 600,
            color: MUTED,
            letterSpacing: 1.4,
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
              color: MUTED,
            }}
          >
            {handle.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>
            @{handle}
          </div>
          {displayName && displayName !== handle && (
            <div style={{ fontSize: 22, fontWeight: 600, color: MUTED, marginTop: 10 }}>
              {displayName}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 56 }}>
        {hasData ? (
          <>
            <StatTile label="Record" value={record} valueColor={TEXT} />
            <StatTile label="Units" value={unitsLabel} valueColor={unitsColor} />
            <StatTile label="ROI" value={roiLabel} valueColor={roiColor} />
            <StatTile label="Graded picks" value={String(picksCount)} valueColor={TEXT} />
          </>
        ) : (
          <div
            style={{
              display: "flex",
              padding: "28px 36px",
              border: `1px solid ${BORDER}`,
              borderRadius: 18,
              fontSize: 22,
              color: MUTED,
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
          fontSize: 18,
          color: MUTED,
          fontWeight: 600,
        }}
      >
        <div style={{ display: "flex" }}>
          {trackedSinceLabel
            ? `Tracked since ${trackedSinceLabel}. Every public pick parsed live, graded against final outcomes.`
            : "Every public pick parsed live, graded against final outcomes."}
        </div>
        <div style={{ display: "flex", color: BRAND_GOLD, fontWeight: 700 }}>tailslips.com</div>
      </div>
    </div>
  );
}

function buildFallbackJsx(handle: string) {
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
        <div style={{ fontSize: 80, fontWeight: 800, letterSpacing: -2, display: "flex" }}>
          @{handle}
        </div>
        <div style={{ fontSize: 26, color: MUTED, marginTop: 16, fontWeight: 600, display: "flex" }}>
          Verified MLB capper record on TailSlips
        </div>
      </div>
      <div style={{ color: BRAND_GOLD, fontWeight: 700, fontSize: 22, display: "flex" }}>
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
          fontSize: 13,
          fontWeight: 700,
          color: MUTED,
          letterSpacing: 1.6,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 52,
          fontWeight: 800,
          color: valueColor,
          marginTop: 8,
          letterSpacing: -1.5,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
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
