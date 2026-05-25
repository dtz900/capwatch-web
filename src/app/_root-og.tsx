import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { fetchLeaderboard } from "@/lib/api";
import type { BetTypeFilter, CapperRow, Sort, Window } from "@/lib/types";

// Shared renderer for the homepage OG card. Used by both the file-convention
// route (app/opengraph-image.tsx) and the explicit Route Handler at
// app/og/home/route.ts. The Route Handler is what generateMetadata on the
// homepage points at, fingerprinted with the current leaderboard volume so
// X scrapes a fresh URL whenever picks graded changes. The file-convention
// route stays as a fallback for non-tag-aware scrapers.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "TailSlips · MLB Capper Scoreboard";

const BG = "#0a0a0c";
const TEXT = "#fafafa";
const TEXT_SOFT = "#d4d4d8";
const TEXT_MUTED = "#71717a";
const POS = "#19f57c";
const NEG = "#ef4444";
const MINT = "#5eead4";
const GOLD = "#f5c54a";
const ROW_BORDER = "rgba(255, 255, 255, 0.06)";

const PRIMARY_CACHE = "public, max-age=60, s-maxage=60, stale-while-revalidate=300";
const FALLBACK_CACHE = "public, max-age=30, s-maxage=30, stale-while-revalidate=120";
export const ROOT_OG_CARD_VERSION = "2";

export interface RootOgFilters {
  window: Window;
  sort: Sort;
  bet_type: BetTypeFilter;
  active_only: boolean;
}

export const DEFAULT_ROOT_OG_FILTERS: RootOgFilters = {
  window: "last_30",
  sort: "units_profit",
  bet_type: "all",
  active_only: true,
};

