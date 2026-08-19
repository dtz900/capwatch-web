import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { fetchLeaderboard, fetchSlate, withDeadline } from "@/lib/api";
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

// The og:image URL is content-fingerprinted (h= hash, pick counts, card
// version), so a long CDN cache is safe: data changes mint a new URL. A long
// s-maxage is also what lets X's image pipeline succeed. Its fetcher retries
// the image repeatedly with a tight per-fetch budget (2026-08-18 wire capture:
// 10+ image fetches, card degraded to imageless summary), and with a 60s edge
// cache every retry was another cold multi-second render. With a warm CDN HIT
// the retry lands in ~100ms and the large-image card attaches.
const PRIMARY_CACHE = "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400";
const FALLBACK_CACHE = "public, max-age=30, s-maxage=30, stale-while-revalidate=120";

// Handles that must never be NAMED on X-shareable surfaces (the OG card is
// scraped into @TailSlips tweets). Mirrors NO_TAG_HANDLES in the platform's
// daily_leaderboard_tweet.py. Their picks still count toward the side tallies;
// only the name callout is suppressed. Site pages are unaffected.
const X_SUPPRESSED_HANDLES = new Set(["winwhenhot"]);

interface MarqueeSide {
  team: string | null;
  count: number;
  handles: string[];
  medianOdds: number | null;
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

// Satori has no access to next/font, so every face the card uses is bundled in
// public/fonts and loaded from disk. Two roles: Manrope (the site sans) carries
// the big scoreboard numbers and team marks, JetBrains Mono carries labels,
// handles and stat strips. Missing files degrade to satori's default instead
// of failing the render.
type OgFont = {
  name: string;
  data: Buffer;
  weight: 400 | 500 | 700 | 800;
  style: "normal" | "italic";
};
const FONT_FILES: Array<{ file: string; name: string; weight: OgFont["weight"]; style: OgFont["style"] }> = [
  { file: "manrope-500.woff", name: "Manrope", weight: 500, style: "normal" },
  { file: "manrope-700.woff", name: "Manrope", weight: 700, style: "normal" },
  { file: "manrope-800.woff", name: "Manrope", weight: 800, style: "normal" },
  { file: "jetbrains-mono-500.ttf", name: "JetBrains Mono", weight: 500, style: "normal" },
  { file: "jetbrains-mono-700.ttf", name: "JetBrains Mono", weight: 700, style: "normal" },
];
let FONT_CACHE: OgFont[] | null = null;
async function loadCardFonts(): Promise<OgFont[]> {
  if (FONT_CACHE) return FONT_CACHE;
  const out: OgFont[] = [];
  for (const f of FONT_FILES) {
    try {
      const buf = await readFile(join(process.cwd(), "public", "fonts", f.file));
      out.push({ name: f.name, data: buf, weight: f.weight, style: f.style });
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
  const awayOdds: number[] = [];
  const homeOdds: number[] = [];
  let awayCount = 0;
  let homeCount = 0;
  for (const p of game.picks) {
    const side = pickMlSide(p, game.away_team, game.home_team);
    const h = p.handle;
    if (!h) continue;
    const named = !X_SUPPRESSED_HANDLES.has(h.toLowerCase());
    if (side === "away") {
      awayCount += 1;
      if (named) awayHandles.push(h);
      if (isAmericanOdds(p.odds_taken)) awayOdds.push(p.odds_taken as number);
    } else if (side === "home") {
      homeCount += 1;
      if (named) homeHandles.push(h);
      if (isAmericanOdds(p.odds_taken)) homeOdds.push(p.odds_taken as number);
    }
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
    away: { team: game.away_team, count: awayCount, handles: awayHandles, medianOdds: medianInt(awayOdds) },
    home: { team: game.home_team, count: homeCount, handles: homeHandles, medianOdds: medianInt(homeOdds) },
  };
}

// Valid American prices live outside (-100, 100). Anything inside that band is
// a mis-stored value (decimal odds, a stray line number) and would poison the
// consensus figure.
function isAmericanOdds(v: number | null | undefined): boolean {
  return typeof v === "number" && Number.isFinite(v) && Math.abs(v) >= 100 && Math.abs(v) <= 10000;
}

function medianInt(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const med = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const rounded = Math.round(med);
  // An even count straddling the +/-100 gap can average into the invalid band.
  return Math.abs(rounded) >= 100 ? rounded : null;
}

function formatAmericanOdds(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
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

  const fonts = await loadCardFonts();

  // A successfully rendered card can still be DEGRADED: slate API down (empty
  // "no picks" state that isn't real) or a featured game whose team logos
  // failed to download. The long primary cache would pin that for the
  // fingerprint's lifetime; degraded renders take the short fallback cache
  // and heal on the next request.
  const degraded =
    slateResult.status !== "fulfilled" ||
    (featuredGame != null && (teamLogos.away == null || teamLogos.home == null));
  const cacheControl = degraded ? FALLBACK_CACHE : PRIMARY_CACHE;

  try {
    const primary = new ImageResponse(buildJsx(inputs), { ...size, fonts });
    const buf = await primary.arrayBuffer();
    return new Response(buf, {
      headers: { "content-type": "image/png", "cache-control": cacheControl },
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
  // Both fetches run under withDeadline AND concurrently: this function sits
  // on the metadata path, and Twitterbot caches "no card" for any page whose
  // HTML outlives its ~4-5s scrape budget. A date-only fingerprint on expiry
  // beats a card that never attaches; the racing fetches keep warming the
  // cache behind it. Failures resolve to null so one bad API never rejects
  // the pair.
  const [slate, lb] = await Promise.all([
    withDeadline<Awaited<ReturnType<typeof fetchSlate>> | null>(
      fetchSlate(dateParam).catch(() => null),
      1500,
      null,
    ),
    withDeadline<Awaited<ReturnType<typeof fetchLeaderboard>> | null>(
      fetchLeaderboard({
        window: "season",
        sort: "units_profit",
        bet_type: "all",
        min_picks: 10,
        active_only: true,
      }).catch(() => null),
      1200,
      null,
    ),
  ]);
  if (slate) {
    const allPicks = slate.games.flatMap((g) => g.picks);
    picks = allPicks.length;
    sharps = new Set(allPicks.map((p) => p.capper_id)).size;
    contentHash = hashSlateFingerprint(
      slate.games.map((g) => ({
        game: g.game_id,
        away: g.away_team,
        home: g.home_team,
        // Schedule fields render on the card, so they must move the URL too:
        // a pitcher swap or time change with no pick movement would otherwise
        // keep serving the long-cached stale card.
        time: g.game_time,
        awaySp: g.away_starter,
        homeSp: g.home_starter,
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
  }
  seasonPicks = lb?.platform_stats?.graded_picks_total ?? 0;
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

// Broadcast-scoreboard chrome: team-color washes, glowing focal numbers,
// pill chips, and a pick'em split bar. Mono carries small labels and stats.
const MONO = "JetBrains Mono";
const CHIP_BG = "rgba(255, 255, 255, 0.05)";
const CHIP_BORDER = "rgba(247, 243, 233, 0.16)";

function hexWithAlpha(color: string, alpha: number): string {
  if (color.startsWith("#")) {
    const [r, g, b] = hexToRgb(color);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (m) return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
  return color;
}

function buildJsx(inputs: RenderInputs) {
  const { logoDataUri, marquee, hasAnyPicks, totalGames, picksTotal, dateLabel } = inputs;
  const dayWord = dateLabel.toLowerCase();

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
        display: "flex",
        flexDirection: "column",
        fontFamily: "Manrope, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Team-color arena washes pouring in from each side. */}
      {marquee ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            backgroundImage: `linear-gradient(105deg, ${hexWithAlpha(awayC, 0.34)} 0%, rgba(10,10,12,0) 46%), linear-gradient(255deg, ${hexWithAlpha(homeC, 0.34)} 0%, rgba(10,10,12,0) 46%)`,
          }}
        />
      ) : null}
      {/* Floor shadow so the lower third stays legible under the washes. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          backgroundImage:
            "linear-gradient(180deg, rgba(10,10,12,0) 46%, rgba(10,10,12,0.55) 74%, rgba(10,10,12,0.85) 100%)",
        }}
      />

      {/* Split team-color rule across the very top. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: px(5),
          display: "flex",
          background: marquee
            ? `linear-gradient(90deg, ${awayC} 0%, ${awayC} 50%, ${homeC} 50%, ${homeC} 100%)`
            : OFF,
        }}
      />

      {/* Content column. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: `${px(30)}px ${px(52)}px ${px(24)}px`,
          position: "relative",
        }}
      >
        {/* Header: wordmark left, status pill + time right. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Wordmark logo={logoDataUri} height={32} />
          <div style={{ display: "flex", alignItems: "center", gap: px(14) }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: px(8),
                padding: `${px(6)}px ${px(14)}px`,
                borderRadius: px(999),
                border: `${px(1)}px solid ${CHIP_BORDER}`,
                background: CHIP_BG,
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: px(13),
                letterSpacing: px(2.4),
                textTransform: "uppercase",
                color: OFF,
              }}
            >
              <div
                style={{
                  width: px(8),
                  height: px(8),
                  borderRadius: px(4),
                  background: "#4ade80",
                  display: "flex",
                }}
              />
              Pre-game
            </div>
            {timeLabel ? (
              <div
                style={{
                  display: "flex",
                  fontFamily: MONO,
                  fontWeight: 500,
                  fontSize: px(14),
                  letterSpacing: px(2),
                  textTransform: "uppercase",
                  color: OFF_DIM,
                }}
              >
                {timeLabel}
              </div>
            ) : null}
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
              fontSize: px(40),
              fontWeight: 800,
              color: OFF,
              textAlign: "center",
            }}
          >
            {hasAnyPicks
              ? "Sharps are posting. Check the board."
              : "Sharps haven't posted yet."}
          </div>
        )}

        {/* Baseline ticker. Lives in the band X's caption overlays in-feed,
            so nothing critical is down here. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: px(14),
            fontFamily: MONO,
            fontWeight: 500,
            fontSize: px(12),
            letterSpacing: px(2.4),
            textTransform: "uppercase",
            color: "rgba(247, 243, 233, 0.45)",
          }}
        >
          <div style={{ display: "flex" }}>
            {totalGames} {totalGames === 1 ? "game" : "games"} {dayWord} · {picksTotal}{" "}
            {picksTotal === 1 ? "pick" : "picks"} tracked
          </div>
          <div style={{ display: "flex", color: "rgba(247, 243, 233, 0.70)", fontWeight: 700 }}>
            tailslips.com
          </div>
        </div>
      </div>
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
  const awayPitcher = shortPitcher(marquee.awayStarter);
  const homePitcher = shortPitcher(marquee.homeStarter);
  const pitcherLine =
    awayPitcher && homePitcher ? `${awayPitcher} vs ${homePitcher}` : awayPitcher ?? homePitcher;

  const mlTotal = marquee.away.count + marquee.home.count;
  const awayShare = mlTotal > 0 ? marquee.away.count / mlTotal : 0.5;
  const awayPct = Math.round(awayShare * 100);
  const homePct = 100 - awayPct;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      {/* Matchup stage: team blocks flanking the center badge. Content-sized
          (not flex:1) so the split bar rides directly under the chips and
          stays clear of X's bottom caption scrim; the spacer after the bar
          absorbs the slack instead. */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          marginTop: px(24),
        }}
      >
        <TeamPanel
          abbr={marquee.awayTeam}
          logo={marquee.awayLogoDataUri}
          color={awayC}
          count={marquee.away.count}
          handles={marquee.away.handles}
          medianOdds={marquee.away.medianOdds}
        />

        {/* Center badge column. */}
        <div
          style={{
            width: px(230),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: px(12),
          }}
        >
          <div
            style={{
              width: px(92),
              height: px(92),
              borderRadius: px(46),
              border: `${px(2)}px solid ${CHIP_BORDER}`,
              background: "rgba(10, 10, 12, 0.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: px(40),
              fontWeight: 800,
              color: OFF_DIM,
            }}
          >
            @
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: px(11),
              letterSpacing: px(3),
              textTransform: "uppercase",
              color: "rgba(247, 243, 233, 0.50)",
            }}
          >
            {marquee.featuredLabel}
          </div>
          {pitcherLine ? (
            <div
              style={{
                display: "flex",
                fontFamily: MONO,
                fontWeight: 500,
                fontSize: px(13),
                letterSpacing: px(0.5),
                color: "rgba(247, 243, 233, 0.60)",
                whiteSpace: "nowrap",
              }}
            >
              {pitcherLine}
            </div>
          ) : null}
        </div>

        <TeamPanel
          abbr={marquee.homeTeam}
          logo={marquee.homeLogoDataUri}
          color={homeC}
          count={marquee.home.count}
          handles={marquee.home.handles}
          medianOdds={marquee.home.medianOdds}
        />
      </div>

      {/* Pick'em split bar: who the room is on. With zero moneyline picks a
          50/50 bar would fake an even consensus, so render a quiet empty
          track with an honest label instead. */}
      <div style={{ display: "flex", flexDirection: "column", marginTop: px(24) }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: px(8),
            fontFamily: MONO,
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              display: "flex",
              fontWeight: 700,
              fontSize: px(16),
              letterSpacing: px(1),
              color: awayC,
            }}
          >
            {mlTotal > 0 ? `${awayPct}%` : ""}
          </div>
          <div
            style={{
              display: "flex",
              fontWeight: 700,
              fontSize: px(12),
              letterSpacing: px(3.2),
              color: "rgba(247, 243, 233, 0.55)",
            }}
          >
            {mlTotal > 0
              ? `${mlTotal} ${mlTotal === 1 ? "sharp" : "sharps"} on the moneyline`
              : "no moneyline picks yet"}
          </div>
          <div
            style={{
              display: "flex",
              fontWeight: 700,
              fontSize: px(16),
              letterSpacing: px(1),
              color: homeC,
            }}
          >
            {mlTotal > 0 ? `${homePct}%` : ""}
          </div>
        </div>
        {mlTotal > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              height: px(16),
              borderRadius: px(8),
              overflow: "hidden",
              border: `${px(1)}px solid rgba(247, 243, 233, 0.10)`,
            }}
          >
            <div
              style={{
                width: `${Math.max(4, Math.min(96, awayShare * 100))}%`,
                background: `linear-gradient(90deg, ${awayC} 0%, ${hexWithAlpha(awayC, 0.55)} 100%)`,
                display: "flex",
              }}
            />
            <div style={{ width: px(3), background: BG, display: "flex" }} />
            <div
              style={{
                flex: 1,
                background: `linear-gradient(90deg, ${hexWithAlpha(homeC, 0.55)} 0%, ${homeC} 100%)`,
                display: "flex",
              }}
            />
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              height: px(16),
              borderRadius: px(8),
              border: `${px(1)}px solid rgba(247, 243, 233, 0.10)`,
              background: "rgba(255, 255, 255, 0.03)",
            }}
          />
        )}
      </div>

