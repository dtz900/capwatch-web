import type { InningHalf, Sport } from "./types";

export interface LiveClock {
  sport?: Sport;
  inning?: number | null;
  inning_half?: InningHalf | null;
  period?: number | null;
  clock?: string | null;
  status_name?: string | null;
}

/**
 * Short in-game status for a live game chip: "BOT 7" for baseball, "Q3 · 4:12"
 * / "HALF" / "OT" / "2OT" for football and basketball (both run four
 * quarters, period 5 is the first OT), "1H 12:34" / "HALF" / "2H" / "OT" for
 * college basketball (two halves, period 3 is the first OT). Falls back to "LIVE" when the feed has
 * no period detail yet.
 */
export function liveLabel(g: LiveClock): string {
  // College basketball plays two halves: period 1 = "1H", 2 = "2H", 3+ = OT.
  if (g.sport === "NCAAB") {
    const name = (g.status_name ?? "").toUpperCase();
    if (name === "STATUS_HALFTIME") return "HALF";
    if (name === "STATUS_DELAYED") return "DELAY";
    if (name === "STATUS_POSTPONED") return "PPD";
    if (g.period == null || g.period <= 0) return "LIVE";
    const h = g.period > 2 ? (g.period === 3 ? "OT" : `${g.period - 2}OT`) : g.period === 1 ? "1H" : "2H";
    if (name === "STATUS_END_PERIOD") return `END ${h}`;
    return g.clock ? `${h} ${g.clock}` : h;
  }
  if (g.sport === "NFL" || g.sport === "NBA") {
    const name = (g.status_name ?? "").toUpperCase();
    if (name === "STATUS_HALFTIME") return "HALF";
    if (name === "STATUS_DELAYED") return "DELAY";
    if (name === "STATUS_POSTPONED") return "PPD";
    if (g.period == null || g.period <= 0) return "LIVE";
    const q = g.period > 4 ? (g.period === 5 ? "OT" : `${g.period - 4}OT`) : `Q${g.period}`;
    if (name === "STATUS_END_PERIOD") return `END ${q}`;
    return g.clock ? `${q} · ${g.clock}` : q;
  }
  if (g.inning_half && g.inning != null) {
    return `${g.inning_half.toUpperCase()} ${g.inning}`;
  }
  return "LIVE";
}
