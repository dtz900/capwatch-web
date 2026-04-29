/**
 * Collapse parser-level market labels into reader-friendly categories.
 * Five buckets: Moneyline, Spread, Total, Player prop, Game prop.
 * Returns the raw label as a fallback so unknown markets still render.
 */
export function normalizeMarket(raw: string): string {
  const r = raw.trim().toLowerCase();
  if (r === "ml" || r === "f5_ml") return "Moneyline";
  if (r === "spread" || r === "f5_spread" || r === "run_line" || r === "runline") return "Spread";
  if (r === "total" || r === "f5_total" || r === "team_total") return "Total";
  if (r.startsWith("prop_pitcher") || r.startsWith("prop_batter") || r === "player_prop" || r === "prop") return "Player prop";
  if (r === "nrfi" || r === "yrfi" || r === "game_prop" || r.startsWith("inning_") || r === "first_5") return "Game prop";
  if (r === "parlay") return "Parlay";
  return raw;
}

/**
 * Re-aggregate a raw market->share map into canonical buckets, summing shares.
 * Returns entries sorted by descending share.
 */
export function normalizeBreakdown(breakdown: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [raw, share] of Object.entries(breakdown)) {
    const key = normalizeMarket(raw);
    out[key] = (out[key] ?? 0) + share;
  }
  return out;
}

interface PickLike {
  kind?: "straight" | "parlay";
  market?: string | null;
  selection?: string | null;
  line?: number | null;
  odds_taken?: number | null;
  leg_count?: number | null;
}

/**
 * Reader-friendly market label for a single pick.
 * Parlays return "Parlay"; everything else goes through normalizeMarket.
 */
export function formatMarketLabel(pick: PickLike): string {
  if (pick.kind === "parlay") return "Parlay";
  if (!pick.market) return "Pick";
  return normalizeMarket(pick.market);
}

/**
 * Build a clean "{selection} {line} {odds}" string, skipping any value the
 * parser already baked into the selection. Handles cases like:
 *   selection="Cleveland Guardians -136"  → "Cleveland Guardians -136"
 *   selection="Yankees", odds=-135        → "Yankees -135"
 *   selection="Under 8", line=8           → "Under 8"
 *   selection="Rangers +1.5", line=1.5    → "Rangers +1.5"
 */
export function formatBetDescriptor(pick: PickLike): string {
  if (pick.kind === "parlay") {
    return pick.leg_count ? `${pick.leg_count}-leg parlay` : "Parlay";
  }

  const sel = (pick.selection ?? "").trim();
  const out: string[] = [];
  if (sel) out.push(sel);

  if (pick.line != null) {
    const lineStr = String(pick.line);
    const escaped = lineStr.replace(/\./g, "\\.");
    const lineIn = new RegExp(`(?:^|\\s)[+-]?${escaped}(?:\\s|$)`).test(sel);
    if (!lineIn) out.push(lineStr);
  }

  if (pick.odds_taken != null) {
    const sign = pick.odds_taken > 0 ? "+" : "";
    const oddsStr = `${sign}${pick.odds_taken}`;
    if (!sel.includes(oddsStr)) out.push(oddsStr);
  }

  return out.join(" ").replace(/\s+/g, " ").trim() || pick.market || "Pick";
}
