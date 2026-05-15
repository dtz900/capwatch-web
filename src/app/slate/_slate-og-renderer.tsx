import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { fetchLeaderboard, fetchSlate } from "@/lib/api";
import { pickMlSide } from "@/lib/bet-format";
import { teamColor, teamLogoUrl } from "@/lib/mlb-teams";
import type { CapperRow, SlateGame, SlatePick } from "@/lib/types";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Tonight's MLB slate on TailSlips";

// Color tokens. Kept in sync with the root opengraph-image so shared cards
// across the site read as one visual identity.
const BG = "#0a0a0c";
const TEXT = "#fafafa";
const TEXT_SOFT = "#d4d4d8";
const TEXT_MUTED = "#71717a";
const POS = "#19f57c";
const NEG = "#ef4444";
const MINT = "#5eead4";
const GOLD = "#f5c54a";
const ROW_BORDER = "rgba(255, 255, 255, 0.06)";
const CARD_BG = "rgba(255, 255, 255, 0.025)";

const PRIMARY_CACHE = "public, max-age=60, s-maxage=60, stale-while-revalidate=300";
const FALLBACK_CACHE = "public, max-age=30, s-maxage=30, stale-while-revalidate=120";

interface RosterRow {
  handle: string;
  unitsProfit: number;
  picksTonight: number;
}

interface MarqueeSide {
  team: string | null;
  count: number;
  handles: string[];
}

interface MarqueeBlock {
  awayTeam: string | null;
  homeTeam: string | null;
  awayLogoDataUri: string | null;
  homeLogoDataUri: string | null;
  gameTime: string | null;
  awayStarter: string | null;
  homeStarter: string | null;
  totalPicks: number;
  away: MarqueeSide;
  home: MarqueeSide;
  otherCount: number;
}

interface RenderInputs {
  logoDataUri: string | null;
  dateLabel: string;
  totalGames: number;
  sharpsPosted: number;
  picksTotal: number;
  marquee: MarqueeBlock | null;
  roster: RosterRow[];
  hasAnyPicks: boolean;
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

async function fetchRemoteImageAsDataUri(url: string | null): Promise<string | null> {
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

async function fetchTeamLogosForGame(
  awayTeam: string | null,
  homeTeam: string | null,
): Promise<{ away: string | null; home: string | null }> {
  const [away, home] = await Promise.all([
    fetchRemoteImageAsDataUri(teamLogoUrl(awayTeam)),
    fetchRemoteImageAsDataUri(teamLogoUrl(homeTeam)),
  ]);
  return { away, home };
}

function formatUnits(units: number): string {
  const sign = units > 0 ? "+" : "";
  return `${sign}${units.toFixed(2)}u`;
}

// Mirrors the slate page's pitcher name shortener so the OG card reads the
// same way as the page it's previewing.
function shortPitcher(name: string | null): string | null {
  if (!name) return null;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

function formatGameTime(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const t = new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    });
    return `${t} ET`;
  } catch {
    return null;
  }
}

function pickMarqueeGame(games: SlateGame[]): SlateGame | null {
  let best: SlateGame | null = null;
  for (const g of games) {
    if (g.picks.length === 0) continue;
    if (!best || g.picks.length > best.picks.length) best = g;
  }
  return best;
}

function buildMarqueeBlock(
  game: SlateGame,
  awayLogoDataUri: string | null,
  homeLogoDataUri: string | null,
): MarqueeBlock {
  const awayHandles: string[] = [];
  const homeHandles: string[] = [];
  let other = 0;
  for (const p of game.picks) {
    const side = pickMlSide(p, game.away_team, game.home_team);
    const h = p.handle;
    if (side === "away" && h) awayHandles.push(h);
    else if (side === "home" && h) homeHandles.push(h);
    else other += 1;
  }
  return {
    awayTeam: game.away_team,
    homeTeam: game.home_team,
    awayLogoDataUri,
    homeLogoDataUri,
    gameTime: game.game_time,
    awayStarter: game.away_starter,
    homeStarter: game.home_starter,
    totalPicks: game.picks.length,
    away: { team: game.away_team, count: awayHandles.length, handles: awayHandles },
    home: { team: game.home_team, count: homeHandles.length, handles: homeHandles },
    otherCount: other,
  };
}

