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

export function espnOverviewUrl(playerId: number): string {
  return `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${playerId}/overview`;
}

export function espnHeadshotUrl(playerId: number): string {
  return `${ESPN_CDN}/i/headshots/nfl/players/full/${playerId}.png`;
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
 * Articles carrying a non-NFL league tag are skipped outright: "Mets troll
 * Jayden Daniels over LSU NIL dispute" was solo-tagged, named him, and ran
 * a photo of two Mets (2026-09-19 WSH@DAL card).
 */
export function pickActionPhoto(overview: EspnOverview, playerId: number, lastName: string): string | null {
  const last = lastName.trim().toLowerCase();
  const ranked: Array<{ tier: number; published: string; url: string }> = [];
  for (const a of overview.news ?? []) {
    const cats = a.categories ?? [];
    const tags = cats.filter((c) => c?.type === "athlete").map((c) => c.athleteId);
    if (!tags.includes(playerId)) continue;
    const leagues = cats.filter((c) => c?.type === "league").map((c) => (c.description ?? "").toLowerCase());
    if (leagues.some((l) => !l.includes("nfl"))) continue;
    const named = last.length > 0 && (a.headline ?? "").toLowerCase().includes(last);
    let tier: number;
    if (tags.length === 1 && named) tier = 0;
    else if (tags.length <= 3 && named) tier = 1;
    else if (tags.length === 1) tier = 2;
    else continue;
    const image = (a.images ?? []).find(
      (i) => typeof i?.url === "string" && i.url.startsWith(`${ESPN_CDN}/`) && (i.width ?? 0) >= MIN_WIDTH,
    );
    if (!image?.url) continue;
    ranked.push({ tier, published: a.published ?? "", url: image.url });
  }
  ranked.sort((x, y) => x.tier - y.tier || y.published.localeCompare(x.published));
  return ranked[0]?.url ?? null;
}

/** Network half: overview JSON -> best action photo URL, null on any failure. */
export async function fetchActionPhotoUrl(playerId: number, lastName: string, timeoutMs = 2500): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(espnOverviewUrl(playerId), {
      signal: controller.signal,
      // ESPN's site API 403s bare bot agents; the overview endpoint answers a browser-shaped UA.
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TailSlipsBot/1.0; +https://tailslips.com)" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as EspnOverview;
    return pickActionPhoto(json, playerId, lastName);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