      {/* Slack lands below the bar, inside X's caption scrim band. */}
      <div style={{ display: "flex", flex: 1 }} />
    </div>
  );
}

function TeamPanel({
  abbr,
  logo,
  color,
  count,
  handles,
  medianOdds,
}: {
  abbr: string | null;
  logo: string | null;
  color: string;
  count: number;
  handles: string[];
  medianOdds: number | null;
}) {
  const visible = handles.slice(0, 2);
  // Remainder counts from the side tally, not the named list, so sharps with
  // suppressed handles still show up anonymously in the +N.
  const extra = Math.max(0, count - visible.length);
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Team identity: logo + heavy tracked abbr. */}
      <div style={{ display: "flex", alignItems: "center", gap: px(16) }}>
        <TeamLogo src={logo} size={64} />
        <div
          style={{
            fontSize: px(46),
            fontWeight: 800,
            letterSpacing: px(3),
            color,
            display: "flex",
          }}
        >
          {abbr ?? "?"}
        </div>
      </div>

      {/* Glowing focal count. */}
      <div
        style={{
          fontSize: px(172),
          fontWeight: 800,
          lineHeight: 1,
          color,
          marginTop: px(4),
          display: "flex",
          textShadow: `0 0 ${px(52)}px ${hexWithAlpha(color, 0.5)}`,
        }}
      >
        {count}
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: px(12),
          letterSpacing: px(3.4),
          textTransform: "uppercase",
          color: "rgba(247, 243, 233, 0.50)",
          marginTop: px(4),
        }}
      >
        {count === 1 ? "sharp" : "sharps"}
      </div>

      {/* Consensus price the sharps are laying. Height is reserved even when
          a side has no clean odds so both columns stay vertically aligned. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: px(8),
          marginTop: px(10),
          height: px(30),
          fontFamily: MONO,
        }}
      >
        {medianOdds !== null && count > 0 ? (
          <div
            style={{
              display: "flex",
              fontWeight: 500,
              fontSize: px(12),
              letterSpacing: px(2),
              textTransform: "uppercase",
              color: "rgba(247, 243, 233, 0.45)",
            }}
          >
            consensus
          </div>
        ) : null}
        {medianOdds !== null && count > 0 ? (
          <div
            style={{
              display: "flex",
              fontWeight: 700,
              fontSize: px(20),
              color,
            }}
          >
            {formatAmericanOdds(medianOdds)}
          </div>
        ) : null}
      </div>

      {/* Handle chips. */}
      <div
        style={{
          display: "flex",
          flexWrap: "nowrap",
          overflow: "hidden",
          gap: px(8),
          marginTop: px(12),
        }}
      >
        {count === 0 ? (
          <div
            style={{
              display: "flex",
              padding: `${px(5)}px ${px(12)}px`,
              borderRadius: px(999),
              border: `${px(1)}px solid rgba(247, 243, 233, 0.10)`,
              fontFamily: MONO,
              fontWeight: 500,
              fontSize: px(12),
              letterSpacing: px(1.6),
              textTransform: "uppercase",
              color: "rgba(247, 243, 233, 0.35)",
            }}
          >
            no sharps yet
          </div>
        ) : (
          visible.map((h, i) => (
            <div
              key={`${h}-${i}`}
              style={{
                display: "flex",
                padding: `${px(5)}px ${px(12)}px`,
                borderRadius: px(999),
                border: `${px(1)}px solid ${CHIP_BORDER}`,
                background: CHIP_BG,
                fontFamily: MONO,
                fontWeight: 500,
                fontSize: px(13),
                color: "rgba(247, 243, 233, 0.85)",
                whiteSpace: "nowrap",
              }}
            >
              @{h}
            </div>
          ))
        )}
        {extra > 0 ? (
          <div
            style={{
              display: "flex",
              padding: `${px(5)}px ${px(12)}px`,
              borderRadius: px(999),
              border: `${px(1)}px solid rgba(247, 243, 233, 0.10)`,
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: px(13),
              color: "rgba(247, 243, 233, 0.50)",
            }}
          >
            +{extra}
          </div>
        ) : null}
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