function buildRoster(
  allPicks: SlatePick[],
  leaderboard: CapperRow[],
  limit: number,
): RosterRow[] {
  const picksTonightByHandle = new Map<string, number>();
  for (const p of allPicks) {
    if (!p.handle) continue;
    picksTonightByHandle.set(p.handle, (picksTonightByHandle.get(p.handle) ?? 0) + 1);
  }
  const rows: RosterRow[] = [];
  for (const c of leaderboard) {
    if (!c.handle) continue;
    const count = picksTonightByHandle.get(c.handle);
    if (!count) continue;
    rows.push({
      handle: c.handle,
      unitsProfit: c.units_profit,
      picksTonight: count,
    });
    if (rows.length >= limit) break;
  }
  return rows;
}

export async function renderSlateOg(): Promise<Response> {
  const [slateResult, lbResult, logoDataUri] = await Promise.allSettled([
    fetchSlate("today"),
    fetchLeaderboard({
      window: "season",
      sort: "units_profit",
      bet_type: "all",
      min_picks: 10,
      active_only: true,
    }),
    readLogoDataUri(),
  ]);

  const slate = slateResult.status === "fulfilled" ? slateResult.value : null;
  const lb = lbResult.status === "fulfilled" ? lbResult.value : null;
  const logo = logoDataUri.status === "fulfilled" ? logoDataUri.value : null;

  const games = slate?.games ?? [];
  const allPicks = games.flatMap((g) => g.picks);
  const sharpsPosted = new Set(allPicks.map((p) => p.capper_id)).size;
  const marqueeGame = pickMarqueeGame(games);
  const teamLogos = marqueeGame
    ? await fetchTeamLogosForGame(marqueeGame.away_team, marqueeGame.home_team)
    : { away: null, home: null };
  const marquee = marqueeGame
    ? buildMarqueeBlock(marqueeGame, teamLogos.away, teamLogos.home)
    : null;
  const roster = lb ? buildRoster(allPicks, lb.leaderboard, 3) : [];

  const inputs: RenderInputs = {
    logoDataUri: logo,
    dateLabel: "Tonight",
    totalGames: games.length,
    sharpsPosted,
    picksTotal: allPicks.length,
    marquee,
    roster,
    hasAnyPicks: allPicks.length > 0,
  };

  try {
    const primary = new ImageResponse(buildJsx(inputs), { ...size });
    const buf = await primary.arrayBuffer();
    return new Response(buf, {
      headers: { "content-type": "image/png", "cache-control": PRIMARY_CACHE },
    });
  } catch (err) {
    console.error("[slate-og-renderer] primary render failed", err);
    try {
      const fallback = new ImageResponse(buildFallbackJsx(logo), { ...size });
      const buf = await fallback.arrayBuffer();
      return new Response(buf, {
        headers: { "content-type": "image/png", "cache-control": FALLBACK_CACHE },
      });
    } catch (err2) {
      console.error("[slate-og-renderer] fallback render failed", err2);
      return new Response(TRANSPARENT_PNG, {
        headers: { "content-type": "image/png", "cache-control": FALLBACK_CACHE },
      });
    }
  }
}

const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
  "base64",
);

function LogoOrWordmark({ logo, height = 44 }: { logo: string | null; height?: number }) {
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo} alt="TailSlips" height={height} style={{ height }} />
    );
  }
  return (
    <div
      style={{
        fontSize: 32,
        fontWeight: 800,
        letterSpacing: -0.5,
        color: MINT,
        display: "flex",
      }}
    >
      TAILSLIPS
    </div>
  );
}

function LivePill() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        background: "rgba(94, 234, 212, 0.10)",
        border: "1px solid rgba(94, 234, 212, 0.35)",
        color: MINT,
        fontSize: 13,
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
      <div style={{ display: "flex" }}>Live · Pre-game</div>
    </div>
  );
}

