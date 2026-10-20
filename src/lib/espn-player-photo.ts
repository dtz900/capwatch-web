/**
 * Action photos for the NFL OG card, keyed on the ESPN athlete id the parser
 * stamps on every NFL player prop (nfl_rosters.player_id).
 *
 * Same idea as the platform's Parlay Palace media pick (MLB highlight photo
 * tagged with the leg's player): ESPN's athlete overview lists recent
 * articles, each tagged with athlete ids and carrying a 16:9 editorial
 * image. A tag does not guarantee the picture shows the player (a
 * 24-athlete rankings piece tags everyone), so only tightly tagged articles
 * qualify. URLs are hotlinked through ESPN's combiner at card size; the
 * transparent headshot cutout is the always-available fallback.
 */

export interface EspnArticle {
  headline?: string;
  published?: string;
  categories?: Array<{ type?: string; athleteId?: number; description?: string }>;
  images?: Array<{ url?: string; width?: number; height?: number }>;
}

export interface EspnOverview {
  news?: EspnArticle[];
}

const ESPN_CDN = "https://a.espncdn.com";
// Team beat stories mostly ship a 608x342 hero; the tile is 354px wide at
// 1x and the combiner upsamples cleanly enough for 2x.
const MIN_WIDTH = 600;

/** Leagues with an ESPN athlete feed. NBA props carry player_id null today,
 *  so the NBA path only lights up once the parser stamps ESPN ids. */
export type PhotoSport = "NFL" | "NBA";

const ESPN_PATH: Record<PhotoSport, { api: string; cdn: string; league: string }> = {
  NFL: { api: "football/nfl", cdn: "nfl", league: "nfl" },
  NBA: { api: "basketball/nba", cdn: "nba", league: "nba" },
};

/** Headlines that signal a talking-head or off-court piece whose hero image is rarely game action. */
export const NBA_SKIP_HEADLINE = /\b(trade|traded|contract|extension|opens up|calls|says|fashion|draft|forecast|rankings|odds|tips|dfs)\b/i;

export interface PhotoPolicy {
  maxAgeDays: number;
  skipHeadline: RegExp | null;
  preferWide: boolean;
}

/** NFL stays exactly as it was (no age cutoff, no headline filter, first qualifying image). */
export const PHOTO_POLICY: Record<PhotoSport, PhotoPolicy> = {
  NFL: { maxAgeDays: Infinity, skipHeadline: null, preferWide: false },
  NBA: { maxAgeDays: 365, skipHeadline: NBA_SKIP_HEADLINE, preferWide: true },
};

const DAY_MS = 86_400_000;

export function espnOverviewUrl(playerId: number, sport: PhotoSport = "NFL"): string {
  return `https://site.web.api.espn.com/apis/common/v3/sports/${ESPN_PATH[sport].api}/athletes/${playerId}/overview`;
}

export function espnHeadshotUrl(playerId: number, sport: PhotoSport = "NFL"): string {
  return `${ESPN_CDN}/i/headshots/${ESPN_PATH[sport].cdn}/players/full/${playerId}.png`;
}

/** ESPN's image combiner resizes anything on its own CDN; other hosts return null. */
export function espnResizedUrl(url: string, w: number, h: number): string | null {
  if (!url.startsWith(`${ESPN_CDN}/`)) return null;
  const path = url.slice(ESPN_CDN.length);
  return `${ESPN_CDN}/combiner/i?img=${path}&w=${w}&h=${h}`;
}

/**
 * Tier 0: the player is the only tagged athlete and the headline names him.
 * Tier 1: one of at most three tagged athletes, headline names him. Tier 2:
 * only tagged athlete, headline does not name him. Anything looser is a
 * crowd piece and is skipped. A headline naming the player is the stronger
 * signal that the hero image shows him; a bare solo tag on a roster
 * projection can be anyone. Newest wins a tier.
 *
 * Articles carrying a league tag other than the pick's league are skipped outright: "Mets troll
 * Jayden Daniels over LSU NIL dispute" was solo-tagged, named him, and ran
 * a photo of two Mets (2026-09-19 WSH@DAL card).
 */
export function pickActionPhoto(
  overview: EspnOverview,
  playerId: number,
  lastName: string,
  sport: PhotoSport = "NFL",
  now: Date = new Date(),
): string | null {
  const policy = PHOTO_POLICY[sport];
  const league = ESPN_PATH[sport].league;
  const last = lastName.trim().toLowerCase();
  const ranked: Array<{ tier: number; published: string; url: string }> = [];
  for (const a of overview.news ?? []) {
    const cats = a.categories ?? [];
    const tags = cats.filter((c) => c?.type === "athlete").map((c) => c.athleteId);
    if (!tags.includes(playerId)) continue;
    const leagues = cats.filter((c) => c?.type === "league").map((c) => (c.description ?? "").toLowerCase());
    if (leagues.some((l) => !l.includes(league))) continue;
    if (policy.skipHeadline && policy.skipHeadline.test(a.headline ?? "")) continue;
    if (Number.isFinite(policy.maxAgeDays)) {
      const t = Date.parse(a.published ?? "");
      if (!Number.isFinite(t) || now.getTime() - t > policy.maxAgeDays * DAY_MS) continue;
    }
    const named = last.length > 0 && (a.headline ?? "").toLowerCase().includes(last);
    let tier: number;
    if (tags.length === 1 && named) tier = 0;
    else if (tags.length <= 3 && named) tier = 1;
    else if (tags.length === 1) tier = 2;
    else continue;
    const qualifying = (a.images ?? []).filter(
      (i) => typeof i?.url === "string" && i.url.startsWith(`${ESPN_CDN}/`) && (i.width ?? 0) >= MIN_WIDTH,
    );
    const image = (policy.preferWide && qualifying.find((i) => i.url?.includes("_16-9"))) || qualifying[0];
    if (!image?.url) continue;
    ranked.push({ tier, published: a.published ?? "", url: image.url });
  }
  ranked.sort((x, y) => x.tier - y.tier || y.published.localeCompare(x.published));
  return ranked[0]?.url ?? null;
}

/** Network half: overview JSON -> best action photo URL, null on any failure. */
export async function fetchActionPhotoUrl(
  playerId: number,
  lastName: string,
  timeoutMs = 2500,
  sport: PhotoSport = "NFL",
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(espnOverviewUrl(playerId, sport), {
      signal: controller.signal,
      // ESPN's site API 403s bare bot agents; the overview endpoint answers a browser-shaped UA.
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TailSlipsBot/1.0; +https://tailslips.com)" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as EspnOverview;
    return pickActionPhoto(json, playerId, lastName, sport);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
