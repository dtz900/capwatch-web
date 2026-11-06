/**
 * NCAAB team lookups. The platform sends ESPN abbreviations (MCN, UNT, UK) on
 * slate rows; ESPN logos are keyed by numeric team id, not abbreviation, so
 * the generated map (scripts/build-ncaab-teams.mjs) turns one into the other.
 * When a payload carries `away_team_id` / `home_team_id` those win.
 *
 * The 360-row map is NOT imported here: it is registered by
 * ncaab-teams-register.ts, which only the NCAAB view and the VIP builder
 * load, so the data stays out of the shared bundles while NCAAB is dark.
 * Lookups before registration return null.
 */

export interface NcaabTeamRow {
  id: string;
  name: string;
  color: string | null;
}

let TEAMS: Record<string, NcaabTeamRow> = {};

export function registerNcaabTeams(map: Record<string, NcaabTeamRow>): void {
  TEAMS = map;
}

/** Nicknames cappers type that the school name does not contain. */
export const NCAAB_ALIASES: Record<string, string[]> = {
  CONN: ["uconn", "connecticut", "huskies"],
  GONZ: ["zags", "zag", "bulldogs"],
  VILL: ["nova"],
  MISS: ["ole miss", "mississippi"],
  PITT: ["pitt", "panthers"],
  UNC: ["tar heels", "unc"],
  UCF: ["ucf", "central florida"],
  PENN: ["penn", "upenn"],
  UK: ["big blue"],
  KU: ["jayhawks"],
  DUKE: ["blue devils"],
  MICH: ["wolverines"],
  ILL: ["illini"],
  PUR: ["boilermakers", "boilers"],
  ISU: ["cyclones"],
  TTU: ["red raiders"],
  SJU: ["red storm"],
  MARQ: ["golden eagles"],
  CREI: ["bluejays"],
  UNT: ["mean green"],
  MCN: ["cowboys"],
};

export function ncaabTeam(abbr: string | null | undefined): NcaabTeamRow | null {
  if (!abbr) return null;
  return TEAMS[abbr.trim().toUpperCase()] ?? null;
}

export function ncaabLogoUrlForId(id: string | number | null | undefined): string | null {
  if (id == null || !/^\d+$/.test(String(id))) return null;
  return `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`;
}

/** Logo by abbreviation, or null for a program the map does not know. */
export function ncaabTeamLogoUrl(abbr: string | null | undefined): string | null {
  return ncaabLogoUrlForId(ncaabTeam(abbr)?.id);
}

export function ncaabTeamColor(abbr: string | null | undefined, fallback = "#3b3b3b"): string {
  return ncaabTeam(abbr)?.color ?? fallback;
}

export function ncaabTeamName(abbr: string | null | undefined): string | null {
  return ncaabTeam(abbr)?.name ?? null;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/**
 * A team color readable as text on the near-black card: dark navies and
 * maroons are mixed toward the off-white until they clear a luminance floor.
 * Missing or malformed input returns the off-white itself.
 */
export function legibleTeamColor(hex: string | null | undefined, floor = 0.22): string {
  const OFFWHITE = "#f7f3e9";
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return OFFWHITE;
  let n = parseInt(hex.slice(1), 16);
  let color = hex.toLowerCase();
  const target = [0xf7, 0xf3, 0xe9];
  for (let i = 0; i < 12 && luminance(color) < floor; i += 1) {
    const mixed = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, k) => Math.round(v + (target[k] - v) * 0.2));
    n = (mixed[0] << 16) | (mixed[1] << 8) | mixed[2];
    color = `#${n.toString(16).padStart(6, "0")}`;
  }
  return color;
}
