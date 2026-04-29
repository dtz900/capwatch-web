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
  if (r.startsWith("prop_pitcher") || r.startsWith("prop_batter") || r === "player_prop") return "Player prop";
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
