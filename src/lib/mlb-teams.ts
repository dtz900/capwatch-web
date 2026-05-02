/**
 * MLB team metadata: ESPN logo CDN keys and primary brand colors.
 * Used by TeamLogo and game card accents on the slate page.
 */

// Most abbrs match ESPN's lowercase key directly; this map covers the divergent cases.
const ESPN_KEY_OVERRIDE: Record<string, string> = {
  ATH: "oak",
  AZ: "ari",
  CWS: "chw",
};

export function teamLogoUrl(abbr: string | null): string | null {
  if (!abbr) return null;
  const key = ESPN_KEY_OVERRIDE[abbr] ?? abbr.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/mlb/500/${key}.png`;
}

export const MLB_TEAM_COLORS: Record<string, string> = {
  ATH: "#003831",
  ATL: "#ce1141",
  AZ: "#a71930",
  BAL: "#df4601",
  BOS: "#bd3039",
  CHC: "#0e3386",
  CIN: "#c6011f",
  CLE: "#00385d",
  COL: "#33006f",
  CWS: "#27251f",
  DET: "#0c2340",
  HOU: "#002d62",
  KC: "#004687",
  LAA: "#ba0021",
  LAD: "#005a9c",
  MIA: "#00a3e0",
  MIL: "#ffc52f",
  MIN: "#002b5c",
  NYM: "#002d72",
  NYY: "#003087",
  PHI: "#e81828",
  PIT: "#fdb827",
  SD: "#2f241d",
  SEA: "#0c2c56",
  SF: "#fd5a1e",
  STL: "#c41e3a",
  TB: "#092c5c",
  TEX: "#003278",
  TOR: "#134a8e",
  WSH: "#ab0003",
};

export function teamColor(abbr: string | null, fallback = "#3b3b3b"): string {
  if (!abbr) return fallback;
  return MLB_TEAM_COLORS[abbr] ?? fallback;
}
