/**
 * Canonical bet-line formatter for the slate page.
 *
 * The parser stores capper picks in whatever shape the tweet had: "Brewers ML",
 * "MIL -133", "Brewers/Nationals o7.5 7.5 -115", "Giants ML -115", etc. This
 * module normalizes those into a consistent rendering using the game's team
 * abbreviations as context.
 */

import { normalizeMarket } from "./markets";

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

// Full team name to abbreviation. Sorted so longest-first matching can be done
// without ambiguity (e.g. "Red Sox" before "Sox", "White Sox" before "Sox").
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

function fmtOdds(odds: number | null | undefined): string {
  if (odds == null) return "";
  return odds > 0 ? `+${odds}` : `${odds}`;
}

/**
 * Try to resolve the team being bet on from `selection`. Prefer matching against
 * the away/home abbrs the slate already knows; fall back to scanning aliases.
 */
function resolveTeam(
  selection: string,
  awayTeam: string | null | undefined,
  homeTeam: string | null | undefined,
): string | null {
  const sel = ` ${selection.toLowerCase()} `;

  // Match the game's known abbrs first (word-boundary aware).
  for (const abbr of [awayTeam, homeTeam]) {
    if (!abbr) continue;
    const lower = abbr.toLowerCase();
    const re = new RegExp(`\\b${lower}\\b`, "i");
    if (re.test(selection)) return abbr;
  }

  // Then any other abbr.
  for (const abbr of ALL_ABBRS) {
    const re = new RegExp(`\\b${abbr}\\b`, "i");
    if (re.test(selection)) return abbr;
  }

  // Then full-name aliases (longest-first — TEAM_ALIASES is pre-sorted).
  for (const [name, abbr] of TEAM_ALIASES) {
    if (sel.includes(` ${name.toLowerCase()} `) || sel.includes(`${name.toLowerCase()} `) || sel.includes(` ${name.toLowerCase()}`)) {
      return abbr;
    }
  }

  return null;
}

function detectTotalSide(selection: string): "Over" | "Under" | null {
  const s = selection.trim().toLowerCase();
  if (s.startsWith("over") || /^o[\s.]/.test(s) || s === "o") return "Over";
  if (s.startsWith("under") || /^u[\s.]/.test(s) || s === "u") return "Under";
  return null;
}

function shortPlayerName(text: string): string {
  // "Foster Griffin" -> "F. Griffin". Leaves single tokens alone.
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) return text.trim();
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

/**
 * Player prop normalizer. The selection often looks like:
 *   "Foster Griffin under 17.5 PO"
 *   "Aaron Judge over 1.5 hits"
 *   "Cole o5.5 K"
 * Strategy: find the over/under token, split the string, render canonically.
 */
function formatProp(selection: string, line: number | null, odds: string): string {
  const trimmed = selection.trim();
  // eslint-disable-next-line prefer-const
  let [head, tail] = splitOnOverUnder(trimmed);
  if (head == null || tail == null) {
    return [trimmed, line, odds].filter((v) => v != null && v !== "").join(" ");
  }
  const player = shortPlayerName(head);
  const sideMatch = trimmed.match(/\b(over|under|o\.?|u\.?)\b/i);
  const sideRaw = sideMatch?.[1]?.toLowerCase() ?? "";
  const side = sideRaw.startsWith("o") ? "o" : "u";

  // tail looks like "17.5 PO" or "5.5 K" or just "17.5".
  const tailParts = tail.trim().split(/\s+/);
  const numToken = tailParts.find((t) => /^[+-]?\d+(\.\d+)?$/.test(t));
  const numStr = numToken ?? (line != null ? String(line) : "");
  const stat = tailParts.filter((t) => t !== numToken).join(" ").trim();

  const core = `${player} ${side}${numStr}${stat ? ` ${stat}` : ""}`.trim();
  return [core, odds].filter(Boolean).join(" ");
}

function splitOnOverUnder(text: string): [string | null, string | null] {
  const m = text.match(/(.*?)\b(over|under|o\.?|u\.?)\b(.*)/i);
  if (!m) return [null, null];
  return [m[1].trim(), m[3].trim()];
}

/**
 * Strip a previously-baked `[+\-]?\b<line>\b` from the end/middle of a string so
 * we don't double-render it.
 */
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
  const bucket = normalizeMarket(pick.market ?? "");

  // First-five prefix. The market label "F5_ML" / "F5_TOTAL" is normalized into
  // its bucket, so we re-detect the prefix from the raw market string.
  const isF5 = (pick.market ?? "").toLowerCase().startsWith("f5_") ||
               (pick.market ?? "").toLowerCase() === "first_5";
  const prefix = isF5 ? "F5 " : "";

  if (bucket === "Moneyline") {
    const team = resolveTeam(selection, awayTeam, homeTeam);
    return [`${prefix}${team ?? selection}`.trim(), "ML", odds].filter(Boolean).join(" ");
  }

  if (bucket === "Total") {
    const side = detectTotalSide(selection);
    const lineStr = pick.line != null ? String(pick.line) : null;
    if (side && lineStr) {
      return [`${prefix}${side}`, lineStr, odds].filter(Boolean).join(" ");
    }
    // Fall through to fallback if we couldn't parse a side.
  }

  if (bucket === "Spread") {
    const team = resolveTeam(selection, awayTeam, homeTeam);
    if (team && pick.line != null) {
      const lineStr = pick.line > 0 ? `+${pick.line}` : `${pick.line}`;
      return [`${prefix}${team}`, lineStr, odds].filter(Boolean).join(" ");
    }
  }

  if (bucket === "Player prop") {
    return formatProp(selection, pick.line ?? null, odds);
  }

  // Default: take selection, strip duplicates of line/odds, append clean line+odds.
  let cleaned = selection;
  cleaned = stripEmbeddedOdds(cleaned, pick.odds_taken);
  cleaned = stripEmbeddedLine(cleaned, pick.line ?? null);
  const tokens: string[] = [];
  if (cleaned) tokens.push(cleaned);
  if (pick.line != null) tokens.push(String(pick.line));
  if (odds) tokens.push(odds);
  return tokens.join(" ").trim() || pick.market || "Pick";
}
