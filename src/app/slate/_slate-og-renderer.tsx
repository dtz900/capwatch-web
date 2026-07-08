import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { fetchLeaderboard, fetchSlate } from "@/lib/api";
import { pickMlSide } from "@/lib/bet-format";
import { teamColor, teamLogoUrl } from "@/lib/mlb-teams";
import type { SlateGame } from "@/lib/types";

// Rendered at 1x (1200x630). This is the config X's crawler scrapes reliably;
// a 2x canvas made the cold render heavier (Twitterbot timed out and cached a
// blank card) and mismatched the declared og:image dimensions.
const SCALE = 1;
export const size = { width: 1200 * SCALE, height: 630 * SCALE };
export const contentType = "image/png";
export const alt = "Tonight's MLB slate on TailSlips";

const px = (n: number): number => n * SCALE;

// Palette: the site's BetMGM off-white on near-black, team colors as the only
// strong accents. No mint, no gold, no pure white on chrome.
const BG = "#0a0a0c";
const OFF = "#f7f3e9"; // primary light text
const OFF_DIM = "rgba(247, 243, 233, 0.62)"; // secondary labels
const OFF_FAINT = "rgba(247, 243, 233, 0.40)"; // tertiary
const HAIR = "rgba(247, 243, 233, 0.12)"; // borders / seams
const PANEL_BG = "rgba(255, 255, 255, 0.02)";

const PRIMARY_CACHE = "public, max-age=60, s-maxage=60, stale-while-revalidate=300";
const FALLBACK_CACHE = "public, max-age=30, s-maxage=30, stale-while-revalidate=120";

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
  sharpCount: number;
  featuredLabel: string;
  away: MarqueeSide;
  home: MarqueeSide;
}

interface RenderInputs {
  logoDataUri: string | null;
  dateLabel: string;
  totalGames: number;
  sharpsPosted: number;
  picksTotal: number;
  marquee: MarqueeBlock | null;
  hasAnyPicks: boolean;
}

