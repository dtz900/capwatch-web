/**
 * The NBA game card's photo: the most-backed player's ESPN action still,
 * falling through to the next two players, then the first player's headshot
 * cutout. No JSX here so the chain is unit-testable with injected network.
 */
import { withDeadline } from "@/lib/api";
import { fetchNbaRoster, resolveNbaAthlete, type RosterAthlete } from "@/lib/espn-nba-roster";
import { espnHeadshotUrl, espnResizedUrl, fetchActionPhotoUrl } from "@/lib/espn-player-photo";
import type { NbaBackedPlayer, NbaPanel } from "@/lib/nba-og-panel";
import { fetchRemoteImageAsDataUri } from "@/lib/remote-image";
import type { SlateGame } from "@/lib/types";

export type PhotoMode = "action" | "headshot";

export interface NbaHero {
  player: NbaBackedPlayer;
  athleteId: number;
  photoDataUri: string;
  photoKind: "action" | "headshot";
  teamSide: "away" | "home" | null;
}

export interface NbaHeroDeps {
  resolve: typeof resolveNbaAthlete;
  actionUrl: typeof fetchActionPhotoUrl;
  toDataUri: (url: string | null) => Promise<string | null>;
  /** Validates a stamped player_id against the two rosters. Defaults to the cached ESPN roster fetch. */
  roster?: typeof fetchNbaRoster;
}

export const NBA_HERO_DEPS: NbaHeroDeps = {
  resolve: resolveNbaAthlete,
  actionUrl: fetchActionPhotoUrl,
  toDataUri: fetchRemoteImageAsDataUri,
  roster: fetchNbaRoster,
};

const CANDIDATES = 3;
const PHOTO_W = 1200;
const PHOTO_H = 675;
const PHOTO_TIMEOUT_MS = 2500;

/** groupByMarket keys a group by player_id when its rows carry one ("id:123"). */
function stampedId(player: NbaBackedPlayer): number | null {
  if (!player.key.startsWith("id:")) return null;
  const id = Number(player.key.slice(3));
  return Number.isFinite(id) ? id : null;
}

async function identify(game: SlateGame, player: NbaBackedPlayer, deps: NbaHeroDeps): Promise<RosterAthlete | null> {
  const teams: [string | null, string | null] = [game.away_team, game.home_team];
  const id = stampedId(player);
  if (id != null) {
    // A foreign id would render the wrong player silently: only trust ids on the two rosters.
    const roster = deps.roster ?? fetchNbaRoster;
    const abbrs = teams.filter((t): t is string => !!t);
    const athletes = (await Promise.all(abbrs.map((t) => roster(t)))).flat();
    const hit = athletes.find((a) => a.id === id);
    if (hit) return hit;
  }
  return deps.resolve(player.name, teams);
}

function lastNameOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? "";
}

function teamSideOf(game: SlateGame, athlete: RosterAthlete): "away" | "home" | null {
  if (athlete.team === game.away_team) return "away";
  if (athlete.team === game.home_team) return "home";
  return null;
}

async function heroChain(game: SlateGame, panel: NbaPanel, mode: PhotoMode, deps: NbaHeroDeps): Promise<NbaHero | null> {
  const build = (player: NbaBackedPlayer, athlete: RosterAthlete, uri: string, kind: NbaHero["photoKind"]): NbaHero => ({
    player,
    athleteId: athlete.id,
    photoDataUri: uri,
    photoKind: kind,
    teamSide: teamSideOf(game, athlete),
  });

  let first: { player: NbaBackedPlayer; athlete: RosterAthlete } | null = null;
  for (const player of panel.players.slice(0, CANDIDATES)) {
    const athlete = await identify(game, player, deps);
    if (!athlete) continue;
    first ??= { player, athlete };
    if (mode !== "action") break;
    const still = await deps.actionUrl(athlete.id, athlete.lastName || lastNameOf(player.name), PHOTO_TIMEOUT_MS, "NBA");
    const uri = still ? await deps.toDataUri(espnResizedUrl(still, PHOTO_W, PHOTO_H)) : null;
    if (uri) return build(player, athlete, uri, "action");
  }
  if (!first) return null;
  const headshot = await deps.toDataUri(espnHeadshotUrl(first.athlete.id, "NBA"));
  return headshot ? build(first.player, first.athlete, headshot, "headshot") : null;
}

/**
 * The whole chain (rosters, overview, image) runs under one deadline. A
 * timeout returns null so the renderer falls back to the scoreboard: a
 * headshot card produced by a timeout would look intentional.
 */
export async function fetchNbaHero(
  game: SlateGame,
  panel: NbaPanel,
  mode: PhotoMode,
  deps: NbaHeroDeps,
  deadlineMs = 3500,
): Promise<NbaHero | null> {
  if (panel.players.length === 0) return null;
  return withDeadline(
    heroChain(game, panel, mode, deps).catch(() => null),
    deadlineMs,
    null,
  );
}

// Width estimates for the caption plate and chip row, 0.56em per character
// for the sans name and 0.6em for mono (JetBrains Mono's advance).
const CAPTION_MAX_PX = 520;
const SANS_EM = 0.56;
const MONO_EM = 0.6;

/** `N CAPPERS · <top bet>`, or just `N CAPPERS` when the name plus bet would pass ~520px. */
export function nbaCaptionLine(name: string, sharps: number, topBet: string | null): string {
  const cappers = `${sharps} ${sharps === 1 ? "CAPPER" : "CAPPERS"}`;
  if (!topBet) return cappers;
  const full = `${cappers} · ${topBet}`;
  const width = name.length * 24 * SANS_EM + full.length * 13 * SANS_EM;
  return width > CAPTION_MAX_PX ? cappers : full;
}

/**
 * Chips that fit one row of `maxPx`: named handles in order while they fit
 * (15px mono, 12px side padding, 8px gap), the rest folded into the `+N` chip.
 */
export function fitNbaChips(handles: string[], more: number, maxPx: number): { handles: string[]; more: number } {
  const chipW = (text: string): number => text.length * 15 * MONO_EM + 24 + 8;
  const kept: string[] = [];
  let used = 0;
  for (let i = 0; i < handles.length; i++) {
    const rest = more + handles.length - i - 1;
    const reserve = rest > 0 ? chipW(`+${rest}`) : 0;
    const w = chipW(`@${handles[i]}`);
    if (used + w + reserve > maxPx) break;
    kept.push(handles[i]);
    used += w;
  }
  return { handles: kept, more: more + handles.length - kept.length };
}
