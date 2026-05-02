/**
 * Canonical bet-line formatter for the slate page.
 *
 * The parser stores capper picks in whatever shape the tweet had: "Brewers ML",
 * "MIL -133", "Brewers/Nationals o7.5 7.5 -115", "Cade Povisch 5+ Strikeouts
 * Thrown", "Cam Schlittler over 4.5 strikeouts", etc. Most rows have
 * market=null; we infer the bucket from the selection text and re-render
 * canonically using the game's team abbreviations.
 */

interface PickInput {
  kind?: "straight" | "parlay_leg" | "parlay" | null;
  market?: string | null;
  selection?: string | null;
  line?: number | null;
  odds_taken?: number | null;
  leg_count?: number | null;
}

interface FormatContext {
  pick: PickInput;
  awayTeam?: string | null;
  homeTeam?: string | null;
}

export type MarketBucket =
  | "Moneyline"
  | "Spread"
  | "Total"
  | "Player prop"
  | "Game prop"
  | "Parlay";

// Full-name -> abbr aliases. Sorted longest-first so "Red Sox" wins before "Sox"
// can match anything ambiguous.
const TEAM_ALIASES: Array<[string, string]> = [
  ["Diamondbacks", "AZ"],
  ["D-backs", "AZ"],
  ["Dbacks", "AZ"],
  ["White Sox", "CWS"],
  ["Red Sox", "BOS"],
  ["Blue Jays", "TOR"],
  ["Athletics", "ATH"],
  ["Cardinals", "STL"],
  ["Nationals", "WSH"],
  ["Guardians", "CLE"],
  ["Mariners", "SEA"],
  ["Brewers", "MIL"],
  ["Phillies", "PHI"],
  ["Pirates", "PIT"],
  ["Yankees", "NYY"],
  ["Rangers", "TEX"],
  ["Rockies", "COL"],
  ["Dodgers", "LAD"],
  ["Astros", "HOU"],
  ["Royals", "KC"],
  ["Braves", "ATL"],
  ["Angels", "LAA"],
  ["Marlins", "MIA"],
  ["Padres", "SD"],
  ["Giants", "SF"],
  ["Tigers", "DET"],
  ["Twins", "MIN"],
  ["Orioles", "BAL"],
  ["Mets", "NYM"],
  ["Cubs", "CHC"],
  ["Reds", "CIN"],
  ["Rays", "TB"],
];

const ALL_ABBRS = new Set([
  "ATH", "ATL", "AZ", "BAL", "BOS", "CHC", "CIN", "CLE", "COL", "CWS",
  "DET", "HOU", "KC", "LAA", "LAD", "MIA", "MIL", "MIN", "NYM", "NYY",
  "PHI", "PIT", "SD", "SEA", "SF", "STL", "TB", "TEX", "TOR", "WSH",
]);

// Player-prop stat words — used to disambiguate over/under in totals vs props.
const STAT_KEYWORDS = /\b(hit|hits|run|runs|rbi|rbis|strikeout|strikeouts|so|ks?|home\s*run|hrs?|tb|total\s*bases|walk|walks|bb|er|earned\s*runs?|outs?|po|pitches|pitch|stolen|sb)\b/i;