// --- team color legibility -------------------------------------------------
// Many MLB primaries are near-black (SD, CWS, TB, SEA, HOU...). Rendered raw
// on the dark card they'd vanish. displayTeamColor lightens dark colors just
// enough to stay legible while keeping the brand hue; bright colors pass
// through untouched.
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const int = parseInt(n, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function displayTeamColor(hex: string): string {
  if (!hex.startsWith("#")) return OFF;
  const [r, g, b] = hexToRgb(hex);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b; // 0..255
  if (lum >= 105) return hex;
  const t = ((105 - lum) / 105) * 0.7;
  const mix = (c: number) => Math.round(c + (255 - c) * t);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
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

// Manrope is the site's sans (next/font/google in layout.tsx). The OG image is
// rendered by satori, which has no access to next/font, so without loading the
// real face here the card falls back to satori's plain default — the "cheap
// font" look. Bundled WOFFs in public/fonts keep the render fast and offline.
type OgFont = { name: string; data: Buffer; weight: 500 | 700 | 800; style: "normal" };
let FONT_CACHE: OgFont[] | null = null;
async function loadManropeFonts(): Promise<OgFont[]> {
  if (FONT_CACHE) return FONT_CACHE;
  const weights: Array<500 | 700 | 800> = [500, 700, 800];
  const out: OgFont[] = [];
  for (const w of weights) {
    try {
      const buf = await readFile(join(process.cwd(), "public", "fonts", `manrope-${w}.woff`));
      out.push({ name: "Manrope", data: buf, weight: w, style: "normal" });
    } catch {
      // Missing font file falls back to satori's default; not fatal.
    }
  }
  FONT_CACHE = out;
  return out;
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

// Maps common/natural team abbreviations to the canonical abbr the slate data
// uses. Without this, ?game=ARI-SD fails because Arizona is stored as "AZ".
const SLUG_ABBR_ALIASES: Record<string, string> = {
  ARI: "AZ",
  ARIZONA: "AZ",
  DBACKS: "AZ",
  DIAMONDBACKS: "AZ",
  CHW: "CWS",
  CHISOX: "CWS",
  WHITESOX: "CWS",
  SOX: "CWS",
  OAK: "ATH",
  ATHLETICS: "ATH",
  WAS: "WSH",
  WSN: "WSH",
  NATS: "WSH",
  SFG: "SF",
  SDP: "SD",
  TBR: "TB",
  KCR: "KC",
  KCROYALS: "KC",
};

function normalizeSlugAbbr(token: string): string {
  return SLUG_ABBR_ALIASES[token] ?? token;
}

/**
 * Resolve a requested game from a share slug: a numeric game_id or an
 * "AWAY-HOME" abbr pair in either order (case-insensitive). Common abbr
 * variants (ARI, CHW, OAK, WAS...) are normalized. null => caller falls back
 * to the most-bet game. Powers ?game= on the OG URL.
 */
function resolveRequestedGame(games: SlateGame[], slug: string | undefined): SlateGame | null {
  if (!slug) return null;
  const raw = slug.trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const byId = games.find((g) => g.game_id === Number(raw));
    if (byId) return byId;
  }

  const parts = raw
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)
    .map(normalizeSlugAbbr);
  if (parts.length >= 2) {
    const [a, b] = parts;
    const match = games.find((g) => {
      const away = normalizeSlugAbbr((g.away_team ?? "").toUpperCase());
      const home = normalizeSlugAbbr((g.home_team ?? "").toUpperCase());
      return (away === a && home === b) || (away === b && home === a);
    });
    if (match) return match;
  }
  return null;
}

function buildMarqueeBlock(
  game: SlateGame,
  awayLogoDataUri: string | null,
  homeLogoDataUri: string | null,
  featuredLabel: string,
): MarqueeBlock {
  const awayHandles: string[] = [];
  const homeHandles: string[] = [];
  for (const p of game.picks) {
    const side = pickMlSide(p, game.away_team, game.home_team);
    const h = p.handle;
    if (side === "away" && h) awayHandles.push(h);
    else if (side === "home" && h) homeHandles.push(h);
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
    sharpCount: new Set(game.picks.map((p) => p.capper_id)).size,
    featuredLabel,
    away: { team: game.away_team, count: awayHandles.length, handles: awayHandles },
    home: { team: game.home_team, count: homeHandles.length, handles: homeHandles },
  };
}

export interface RenderSlateOpts {
  dateParam?: "today" | "tomorrow";
  gameSlug?: string;
}

export async function renderSlateOg(opts: RenderSlateOpts = {}): Promise<Response> {
  const dateParam = opts.dateParam === "tomorrow" ? "tomorrow" : "today";
  const [slateResult, logoDataUri] = await Promise.allSettled([
    fetchSlate(dateParam),
    readLogoDataUri(),
  ]);

  const slate = slateResult.status === "fulfilled" ? slateResult.value : null;
  const logo = logoDataUri.status === "fulfilled" ? logoDataUri.value : null;

  const games = slate?.games ?? [];
  const allPicks = games.flatMap((g) => g.picks);
  const sharpsPosted = new Set(allPicks.map((p) => p.capper_id)).size;

  const requestedGame = resolveRequestedGame(games, opts.gameSlug);
  const featuredGame = requestedGame ?? pickMarqueeGame(games);
  const featuredLabel = requestedGame ? "Featured game" : "Most-bet game";
  const teamLogos = featuredGame
    ? await fetchTeamLogosForGame(featuredGame.away_team, featuredGame.home_team)
    : { away: null, home: null };
  const marquee = featuredGame
    ? buildMarqueeBlock(featuredGame, teamLogos.away, teamLogos.home, featuredLabel)
    : null;

  const inputs: RenderInputs = {
    logoDataUri: logo,
    dateLabel: dateParam === "tomorrow" ? "Tomorrow" : "Tonight",
    totalGames: games.length,
    sharpsPosted,
    picksTotal: allPicks.length,
    marquee,
    hasAnyPicks: allPicks.length > 0,
  };

  const fonts = await loadManropeFonts();

  try {
    const primary = new ImageResponse(buildJsx(inputs), { ...size, fonts });
    const buf = await primary.arrayBuffer();
    return new Response(buf, {
      headers: { "content-type": "image/png", "cache-control": PRIMARY_CACHE },
    });
  } catch (err) {
    console.error("[slate-og-renderer] primary render failed", err);
    try {
      const fallback = new ImageResponse(buildFallbackJsx(logo), { ...size, fonts });
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

/**
 * Fingerprint inputs for the slate OG image URL. Folds in pick volume + sharps
 * + season graded-total + a content hash so the URL changes whenever the card
 * would actually look different, forcing X to re-scrape.
 */
export async function buildSlateOgFingerprint(
  dateParam: "today" | "tomorrow",
): Promise<{ etDay: string; picks: number; sharps: number; seasonPicks: number; contentHash: string }> {
  let picks = 0;
  let sharps = 0;
  let seasonPicks = 0;
  let contentHash = "";
  try {
    const slate = await fetchSlate(dateParam);
    const allPicks = slate.games.flatMap((g) => g.picks);
    picks = allPicks.length;
    sharps = new Set(allPicks.map((p) => p.capper_id)).size;
    contentHash = hashSlateFingerprint(
      slate.games.map((g) => ({
        game: g.game_id,
        away: g.away_team,
        home: g.home_team,
        picks: g.picks.map((p) => [
          p.capper_id,
          p.handle,
          p.kind,
          p.market,
          p.selection,
          p.line,
          p.odds_taken,
          p.posted_at,
          p.tweet_url,
          p.outcome,
        ]),
      })),
    );
  } catch {
    // Falls back to date-only fingerprint when slate API is unreachable.
  }
  try {
    const lb = await fetchLeaderboard({
      window: "season",
      sort: "units_profit",
      bet_type: "all",
      min_picks: 10,
      active_only: true,
    });
    seasonPicks = lb.platform_stats?.graded_picks_total ?? 0;
  } catch {
    // Leaderboard fingerprint is optional.
  }
  const etDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + (dateParam === "tomorrow" ? 86_400_000 : 0)));
  return { etDay, picks, sharps, seasonPicks, contentHash };
}

function hashSlateFingerprint(value: unknown): string {
  const input = JSON.stringify(value);
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
  "base64",
);

function Wordmark({ logo, height = 40 }: { logo: string | null; height?: number }) {
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo} alt="TailSlips" height={px(height)} style={{ height: px(height) }} />
    );
  }
  return (
    <div style={{ fontSize: px(32), fontWeight: 800, letterSpacing: -0.5, color: OFF, display: "flex" }}>
      TAILSLIPS
    </div>
  );
}

