/**
 * NBA props in the slate payload carry no player_id, so the OG card resolves a
 * capper-spelled name to an ESPN athlete id by reading the two teams' rosters.
 * Uses the site.web.api host: site.api.espn.com 403s bots.
 */
import { NBA_ESPN_TEAM_IDS } from "./nba-teams";

export interface RosterAthlete {
  id: number;
  fullName: string;
  lastName: string;
  team: string;
}

const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv"]);
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; athletes: RosterAthlete[] }>();

/** Lowercase, accents stripped, dots and apostrophes dropped, generational suffixes removed. */
export function normalizePersonName(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.'\u2019]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 0 && !SUFFIXES.has(t))
    .join(" ");
}

function surnameOf(normalized: string): string {
  const parts = normalized.split(" ");
  return parts[parts.length - 1] ?? "";
}

export function matchRosterAthlete(athletes: RosterAthlete[], name: string): RosterAthlete | null {
  const target = normalizePersonName(name);
  if (!target) return null;

  const exact = athletes.filter((a) => normalizePersonName(a.fullName) === target);
  if (exact.length === 1) return exact[0];

  const tokens = target.split(" ");
  const surname = surnameOf(target);
  const bySurname = athletes.filter((a) => surnameOf(normalizePersonName(a.fullName)) === surname);

  if (tokens.length === 2 && tokens[0].length === 1) {
    const initial = tokens[0];
    const hits = bySurname.filter((a) => normalizePersonName(a.fullName).startsWith(initial));
    if (hits.length === 1) return hits[0];
    if (hits.length > 1) return null;
  }

  if (tokens.length === 1 || tokens[0].length === 1) {
    return bySurname.length === 1 ? bySurname[0] : null;
  }
  return null;
}

export function espnNbaRosterUrl(abbr: string): string | null {
  const id = NBA_ESPN_TEAM_IDS[abbr];
  if (id === undefined) return null;
  return `https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${id}/roster`;
}

interface RosterJson {
  athletes?: Array<{ id?: string | number; fullName?: string; lastName?: string }>;
}

export async function fetchNbaRoster(abbr: string, timeoutMs = 2500): Promise<RosterAthlete[]> {
  const url = espnNbaRosterUrl(abbr);
  if (!url) return [];
  const hit = cache.get(abbr);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.athletes;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TailSlipsBot/1.0; +https://tailslips.com)" },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as RosterJson;
    const athletes: RosterAthlete[] = [];
    for (const a of json.athletes ?? []) {
      const id = Number(a?.id);
      if (!Number.isFinite(id) || !a.fullName) continue;
      athletes.push({ id, fullName: a.fullName, lastName: a.lastName ?? "", team: abbr });
    }
    if (athletes.length === 0) return [];
    cache.set(abbr, { at: Date.now(), athletes });
    return athletes;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveNbaAthlete(
  name: string,
  teams: [string | null, string | null],
  timeoutMs = 2500,
): Promise<RosterAthlete | null> {
  const abbrs = teams.filter((t): t is string => !!t);
  if (abbrs.length === 0) return null;
  const rosters = await Promise.all(abbrs.map((t) => fetchNbaRoster(t, timeoutMs)));
  return matchRosterAthlete(rosters.flat(), name);
}
