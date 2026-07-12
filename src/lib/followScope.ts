/* Maps a profile-history display market token (the Market filter values,
 * e.g. "ml", "f5_total", "prop_batter_hrr") to the coarse follow-scope
 * vocabulary used by capper_follows.market and today-picks market_group.
 *
 * The scope values MUST be outputs of the backend's bucket() in
 * core/market_edges.py, composed with core/market_label.py's
 * synth_market_label token vocabulary. Keep the three in sync.
 *
 * Returns null for markets with no meaningful follow scope (nrfi/yrfi and
 * game props bucket to "Other" server-side); callers hide the tail control.
 */
const EXACT_SCOPE: Record<string, string> = {
  ml: "ML",
  spread: "Spread",
  run_line: "Spread",
  runline: "Spread",
  total: "Game Total",
  team_total: "Team Total",
  f5_team_total: "Team Total",
  f5_ml: "First5",
  f5_spread: "First5",
  f5_total: "First5",
  first_5: "First5",
  prop_batter_hrr: "HRR",
  prop_pitcher_hrr: "HRR",
  prop_batter_tb: "Total Bases",
  prop_pitcher_k: "Strikeouts",
  prop_batter_hr: "Home Runs",
};

export function followScopeForMarket(displayMarket: string): string | null {
  const key = displayMarket.toLowerCase();
  if (EXACT_SCOPE[key]) return EXACT_SCOPE[key];
  // Every other player prop (batter hits, pitcher outs, ...) buckets to
  // "Other Prop" server-side, so that IS the scope that matches their picks.
  if (key === "player_prop" || /^prop_(batter|pitcher)_/.test(key)) return "Other Prop";
  return null;
}