function TeamLogo({ src, size: s }: { src: string | null; size: number }) {
  const dim = px(s);
  if (!src) {
    return (
      <div
        style={{
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          background: "rgba(255, 255, 255, 0.06)",
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
      width={dim}
      height={dim}
      style={{ width: dim, height: dim, objectFit: "contain", display: "flex" }}
    />
  );
}

function buildJsx(inputs: RenderInputs) {
  const { logoDataUri, marquee, hasAnyPicks } = inputs;

  const awayC = marquee ? displayTeamColor(teamColor(marquee.awayTeam)) : OFF;
  const homeC = marquee ? displayTeamColor(teamColor(marquee.homeTeam)) : OFF;
  const timeLabel = marquee ? formatGameTime(marquee.gameTime) : null;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: BG,
        color: OFF,
        padding: `${px(24)}px ${px(44)}px ${px(20)}px`,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Manrope, sans-serif",
        position: "relative",
      }}
    >
      {/* Top hairline: team-color split when a game is featured, else off-white. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: px(4),
          display: "flex",
          background: marquee
            ? `linear-gradient(90deg, ${awayC} 0%, ${awayC} 50%, ${homeC} 50%, ${homeC} 100%)`
            : OFF,
          opacity: 0.9,
        }}
      />

      {/* Header: wordmark + status/time */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: px(12),
        }}
      >
        <Wordmark logo={logoDataUri} height={38} />
        <div
          style={{
            fontSize: px(16),
            fontWeight: 800,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: OFF_DIM,
            display: "flex",
          }}
        >
          {timeLabel ? `Pre-game · ${timeLabel}` : "Tonight's MLB slate"}
        </div>
      </div>

      {marquee ? (
        <Scoreboard marquee={marquee} awayC={awayC} homeC={homeC} />
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: px(34),
            fontWeight: 800,
            color: OFF,
            textAlign: "center",
          }}
        >
          {hasAnyPicks
            ? "Sharps are posting. Check the board."
            : "Sharps haven't posted yet. Check back as picks hit Twitter."}
        </div>
      )}
    </div>
  );
}