async function readLogoDataUri(): Promise<string | null> {
  try {
    const path = join(process.cwd(), "public", "logo-horizontal-aligned-tight.png");
    const buf = await readFile(path);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

interface TopRow {
  handle: string;
  unitsProfit: number;
  roiPct: number;
  record: string;
}

interface PlatformStats {
  graded_picks_total?: number | null;
  cappers_tracked?: number | null;
}

function formatUnits(units: number): string {
  const sign = units > 0 ? "+" : units < 0 ? "" : "";
  return `${sign}${units.toFixed(2)}u`;
}

function formatRoi(roi: number): string {
  const sign = roi > 0 ? "+" : "";
  return `${sign}${roi.toFixed(1)}%`;
}

function buildRecord(row: CapperRow): string {
  if (row.pushes > 0) return `${row.wins}-${row.losses}-${row.pushes}`;
  return `${row.wins}-${row.losses}`;
}

function formatGradedTotal(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US");
}

async function fetchTop5(filters: RootOgFilters): Promise<{ rows: TopRow[]; stats: PlatformStats }> {
  try {
    const data = await fetchLeaderboard({
      window: filters.window,
      sort: filters.sort,
      bet_type: filters.bet_type,
      min_picks: 10,
      active_only: filters.active_only,
    });
    const rows: TopRow[] = data.leaderboard.slice(0, 5).map((r) => ({
      handle: r.handle ?? "?",
      unitsProfit: r.units_profit,
      roiPct: r.roi_pct,
      record: buildRecord(r),
    }));
    return { rows, stats: data.platform_stats ?? {} };
  } catch (err) {
    console.error("[root og] fetchTop5 failed", err);
    return { rows: [], stats: {} };
  }
}

export async function renderRootOg(filters: RootOgFilters = DEFAULT_ROOT_OG_FILTERS): Promise<Response> {
  const [{ rows, stats }, logoDataUri] = await Promise.all([
    fetchTop5(filters),
    readLogoDataUri(),
  ]);

  try {
    const primary = new ImageResponse(buildJsx({ rows, stats, logoDataUri, filters }), { ...size });
    const buf = await primary.arrayBuffer();
    return new Response(buf, {
      headers: { "content-type": "image/png", "cache-control": PRIMARY_CACHE },
    });
  } catch (err) {
    console.error("[root og] primary render failed", err);
    try {
      const fallback = new ImageResponse(buildFallbackJsx(logoDataUri), { ...size });
      const buf = await fallback.arrayBuffer();
      return new Response(buf, {
        headers: { "content-type": "image/png", "cache-control": FALLBACK_CACHE },
      });
    } catch {
      return new Response(
        Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
          "base64",
        ),
        { headers: { "content-type": "image/png", "cache-control": FALLBACK_CACHE } },
      );
    }
  }
}

/**
 * Fingerprint for the OG image URL. Picks_graded_total is a monotonically
 * increasing counter that bumps whenever any tracked capper's pick is graded,
 * so the URL changes whenever the underlying data does. cappers_tracked
 * folds in as a secondary tick so adding/removing a tracked account also
 * busts the cache. Date is included as a daily fallback in case the API
 * returns null stats (so X still re-scrapes at least once per day).
 */
export async function buildRootOgFingerprint(filters: RootOgFilters = DEFAULT_ROOT_OG_FILTERS): Promise<{
  ptDate: string;
  picks: number;
  cappers: number;
  contentHash: string;
}> {
  let picks = 0;
  let cappers = 0;
  let contentHash = "";
  try {
    const data = await fetchLeaderboard({
      window: filters.window,
      sort: filters.sort,
      bet_type: filters.bet_type,
      min_picks: 10,
      active_only: filters.active_only,
    });
    picks = data.platform_stats?.graded_picks_total ?? 0;
    cappers = data.platform_stats?.cappers_tracked ?? 0;
    contentHash = hashRootFingerprint(
      data.leaderboard.slice(0, 10).map((r) => [
        r.capper_id,
        r.handle,
        r.wins,
        r.losses,
        r.pushes,
        r.units_profit,
        r.roi_pct,
        r.win_rate,
        r.picks_count,
        r.live_picks_count,
      ]),
    );
  } catch {
    // Falls back to date-only fingerprint when the API is unreachable.
  }
  const ptDate = new Date()
    .toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  return { ptDate, picks, cappers, contentHash };
}

function hashRootFingerprint(value: unknown): string {
  const input = JSON.stringify(value);
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function windowLabel(w: Window): string {
  if (w === "last_7") return "Last 7";
  if (w === "last_30") return "Last 30";
  if (w === "season") return "Season";
  return "All-time";
}

function sortLabel(sort: Sort): string {
  if (sort === "roi_pct") return "By ROI";
  if (sort === "win_rate") return "By Win Rate";
  if (sort === "picks_count") return "By Volume";
  return "By Units";
}

function betTypeLabel(bt: BetTypeFilter): string | null {
  if (bt === "straights") return "Straights";
  if (bt === "parlays") return "Parlays";
  return null;
}

function buildJsx({
  rows,
  stats,
  logoDataUri,
  filters,
}: {
  rows: TopRow[];
  stats: PlatformStats;
  logoDataUri: string | null;
  filters: RootOgFilters;
}) {
  const hasRows = rows.length > 0;
  const filterLine = [
    "Top Cappers",
    "MLB",
    windowLabel(filters.window),
    betTypeLabel(filters.bet_type),
    sortLabel(filters.sort),
    filters.active_only ? null : "All Accounts",
  ].filter(Boolean).join(" - ");

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: BG,
        color: TEXT,
        padding: "48px 56px",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: MINT,
          opacity: 0.7,
          display: "flex",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {logoDataUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoDataUri} alt="TailSlips" height={44} style={{ height: 44 }} />
          ) : (
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: -0.5,
                display: "flex",
                color: MINT,
              }}
            >
              TAILSLIPS
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 14px",
            background: "rgba(94, 234, 212, 0.10)",
            border: "1px solid rgba(94, 234, 212, 0.35)",
            color: MINT,
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: 1.6,
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: MINT,
              display: "flex",
            }}
          />
          <div style={{ display: "flex" }}>Live · Graded against final score</div>
        </div>
      </div>

      <div
        style={{
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: 3.2,
          textTransform: "uppercase",
          color: TEXT_MUTED,
          marginBottom: 18,
          display: "flex",
        }}
      >
        {filterLine}
      </div>

      {hasRows ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
          {rows.map((row, i) => {
            const unitsColor = row.unitsProfit > 0 ? POS : row.unitsProfit < 0 ? NEG : TEXT_MUTED;
            const roiColor = row.roiPct > 0 ? POS : row.roiPct < 0 ? NEG : TEXT_MUTED;
            return (
              <div
                key={row.handle}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 8px",
                  borderBottom: i < rows.length - 1 ? `1px solid ${ROW_BORDER}` : "none",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      color: i < 3 ? GOLD : TEXT_MUTED,
                      width: 36,
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    {i + 1}
                  </div>
                  <div
                    style={{
                      fontSize: 38,
                      fontWeight: 800,
                      color: TEXT,
                      letterSpacing: -0.5,
                      display: "flex",
                    }}
                  >
                    @{row.handle}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 28 }}>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      color: TEXT_MUTED,
                      width: 110,
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    {row.record}
                  </div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: unitsColor,
                      width: 140,
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    {formatUnits(row.unitsProfit)}
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: roiColor,
                      width: 110,
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    {formatRoi(row.roiPct)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            fontWeight: 700,
            color: TEXT_SOFT,
          }}
        >
          Verified MLB picks from tracked Twitter cappers.
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 18,
          paddingTop: 16,
          borderTop: `1px solid ${ROW_BORDER}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            fontSize: 18,
            color: TEXT_MUTED,
            fontWeight: 700,
            letterSpacing: 1.6,
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: TEXT, fontWeight: 800, display: "flex" }}>
            {formatGradedTotal(stats.cappers_tracked ?? null)}
          </span>
          <span style={{ display: "flex" }}>sharps tracked</span>
          <span style={{ color: "#3a3a42", padding: "0 8px", display: "flex" }}>·</span>
          <span style={{ color: TEXT, fontWeight: 800, display: "flex" }}>
            {formatGradedTotal(stats.graded_picks_total ?? null)}
          </span>
          <span style={{ display: "flex" }}>picks graded</span>
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: MINT,
            letterSpacing: 0.5,
            display: "flex",
          }}
        >
          tailslips.com
        </div>
      </div>
    </div>
  );
}

function buildFallbackJsx(logoDataUri: string | null) {
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
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: MINT,
          opacity: 0.7,
          display: "flex",
        }}
      />
      {logoDataUri ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoDataUri} alt="TailSlips" height={52} style={{ height: 52 }} />
      ) : (
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -0.5, display: "flex", color: MINT }}>
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
        <div style={{ color: MINT, fontWeight: 800, display: "flex" }}>tailslips.com</div>
      </div>
    </div>
  );
}