function fmtOdds(odds: number | null | undefined): string {
  if (odds == null) return "";
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function shortPlayerName(text: string): string {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) return text.trim();
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

function isF5(pick: PickInput): boolean {
  const market = (pick.market ?? "").toLowerCase();
  if (market.startsWith("f5_") || market === "first_5") return true;
  return /\bf5\b/i.test(pick.selection ?? "");
}

/**
 * Map raw market or selection text to a canonical bucket.
 * Returns null when neither yields a confident classification.
 */
export function inferMarketBucket(
  rawMarket: string | null | undefined,
  selection: string | null | undefined,
): MarketBucket | null {
  // 1. Trust the parser's market field if it's set.
  if (rawMarket) {
    const m = rawMarket.trim().toLowerCase();
    if (m === "ml" || m === "f5_ml") return "Moneyline";
    if (m === "spread" || m === "f5_spread" || m === "run_line" || m === "runline") return "Spread";
    if (m === "total" || m === "f5_total" || m === "team_total") return "Total";
    if (m.startsWith("prop_pitcher") || m.startsWith("prop_batter") || m === "player_prop" || m === "prop") return "Player prop";
    if (m === "nrfi" || m === "yrfi" || m === "game_prop") return "Game prop";
    if (m === "parlay") return "Parlay";
  }

  const sel = (selection ?? "").trim();
  if (!sel) return null;
  const lower = sel.toLowerCase();
  const hasStat = STAT_KEYWORDS.test(sel);

  // 2. Game prop signals.
  if (/\b(nrfi|yrfi)\b/i.test(sel)) return "Game prop";
  if (/\bmost\b.*\b(home\s*runs?|hits|strikeouts)\b/i.test(sel)) return "Game prop";

  // 3. Player prop heuristics.
  //    - "X+ <stat>"     e.g. "5+ Strikeouts Thrown", "1+ Hit"
  //    - "over/under N <stat>" with multi-word prefix (player name)
  //    - "oN.N <stat>" or "uN.N <stat>" with multi-word prefix
  if (/\b\d+\+/.test(sel) && hasStat) return "Player prop";
  if (/\b(over|under)\s+\d/i.test(lower) && hasStat && countWords(sel) >= 4) return "Player prop";
  if (/\b[oOuU]\d/.test(sel) && hasStat && countWords(sel) >= 4) return "Player prop";

  // 4. Total: starts with over/under, OR has team-slash-team pattern + o/over/u/under,
  //    OR plain "o<num>"/"u<num>" without a stat keyword.
  if (/^(over|under)\b/i.test(lower)) return "Total";
  if (/\/\s*\S+/.test(sel) && /\b(over|under|[oOuU]\d)/i.test(sel)) return "Total";
  if (/\b[oOuU]\d/.test(sel) && !hasStat) return "Total";

  // 5. Spread / Run line: contains a signed half-point line.
  if (/[+-]\d+(\.\d+)?\b/.test(sel) && !/\bml\b/i.test(lower) && !/\bmoneyline\b/i.test(lower)) {
    return "Spread";
  }

  // 6. ML: "TEAM ML" or "TEAM Moneyline".
  if (/\b(ml|moneyline)\b/i.test(sel)) return "Moneyline";

  return null;
}

function resolveTeam(
  selection: string,
  awayTeam: string | null | undefined,
  homeTeam: string | null | undefined,
): string | null {
  // Match the game's known abbrs first.
  for (const abbr of [awayTeam, homeTeam]) {
    if (!abbr) continue;
    const re = new RegExp(`\\b${abbr}\\b`, "i");
    if (re.test(selection)) return abbr;
  }

  // Then any standard MLB abbr.
  for (const abbr of ALL_ABBRS) {
    const re = new RegExp(`\\b${abbr}\\b`, "i");
    if (re.test(selection)) return abbr;
  }

  // Then full-name aliases (longest-first).
  const lower = ` ${selection.toLowerCase()} `;
  for (const [name, abbr] of TEAM_ALIASES) {
    const n = name.toLowerCase();
    if (lower.includes(` ${n} `) || lower.includes(` ${n}/`) || lower.includes(`/${n} `) || lower.includes(`/${n}/`)) {
      return abbr;
    }
  }

  return null;
}

function formatTotal(selection: string, line: number | null, odds: string): string | null {
  // Match "over N.N" / "under N.N" / "o N.N" / "u N.N" / "oN.N" / "uN.N" anywhere.
  let m = selection.match(/\b(over|under)\b\s*(\d+(?:\.\d+)?)?/i);
  let side: "Over" | "Under" | null = null;
  let lineFromText: number | null = null;
  if (m) {
    side = m[1].toLowerCase().startsWith("o") ? "Over" : "Under";
    if (m[2]) lineFromText = parseFloat(m[2]);
  } else {
    m = selection.match(/\b([oOuU])(\d+(?:\.\d+)?)\b/);
    if (m) {
      side = m[1].toLowerCase() === "o" ? "Over" : "Under";
      lineFromText = parseFloat(m[2]);
    }
  }
  if (!side) return null;
  const finalLine = lineFromText ?? line;
  if (finalLine == null) return side + (odds ? ` ${odds}` : "");
  return [side, finalLine, odds].filter(Boolean).join(" ");
}

function formatProp(selection: string, line: number | null, odds: string): string {
  const trimmed = selection.trim();

  // Pattern A: "<player> over|under N.N <stat>"
  let m = trimmed.match(/^(.+?)\s+\b(over|under|o[.\s]|u[.\s])\s*(\d+(?:\.\d+)?)\s*(.*)$/i);
  if (m) {
    const player = shortPlayerName(m[1].trim());
    const side = m[2].toLowerCase().startsWith("o") ? "o" : "u";
    const num = m[3];
    const stat = m[4].trim();
    return [`${player} ${side}${num}${stat ? " " + stat : ""}`.trim(), odds].filter(Boolean).join(" ");
  }

  // Pattern B: "<player> N+ <stat>"  e.g. "Cade Povisch 5+ Strikeouts Thrown"
  m = trimmed.match(/^(.+?)\s+(\d+\+)\s+(.+)$/);
  if (m) {
    const player = shortPlayerName(m[1].trim());
    const numPlus = m[2];
    const stat = m[3].trim();
    return [`${player} ${numPlus} ${stat}`, odds].filter(Boolean).join(" ");
  }

  // Pattern C: "<player> oN.N <stat>" e.g. "Cole o5.5 K"
  m = trimmed.match(/^(.+?)\s+([oOuU])(\d+(?:\.\d+)?)\s*(.*)$/);
  if (m) {
    const player = shortPlayerName(m[1].trim());
    const side = m[2].toLowerCase();
    const num = m[3];
    const stat = m[4].trim();
    return [`${player} ${side}${num}${stat ? " " + stat : ""}`.trim(), odds].filter(Boolean).join(" ");
  }

  // Fallback: shorten any leading player name + tack on line/odds.
  if (line != null) {
    return [shortPlayerName(trimmed), line, odds].filter(Boolean).join(" ");
  }
  return [shortPlayerName(trimmed), odds].filter(Boolean).join(" ");
}

function stripEmbeddedLine(text: string, line: number | null): string {
  if (line == null) return text.trim();
  const lineStr = String(line).replace(/\./g, "\\.");
  return text
    .replace(new RegExp(`(^|\\s)[+-]?${lineStr}(?=\\s|$)`), " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripEmbeddedOdds(text: string, oddsValue: number | null | undefined): string {
  if (oddsValue == null) return text;
  const sign = oddsValue > 0 ? "+" : "";
  const oddsStr = `${sign}${oddsValue}`;
  return text.replace(oddsStr, "").replace(/\s+/g, " ").trim();
}

export function formatPickText(ctx: FormatContext): string {
  const { pick, awayTeam, homeTeam } = ctx;

  if (pick.kind === "parlay" || (pick.market ?? "").toLowerCase() === "parlay") {
    return pick.leg_count ? `${pick.leg_count}-leg parlay` : "Parlay";
  }

  const selection = (pick.selection ?? "").trim();
  if (!selection && !pick.market) return "Pick";

  const odds = fmtOdds(pick.odds_taken);
  const bucket = inferMarketBucket(pick.market, selection);
  const prefix = isF5(pick) ? "F5 " : "";

  if (bucket === "Moneyline") {
    const team = resolveTeam(selection, awayTeam, homeTeam);
    const label = team ?? selection.replace(/\b(ml|moneyline)\b/gi, "").trim();
    return [`${prefix}${label}`.trim(), "ML", odds].filter(Boolean).join(" ");
  }

  if (bucket === "Total") {
    const out = formatTotal(selection, pick.line ?? null, odds);
    if (out) return `${prefix}${out}`.trim();
  }

  if (bucket === "Spread") {
    const team = resolveTeam(selection, awayTeam, homeTeam);
    if (team && pick.line != null) {
      const lineStr = pick.line > 0 ? `+${pick.line}` : `${pick.line}`;
      return [`${prefix}${team}`, lineStr, odds].filter(Boolean).join(" ");
    }
    // Selection might already have the line baked in; try extracting it.
    const m = selection.match(/([+-]\d+(\.\d+)?)/);
    if (team && m) {
      return [`${prefix}${team}`, m[1], odds].filter(Boolean).join(" ");
    }
  }

  if (bucket === "Player prop") {
    return formatProp(selection, pick.line ?? null, odds);
  }

  // Default fallback: clean selection, dedupe line/odds, append.
  let cleaned = selection;
  cleaned = stripEmbeddedOdds(cleaned, pick.odds_taken);
  cleaned = stripEmbeddedLine(cleaned, pick.line ?? null);
  const tokens: string[] = [];
  if (cleaned) tokens.push(cleaned);
  if (pick.line != null) tokens.push(String(pick.line));
  if (odds) tokens.push(odds);
  return tokens.join(" ").trim() || pick.market || "Pick";
}
