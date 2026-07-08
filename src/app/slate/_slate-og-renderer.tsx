import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { fetchLeaderboard, fetchSlate } from "@/lib/api";
import { inferMarketBucket, pickMlSide } from "@/lib/bet-format";
import { teamColor, teamLogoUrl } from "@/lib/mlb-teams";
import type { SlateGame, SlatePick } from "@/lib/types";

// Rendered at 1x (1200x630). This is the proven config X's crawler scrapes
// reliably: a 2x canvas made the cold render heavier (Twitterbot timed out and
// cached a blank card) and mismatched the declared og:image dimensions. The
// card's legibility comes from the font scale, not the pixel resolution, so 1x
// reads the same in-feed. SCALE stays as a single knob if we revisit this.
const SCALE = 1;
export const size = { width: 1200 * SCALE, height: 630 * SCALE };
export const contentType = "image/png";
export const alt = "Tonight's MLB slate on TailSlips";

// px() scales a design-space value (authored against the 1200x630 frame) up to
// the 2x render canvas so every size, gap, and radius stays proportional.
const px = (n: number): number => n * SCALE;

// Color tokens. Kept in sync with the root opengraph-image so shared cards
// across the site read as one visual identity.
const BG = "#0a0a0c";
const TEXT = "#fafafa";
const TEXT_SOFT = "#d4d4d8";
const TEXT_MUTED = "#8b8b93";
const MINT = "#5eead4";
const GOLD = "#f5c54a";
const ROW_BORDER = "rgba(255, 255, 255, 0.08)";
const CARD_BG = "rgba(255, 255, 255, 0.03)";

const PRIMARY_CACHE = "public, max-age=60, s-maxage=60, stale-while-revalidate=300";
const FALLBACK_CACHE = "public, max-age=30, s-maxage=30, stale-while-revalidate=120";

interface MarqueeSide {
  team: string | null;
  count: number;
  handles: string[];
}

interface MarketBreakdown {
  total: number;
  spread: number;
  prop: number;
  parlay: number;
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
  breakdown: MarketBreakdown;
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

/**
 * Resolve a requested game from a share slug. Accepts a numeric game_id or an
 * "AWAY-HOME" abbreviation pair in either order (case-insensitive, any non-
 * alphanumeric separator). Returns null when nothing matches so callers fall
 * back to the most-bet game. This is what powers ?game= on the OG URL: David
 * can feature any matchup on the card, not just the most-picked one.
 */
function resolveRequestedGame(games: SlateGame[], slug: string | undefined): SlateGame | null {
  if (!slug) return null;
  const raw = slug.trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const byId = games.find((g) => g.game_id === Number(raw));
    if (byId) return byId;
  }

  const parts = raw.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  if (parts.length >= 2) {
    const [a, b] = parts;
    const match = games.find((g) => {
      const away = (g.away_team ?? "").toUpperCase();
      const home = (g.home_team ?? "").toUpperCase();
      return (away === a && home === b) || (away === b && home === a);
    });
    if (match) return match;
  }
  return null;
}

