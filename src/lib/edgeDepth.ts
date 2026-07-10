import type { EdgeRow } from "@/lib/edges";

/* Tunables for the VIP panel depth lines. Spec:
   docs/superpowers/specs/2026-07-09-tailslips-vip-panel-depth-design.md */
export const HONESTY_FLAG_CENTS = 15;
export const LEAD_WARN_MINUTES = 10;
export const TREND_MIN_N = 10;
export const TREND_FLAT_TOL = 2.0;

export interface DepthLine {
  text: string;
  tone: "pos" | "neg" | "muted" | "warn";
}

export interface EdgeDepth {
  luck: DepthLine;
  trend: DepthLine;
  honesty: DepthLine;
  lead: DepthLine;
}

export interface HeadlineStrip {
  luck: { net: number; expected: number; delta: number } | null;
  honesty: { avgCents: number; n: number; flagged: boolean } | null;
  lead: { minutes: number; warn: boolean } | null;
}

export function fmtU(v: number): string {
  const r = v.toFixed(1);
  const signed = v < 0 ? r : `+${r}`;
  // -0.0 reads as noise; normalize it to +0.0
  return `${signed === "-0.0" ? "+0.0" : signed}u`;
}

const pct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
const cents = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v)}c`;

function luckLine(row: EdgeRow): DepthLine {
  const actual = row.x_actual_pnl_units;
  const expected = row.x_pnl_units;
  if (actual == null || expected == null) {
    return { text: "De-luck unavailable for this market.", tone: "muted" };
  }
  const delta = actual - expected;
  const dir = delta >= 0 ? "hot" : "cold";
  return {
    text: `${fmtU(actual)} on de-luckable picks: ${fmtU(expected)} expected, ran ${dir} by ${Math.abs(delta).toFixed(1)}u.`,
    tone: "muted",
  };
}

function trendLine(row: EdgeRow): DepthLine {
  const n = row.x_n_30d ?? 0;
  if (n < TREND_MIN_N || row.xroi_30d == null || row.xroi_pct == null) {
    return {
      text: `Last 30d: only ${row.n_30d ?? 0} picks, too thin to read.`,
      tone: "muted",
    };
  }
  const diff = row.xroi_30d - row.xroi_pct;
  const tone = diff > TREND_FLAT_TOL ? "pos" : diff < -TREND_FLAT_TOL ? "neg" : "muted";
  const word = tone === "pos" ? "improving" : tone === "neg" ? "cooling" : "steady";
  return {
    text: `Last 30d xROI ${pct(row.xroi_30d)} vs season ${pct(row.xroi_pct)}, ${word}.`,
    tone,
  };
}

function honestyLine(row: EdgeRow): DepthLine {
  if (!row.clv_n || row.clv_beat_pct == null || row.clv_avg_cents == null) {
    return { text: "No priced picks in this market.", tone: "muted" };
  }
  const flagged = row.clv_avg_cents > HONESTY_FLAG_CENTS;
  return {
    text: `Posted prices: beats the close ${Math.round(row.clv_beat_pct)}% of the time, avg ${cents(row.clv_avg_cents)} vs close.${flagged ? " Prices this far ahead of the close are rarely still available." : ""}`,
    tone: flagged ? "warn" : "muted",
  };
}

function leadLine(row: EdgeRow): DepthLine {
  const m = row.median_lead_minutes;
  if (m == null) return { text: "Post timing unknown.", tone: "muted" };
  const warn = m < LEAD_WARN_MINUTES;
  return {
    text: `Posts ~${Math.round(m)} min before first pitch (median).${warn ? " By the time you see it, the game is starting." : ""}`,
    tone: warn ? "warn" : "muted",
  };
}

export function buildEdgeDepth(row: EdgeRow): EdgeDepth {
  return {
    luck: luckLine(row),
    trend: trendLine(row),
    honesty: honestyLine(row),
    lead: leadLine(row),
  };
}

export function buildHeadlineStrip(rows: EdgeRow[]): HeadlineStrip {
  let net = 0;
  let expected = 0;
  let hasLuck = false;
  let centsSum = 0;
  let centsN = 0;
  let leadSum = 0;
  let leadN = 0;
  for (const r of rows) {
    if (r.x_actual_pnl_units != null && r.x_pnl_units != null) {
      hasLuck = true;
      net += r.x_actual_pnl_units;
      expected += r.x_pnl_units;
    }
    if (r.clv_n > 0 && r.clv_avg_cents != null) {
      centsSum += r.clv_avg_cents * r.clv_n;
      centsN += r.clv_n;
    }
    if (r.median_lead_minutes != null && r.n_decided > 0) {
      leadSum += r.median_lead_minutes * r.n_decided;
      leadN += r.n_decided;
    }
  }
  const avgCents = centsN > 0 ? centsSum / centsN : null;
  const leadMin = leadN > 0 ? leadSum / leadN : null;
  return {
    luck: hasLuck ? { net, expected, delta: net - expected } : null,
    honesty:
      avgCents != null
        ? { avgCents, n: centsN, flagged: avgCents > HONESTY_FLAG_CENTS }
        : null,
    lead: leadMin != null ? { minutes: leadMin, warn: leadMin < LEAD_WARN_MINUTES } : null,
  };
}