function buildJsx(inputs: RenderInputs) {
  const { logoDataUri, totalGames, sharpsPosted, picksTotal, marquee, roster, hasAnyPicks } =
    inputs;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: BG,
        color: TEXT,
        padding: "28px 56px 22px",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}
    >
      {/* Mint hairline matches the root OG card. */}
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

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <LogoOrWordmark logo={logoDataUri} />
        <LivePill />
      </div>

      {/* Hero line: tonight's volume */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: TEXT,
            letterSpacing: -1,
            display: "flex",
          }}
        >
          Tonight
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: TEXT_MUTED,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          {totalGames} {totalGames === 1 ? "game" : "games"}
          {hasAnyPicks
            ? ` · ${sharpsPosted} ${sharpsPosted === 1 ? "sharp" : "sharps"} posted`
            : " · no picks tweeted yet"}
        </div>
      </div>

      {/* Marquee game block */}
      {marquee ? <MarqueeBlockView marquee={marquee} /> : null}

      {/* Roster block */}
      {roster.length > 0 ? <RosterBlockView roster={roster} /> : null}

      {/* Fallback content for no-picks state */}
      {!hasAnyPicks ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            fontWeight: 700,
            color: TEXT_SOFT,
            textAlign: "center",
          }}
        >
          Sharps haven't posted yet. Check back as picks hit Twitter.
        </div>
      ) : null}

      {/* Footer */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: 14,
          borderTop: `1px solid ${ROW_BORDER}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            fontSize: 15,
            color: TEXT_MUTED,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: TEXT, fontWeight: 800, display: "flex" }}>{picksTotal}</span>
          <span style={{ display: "flex" }}>
            {picksTotal === 1 ? "pick" : "picks"} tracked tonight
          </span>
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: MINT,
            letterSpacing: 0.5,
            display: "flex",
          }}
        >
          tailslips.com/slate
        </div>
      </div>
    </div>
  );
}

function TeamLogo({ src, size }: { src: string | null; size: number }) {
  if (!src) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          background: "rgba(255, 255, 255, 0.05)",
          display: "flex",
        }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain", display: "flex" }}
    />
  );
}

function MarqueeBlockView({ marquee }: { marquee: MarqueeBlock }) {
  const awayColor = teamColor(marquee.awayTeam);
  const homeColor = teamColor(marquee.homeTeam);
  const timeLabel = formatGameTime(marquee.gameTime);
  const awayPitcher = shortPitcher(marquee.awayStarter);
  const homePitcher = shortPitcher(marquee.homeStarter);
  const pitcherLine =
    awayPitcher && homePitcher ? `${awayPitcher} vs ${homePitcher}` : awayPitcher ?? homePitcher;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: CARD_BG,
        border: `1px solid ${ROW_BORDER}`,
        borderRadius: 14,
        marginBottom: 14,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Team-color hairline at the top, echoing the slate page matchup block. */}
      <div
        style={{
          height: 3,
          width: "100%",
          background: `linear-gradient(90deg, ${awayColor} 0%, ${awayColor} 50%, ${homeColor} 50%, ${homeColor} 100%)`,
          opacity: 0.85,
          display: "flex",
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", padding: "10px 22px 12px" }}>
        {/* Title bar: MATCHUP label + most-bet pill + game time */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 2.4,
                textTransform: "uppercase",
                color: TEXT_MUTED,
                display: "flex",
              }}
            >
              Matchup
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 2.4,
                textTransform: "uppercase",
                color: GOLD,
                padding: "3px 8px",
                border: `1px solid rgba(245, 197, 74, 0.45)`,
                background: "rgba(245, 197, 74, 0.08)",
                display: "flex",
              }}
            >
              Most-bet · {marquee.totalPicks} sharps
            </div>
          </div>
          {timeLabel ? (
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: TEXT_SOFT,
                letterSpacing: 0.4,
                display: "flex",
              }}
            >
              {timeLabel}
            </div>
          ) : null}
        </div>

        {/* Center: logos + VS + abbrs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 36,
            marginTop: 4,
            marginBottom: pitcherLine ? 4 : 10,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <TeamLogo src={marquee.awayLogoDataUri} size={64} />
            <div
              style={{
                fontSize: 30,
                fontWeight: 800,
                color: TEXT,
                letterSpacing: -0.5,
                marginTop: 2,
                display: "flex",
              }}
            >
              {marquee.awayTeam ?? "?"}
            </div>
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: TEXT_MUTED,
              letterSpacing: 3,
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            VS
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <TeamLogo src={marquee.homeLogoDataUri} size={64} />
            <div
              style={{
                fontSize: 30,
                fontWeight: 800,
                color: TEXT,
                letterSpacing: -0.5,
                marginTop: 2,
                display: "flex",
              }}
            >
              {marquee.homeTeam ?? "?"}
            </div>
          </div>
        </div>

        {/* Pitcher line, centered. */}
        {pitcherLine ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 600,
              color: TEXT_MUTED,
              letterSpacing: 0.2,
              marginBottom: 10,
            }}
          >
            {pitcherLine}
          </div>
        ) : null}

        {/* Two BACKING tiles, mirroring the slate page Side component. */}
        <div style={{ display: "flex", gap: 14 }}>
          <BackingTile side={marquee.away} color={awayColor} />
          <BackingTile side={marquee.home} color={homeColor} />
        </div>
      </div>
    </div>
  );
}

function BackingTile({ side, color }: { side: MarqueeSide; color: string }) {
  const visible = side.handles.slice(0, 3);
  const extra = side.handles.length - visible.length;
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      {/* Header row with team-color underline, matching slate page Side. */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          paddingBottom: 4,
          borderBottom: `2px solid ${color}`,
          marginBottom: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 1.8,
              textTransform: "uppercase",
              color: TEXT_MUTED,
              display: "flex",
            }}
          >
            Backing
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color,
              letterSpacing: -0.3,
              display: "flex",
            }}
          >
            {side.team ?? "—"}
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: TEXT_MUTED,
              display: "flex",
            }}
          >
            moneyline
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: TEXT_MUTED,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          {side.count} {side.count === 1 ? "sharp" : "sharps"}
        </div>
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: TEXT_SOFT,
          letterSpacing: -0.2,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {visible.length === 0 ? (
          <span style={{ color: TEXT_MUTED, fontStyle: "italic", display: "flex" }}>
            no sharps on this side
          </span>
        ) : (
          visible.map((h) => (
            <span key={h} style={{ display: "flex" }}>
              @{h}
            </span>
          ))
        )}
        {extra > 0 ? (
          <span style={{ color: TEXT_MUTED, display: "flex" }}>+{extra}</span>
        ) : null}
      </div>
    </div>
  );
}

function RosterBlockView({ roster }: { roster: RosterRow[] }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: CARD_BG,
        border: `1px solid ${ROW_BORDER}`,
        borderRadius: 14,
        padding: "10px 22px 12px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 2.4,
          textTransform: "uppercase",
          color: MINT,
          marginBottom: 4,
          display: "flex",
        }}
      >
        Top sharps on tonight's board · season units
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {roster.map((row, i) => {
          const unitsColor = row.unitsProfit > 0 ? POS : row.unitsProfit < 0 ? NEG : TEXT_MUTED;
          return (
            <div
              key={row.handle}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "5px 0",
                borderBottom: i < roster.length - 1 ? `1px solid ${ROW_BORDER}` : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: GOLD,
                    width: 24,
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  {i + 1}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: TEXT,
                    letterSpacing: -0.4,
                    display: "flex",
                  }}
                >
                  @{row.handle}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: unitsColor,
                    width: 100,
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  {formatUnits(row.unitsProfit)}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: TEXT_MUTED,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    width: 150,
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  {row.picksTonight} {row.picksTonight === 1 ? "pick" : "picks"} tonight
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildFallbackJsx(logo: string | null) {
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
      <LogoOrWordmark logo={logo} height={52} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            lineHeight: 1.0,
            letterSpacing: -3,
            display: "flex",
          }}
        >
          Tonight's MLB slate.
        </div>
        <div
          style={{
            fontSize: 26,
            color: TEXT_MUTED,
            marginTop: 24,
            fontWeight: 600,
            display: "flex",
          }}
        >
          Every tracked sharp's pick, grouped by game, ranked by leaderboard.
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
        <div style={{ display: "flex" }}>tailslips.com/slate</div>
        <div style={{ color: MINT, fontWeight: 800, display: "flex" }}>TailSlips</div>
      </div>
    </div>
  );
}