function Scoreboard({
  marquee,
  awayC,
  homeC,
}: {
  marquee: MarqueeBlock;
  awayC: string;
  homeC: string;
}) {
  const awayWash = teamColor(marquee.awayTeam);
  const homeWash = teamColor(marquee.homeTeam);
  const awayPitcher = shortPitcher(marquee.awayStarter);
  const homePitcher = shortPitcher(marquee.homeStarter);
  const pitcherLine =
    awayPitcher && homePitcher ? `${awayPitcher} vs ${homePitcher}` : awayPitcher ?? homePitcher;
  const metaBits = [
    `${marquee.totalPicks} ${marquee.totalPicks === 1 ? "pick" : "picks"} from ${marquee.sharpCount} ${marquee.sharpCount === 1 ? "sharp" : "sharps"}`,
    pitcherLine,
  ].filter(Boolean);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: PANEL_BG,
        border: `${px(1)}px solid ${HAIR}`,
        borderRadius: px(16),
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Card header strip: FEATURED tag + game meta line */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `${px(12)}px ${px(22)}px`,
          borderBottom: `${px(1)}px solid ${HAIR}`,
        }}
      >
        <div
          style={{
            fontSize: px(13),
            fontWeight: 800,
            letterSpacing: 2.2,
            textTransform: "uppercase",
            color: OFF_DIM,
            padding: `${px(4)}px ${px(10)}px`,
            border: `${px(1)}px solid ${HAIR}`,
            borderRadius: px(5),
            display: "flex",
          }}
        >
          {marquee.featuredLabel}
        </div>
        <div
          style={{
            fontSize: px(17),
            fontWeight: 600,
            color: OFF_DIM,
            letterSpacing: 0.2,
            display: "flex",
          }}
        >
          {metaBits.join("  ·  ")}
        </div>
      </div>

      {/* Two team panels + center @ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "row" }}>
        <TeamPanel
          abbr={marquee.awayTeam}
          logo={marquee.awayLogoDataUri}
          color={awayC}
          wash={awayWash}
          count={marquee.away.count}
          handles={marquee.away.handles}
        />
        <div
          style={{
            width: px(64),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingTop: px(58),
            borderLeft: `${px(1)}px solid ${HAIR}`,
            borderRight: `${px(1)}px solid ${HAIR}`,
          }}
        >
          <div style={{ fontSize: px(30), fontWeight: 700, color: OFF_FAINT, display: "flex" }}>@</div>
        </div>
        <TeamPanel
          abbr={marquee.homeTeam}
          logo={marquee.homeLogoDataUri}
          color={homeC}
          wash={homeWash}
          count={marquee.home.count}
          handles={marquee.home.handles}
        />
      </div>
    </div>
  );
}

function TeamPanel({
  abbr,
  logo,
  color,
  wash,
  count,
  handles,
}: {
  abbr: string | null;
  logo: string | null;
  color: string;
  wash: string;
  count: number;
  handles: string[];
}) {
  const visible = handles.slice(0, 2);
  const extra = handles.length - visible.length;
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Team-color wash, strongest at the top, fading down. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          opacity: 0.2,
          background: `linear-gradient(180deg, ${wash} 0%, transparent 62%)`,
        }}
      />
      {/* Solid team-color cap at the very top. */}
      <div style={{ height: px(5), width: "100%", background: color, display: "flex" }} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: `${px(16)}px ${px(18)}px 0`,
          position: "relative",
        }}
      >
        <TeamLogo src={logo} size={58} />
        <div
          style={{
            fontSize: px(44),
            fontWeight: 800,
            letterSpacing: -1,
            color,
            marginTop: px(4),
            display: "flex",
          }}
        >
          {abbr ?? "?"}
        </div>

        {/* Giant focal count. */}
        <div
          style={{
            fontSize: px(88),
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: -3,
            color,
            marginTop: px(6),
            display: "flex",
          }}
        >
          {count}
        </div>
        <div
          style={{
            fontSize: px(15),
            fontWeight: 800,
            letterSpacing: 1.8,
            textTransform: "uppercase",
            color: OFF_DIM,
            marginTop: px(2),
            display: "flex",
          }}
        >
          {count === 1 ? "sharp" : "sharps"} on moneyline
        </div>

        {/* Who's backing this side. */}
        <div
          style={{
            fontSize: px(21),
            fontWeight: 700,
            color: OFF,
            marginTop: px(12),
            display: "flex",
            flexWrap: "nowrap",
            overflow: "hidden",
            gap: px(10),
          }}
        >
          {visible.length === 0 ? (
            <span style={{ color: OFF_FAINT, fontStyle: "italic", display: "flex" }}>no sharps yet</span>
          ) : (
            visible.map((h, i) => (
              <span key={`${h}-${i}`} style={{ display: "flex", whiteSpace: "nowrap" }}>
                @{h}
              </span>
            ))
          )}
          {extra > 0 ? <span style={{ color: OFF_FAINT, display: "flex" }}>+{extra}</span> : null}
        </div>
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
        color: OFF,
        padding: `${px(72)}px ${px(80)}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily: "Manrope, sans-serif",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: px(4),
          background: OFF,
          opacity: 0.8,
          display: "flex",
        }}
      />
      <Wordmark logo={logo} height={50} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: px(84), fontWeight: 800, lineHeight: 1.0, letterSpacing: -3, display: "flex" }}>
          Tonight's MLB slate.
        </div>
        <div style={{ fontSize: px(28), color: OFF_DIM, marginTop: px(24), fontWeight: 600, display: "flex" }}>
          Every tracked sharp's pick, grouped by game, ranked by leaderboard.
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: px(20),
          color: OFF_DIM,
          fontWeight: 600,
        }}
      >
        <div style={{ display: "flex" }}>tailslips.com/slate</div>
        <div style={{ color: OFF, fontWeight: 800, display: "flex" }}>TailSlips</div>
      </div>
    </div>
  );
}
