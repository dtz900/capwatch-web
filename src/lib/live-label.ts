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
 * / "HALF" / "OT" for football. Falls back to "LIVE" when the feed has no
 * period detail yet.
 */
export function liveLabel(g: LiveClock): string {
  if (g.sport === "NFL") {
    const name = (g.status_name ?? "").toUpperCase();
    if (name === "STATUS_HALFTIME") return "HALF";
    if (name === "STATUS_DELAYED") return "DELAY";
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