function buildBreakdown(picks: SlatePick[]): MarketBreakdown {
  const b: MarketBreakdown = { total: 0, spread: 0, prop: 0, parlay: 0 };
  for (const p of picks) {
    if (p.kind === "parlay_leg") {
      b.parlay += 1;
      continue;
    }
    const bucket = inferMarketBucket(p.market, p.selection);
    if (bucket === "Total") b.total += 1;
    else if (bucket === "Spread") b.spread += 1;
    else if (bucket === "Player prop" || bucket === "Game prop") b.prop += 1;
    // Moneyline is surfaced by the backing tiles; unknown buckets drop out.
  }
  return b;
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
    breakdown: buildBreakdown(game.picks),
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

/**
 * Fingerprint inputs for the slate OG image URL. Date alone busts X's cache
 * once per day, but the slate updates intra-day as cappers tweet picks and as
 * the season leaderboard grades. Folding in pick volume + sharps + season
 * graded-total means the URL changes whenever the displayed card would
 * actually look different. Used by app/slate/page.tsx generateMetadata.
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
    // Leaderboard fingerprint is optional; date + picks already changes a lot.
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

function LogoOrWordmark({ logo, height = 44 }: { logo: string | null; height?: number }) {
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo} alt="TailSlips" height={px(height)} style={{ height: px(height) }} />
    );
  }
  return (
    <div
      style={{
        fontSize: px(36),
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
        gap: px(10),
        padding: `${px(10)}px ${px(16)}px`,
        borderRadius: px(6),
        background: "rgba(94, 234, 212, 0.10)",
        border: `${px(1)}px solid rgba(94, 234, 212, 0.35)`,
        color: MINT,
        fontSize: px(17),
        fontWeight: 800,
        letterSpacing: 1.6,
        textTransform: "uppercase",
      }}
    >
      <div
        style={{
          width: px(9),
          height: px(9),
          borderRadius: px(5),
          background: MINT,
          display: "flex",
        }}
      />
      <div style={{ display: "flex" }}>Live · Pre-game</div>
    </div>
  );
}

function buildJsx(inputs: RenderInputs) {
  const { logoDataUri, dateLabel, totalGames, sharpsPosted, picksTotal, marquee, hasAnyPicks } =
    inputs;

  const contextLine = hasAnyPicks
    ? `${dateLabel} · ${totalGames} ${totalGames === 1 ? "game" : "games"} · ${sharpsPosted} ${sharpsPosted === 1 ? "sharp" : "sharps"} · ${picksTotal} picks`
    : `${dateLabel} · ${totalGames} ${totalGames === 1 ? "game" : "games"} · no picks tweeted yet`;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: BG,
        color: TEXT,
        padding: `${px(20)}px ${px(48)}px ${px(16)}px`,
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
          height: px(4),
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
          marginBottom: px(8),
        }}
      >
        <LogoOrWordmark logo={logoDataUri} height={40} />
        <LivePill />
      </div>

      {/* Slate-wide context, one small line. */}
      <div
        style={{
          fontSize: px(17),
          fontWeight: 800,
          color: TEXT_MUTED,
          letterSpacing: 1.6,
          textTransform: "uppercase",
          marginBottom: px(10),
          display: "flex",
        }}
      >
        {contextLine}
      </div>

      {/* Featured game hero — fills the remaining frame. */}
      {marquee ? (
        <MarqueeBlockView marquee={marquee} />
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: px(34),
            fontWeight: 800,
            color: TEXT_SOFT,
            textAlign: "center",
          }}
        >
          Sharps haven't posted yet. Check back as picks hit Twitter.
        </div>
      )}

      {/* No footer: X overlays its own title/domain bar across the bottom
         ~70px of the card in-feed. The hero card reserves that space at the
         bottom (see MarqueeBlockView inner paddingBottom) so nothing important
         sits under X's caption. Branding is carried by the top wordmark. */}
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
      width={dim}
      height={dim}
      style={{ width: dim, height: dim, objectFit: "contain", display: "flex" }}
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

  const mlTotal = marquee.away.count + marquee.home.count;
  const chips = buildChips(marquee.breakdown);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: CARD_BG,
        border: `${px(1)}px solid ${ROW_BORDER}`,
        borderRadius: px(18),
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Team-color glow wash: away brand on the left, home on the right. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.18,
          display: "flex",
          background: `radial-gradient(58% 130% at 0% 42%, ${awayColor} 0%, transparent 60%), radial-gradient(58% 130% at 100% 42%, ${homeColor} 0%, transparent 60%)`,
        }}
      />

      {/* Team-color hairline at the top, echoing the slate page matchup block. */}
      <div
        style={{
          height: px(5),
          width: "100%",
          background: `linear-gradient(90deg, ${awayColor} 0%, ${awayColor} 50%, ${homeColor} 50%, ${homeColor} 100%)`,
          opacity: 0.9,
          display: "flex",
        }}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          // Extra bottom padding reserves a safe zone: X overlays its caption
          // bar across the bottom ~70px of the card in-feed. space-between then
          // seats the chips/backing just above that band instead of under it.
          padding: `${px(14)}px ${px(30)}px ${px(80)}px`,
          position: "relative",
        }}
      >
        {/* Title bar: featured pill + game time */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: px(18),
              fontWeight: 800,
              letterSpacing: 2.4,
              textTransform: "uppercase",
              color: GOLD,
              padding: `${px(6)}px ${px(14)}px`,
              borderRadius: px(6),
              border: `${px(1)}px solid rgba(245, 197, 74, 0.5)`,
              background: "rgba(245, 197, 74, 0.10)",
              display: "flex",
            }}
          >
            {marquee.featuredLabel}
          </div>
          {timeLabel ? (
            <div
              style={{
                fontSize: px(20),
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

        {/* Center: logos + @ + abbrs, with the big volume stat beneath. */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: px(44),
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <TeamLogo src={marquee.awayLogoDataUri} size={72} />
              <div
                style={{
                  fontSize: px(42),
                  fontWeight: 800,
                  color: TEXT,
                  letterSpacing: -1,
                  marginTop: px(4),
                  display: "flex",
                }}
              >
                {marquee.awayTeam ?? "?"}
              </div>
            </div>
            <div
              style={{
                fontSize: px(30),
                fontWeight: 800,
                color: TEXT_MUTED,
                letterSpacing: 2,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              @
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <TeamLogo src={marquee.homeLogoDataUri} size={72} />
              <div
                style={{
                  fontSize: px(42),
                  fontWeight: 800,
                  color: TEXT,
                  letterSpacing: -1,
                  marginTop: px(4),
                  display: "flex",
                }}
              >
                {marquee.homeTeam ?? "?"}
              </div>
            </div>
          </div>

          {/* Big volume read — the headline number for this game. */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: px(10),
              marginTop: px(10),
            }}
          >
            <span style={{ fontSize: px(40), fontWeight: 800, color: MINT, display: "flex" }}>
              {marquee.totalPicks}
            </span>
            <span
              style={{
                fontSize: px(24),
                fontWeight: 700,
                color: TEXT_SOFT,
                letterSpacing: 0.4,
                display: "flex",
              }}
            >
              {marquee.totalPicks === 1 ? "pick" : "picks"} from {marquee.sharpCount}{" "}
              {marquee.sharpCount === 1 ? "sharp" : "sharps"}
            </span>
          </div>

          {pitcherLine ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                fontSize: px(19),
                fontWeight: 600,
                color: TEXT_MUTED,
                letterSpacing: 0.2,
                marginTop: px(6),
              }}
            >
              {pitcherLine}
            </div>
          ) : null}
        </div>

        {/* Bottom: moneyline lean bar + backing handles + market chips. */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {mlTotal > 0 ? (
            <LeanBar away={marquee.away} home={marquee.home} awayColor={awayColor} homeColor={homeColor} />
          ) : null}

          <div style={{ display: "flex", gap: px(16), marginTop: mlTotal > 0 ? px(10) : 0 }}>
            <BackingTile side={marquee.away} color={awayColor} />
            <BackingTile side={marquee.home} color={homeColor} />
          </div>

          {chips.length > 0 ? (
            <div style={{ display: "flex", gap: px(10), marginTop: px(8), flexWrap: "wrap" }}>
              {chips.map((c) => (
                <div
                  key={c.label}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: px(7),
                    padding: `${px(6)}px ${px(13)}px`,
                    borderRadius: px(7),
                    background: "rgba(255,255,255,0.05)",
                    border: `${px(1)}px solid ${ROW_BORDER}`,
                  }}
                >
                  <span style={{ fontSize: px(24), fontWeight: 800, color: TEXT, display: "flex" }}>
                    {c.count}
                  </span>
                  <span
                    style={{
                      fontSize: px(16),
                      fontWeight: 700,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      color: TEXT_MUTED,
                      display: "flex",
                    }}
                  >
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface Chip {
  label: string;
  count: number;
}

function buildChips(b: MarketBreakdown): Chip[] {
  const chips: Chip[] = [];
  if (b.total > 0) chips.push({ label: b.total === 1 ? "Total" : "Totals", count: b.total });
  if (b.spread > 0) chips.push({ label: b.spread === 1 ? "Spread" : "Spreads", count: b.spread });
  if (b.prop > 0) chips.push({ label: b.prop === 1 ? "Prop" : "Props", count: b.prop });
  if (b.parlay > 0) chips.push({ label: b.parlay === 1 ? "Parlay leg" : "Parlay legs", count: b.parlay });
  return chips;
}

function LeanBar({
  away,
  home,
  awayColor,
  homeColor,
}: {
  away: MarqueeSide;
  home: MarqueeSide;
  awayColor: string;
  homeColor: string;
}) {
  const a = away.count;
  const h = home.count;
  const tot = a + h;
  const awayPct = tot === 0 ? 50 : Math.max(a === 0 ? 0 : 8, Math.round((a / tot) * 100));
  const homePct = 100 - awayPct;
  const awayLabel = awayColor === "#3b3b3b" ? TEXT_SOFT : awayColor;
  const homeLabel = homeColor === "#3b3b3b" ? TEXT_SOFT : homeColor;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: px(6) }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: px(24), fontWeight: 800, color: awayLabel, display: "flex" }}>
          {a} on {away.team ?? "away"}
        </div>
        <div
          style={{
            fontSize: px(15),
            fontWeight: 800,
            letterSpacing: 1.8,
            textTransform: "uppercase",
            color: TEXT_MUTED,
            display: "flex",
          }}
        >
          Moneyline lean
        </div>
        <div style={{ fontSize: px(24), fontWeight: 800, color: homeLabel, display: "flex" }}>
          {h} on {home.team ?? "home"}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          width: "100%",
          height: px(14),
          borderRadius: px(7),
          overflow: "hidden",
          background: "rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", width: `${awayPct}%`, background: awayColor }} />
        <div style={{ display: "flex", width: `${homePct}%`, background: homeColor }} />
      </div>
    </div>
  );
}

function BackingTile({ side, color }: { side: MarqueeSide; color: string }) {
  const visible = side.handles.slice(0, 2);
  const extra = side.handles.length - visible.length;
  // Single-line, capped: long handles wrapping to a 2nd line was pushing the
  // market chips off the bottom of the 630px frame.
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          paddingBottom: px(5),
          borderBottom: `${px(3)}px solid ${color}`,
          marginBottom: px(7),
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: px(8) }}>
          <div
            style={{
              fontSize: px(28),
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
              fontSize: px(15),
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
            fontSize: px(16),
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
          fontSize: px(21),
          fontWeight: 700,
          color: TEXT_SOFT,
          letterSpacing: -0.2,
          display: "flex",
          flexWrap: "nowrap",
          overflow: "hidden",
          gap: px(10),
        }}
      >
        {visible.length === 0 ? (
          <span style={{ color: TEXT_MUTED, fontStyle: "italic", display: "flex" }}>
            no sharps this side
          </span>
        ) : (
          visible.map((h, idx) => (
            <span key={`${h}-${idx}`} style={{ display: "flex", whiteSpace: "nowrap" }}>
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

function buildFallbackJsx(logo: string | null) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: BG,
        color: TEXT,
        padding: `${px(72)}px ${px(80)}px`,
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
          height: px(3),
          background: MINT,
          opacity: 0.7,
          display: "flex",
        }}
      />
      <LogoOrWordmark logo={logo} height={54} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: px(84),
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
            fontSize: px(28),
            color: TEXT_MUTED,
            marginTop: px(24),
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
          fontSize: px(20),
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
