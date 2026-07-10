import type { EdgeRow } from "@/lib/edges";

/* Tunables for the VIP panel depth cells. Spec:
   docs/superpowers/specs/2026-07-09-tailslips-vip-panel-depth-design.md */
/* clv_avg_cents is BASIS POINTS of implied probability (see
   fadeai-platform jobs/stamp_capper_clv.py). Flag at 1 full point. */
export const HONESTY_FLAG_CENTS = 100;
export const HONESTY_MIN_N = 20;
export const LEAD_WARN_MINUTES = 10;
export const TREND_MIN_N = 10;
export const TREND_FLAT_TOL = 2.0;

export type CellTone = "pos" | "neg" | "muted" | "warn";

/* One labeled scoreboard cell: a bold focal value with a small sub-line. */
export interface EdgeCell {
  value: string;
  sub: string;
  tone: CellTone;
}

export interface EdgeCells {
  luck: EdgeCell;
  trend: EdgeCell;
  close: EdgeCell;
  timing: EdgeCell;
}

export interface HeadlineStrip {
  luck: { net: number; expected: number; delta: number; n: number } | null;
  honesty: { avgCents: number; n: number; flagged: boolean } | null;
  lead: { minutes: number; warn: boolean } | null;
}

export function fmtU(v: number): string {
  const r = v.toFixed(1);
  const signed = v < 0 ? r : `+${r}`;
  // -0.0 reads as noise; normalize it to +0.0
  return `${signed === "-0.0" ? "+0.0" : signed}u`;
}

/* Post-to-pitch lead in human units: hours once it stops being minutes. */
export function fmtLead(minutes: number): string {
  if (minutes >= 120) return `~${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes)} min`;
}

const pct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
const bpsPct = (v: number) => `${v > 0 ? "+" : ""}${(v / 100).toFixed(1)}%`;

function luckCell(row: EdgeRow): EdgeCell {
  const actual = row.x_actual_pnl_units;
  const expected = row.x_pnl_units;
  if (actual == null || expected == null) {
    return { value: "n/a", sub: "de-luck unavailable", tone: "muted" };
  }
  const delta = actual - expected;
  const hot = delta >= 0;
  return {
    value: `ran ${hot ? "hot" : "cold"} by ${Math.abs(delta).toFixed(1)}u`,
    sub: `${fmtU(actual)} actual vs ${fmtU(expected)} expected`,
    tone: hot ? "warn" : "muted",
  };
}

function trendCell(row: EdgeRow): EdgeCell {
  const n = row.x_n_30d ?? 0;
  if (n < TREND_MIN_N || row.xroi_30d == null || row.xroi_pct == null) {
    return {
      value: "too thin",
      sub: `only ${row.n_30d ?? 0} picks in 30d`,
      tone: "muted",
    };
  }
  const diff = row.xroi_30d - row.xroi_pct;
  const tone: CellTone = diff > TREND_FLAT_TOL ? "pos" : diff < -TREND_FLAT_TOL ? "neg" : "muted";
  const word = tone === "pos" ? "improving" : tone === "neg" ? "cooling" : "steady";
  return {
    value: `${pct(row.xroi_30d)} last 30d`,
    sub: `season ${pct(row.xroi_pct)} by close, ${word}`,
    tone,
  };
}

function closeCell(row: EdgeRow): EdgeCell {
  if (!row.clv_n || row.clv_beat_pct == null || row.clv_avg_cents == null) {
    return { value: "n/a", sub: "no priced picks", tone: "muted" };
  }
  // The hard-to-match flag needs a real sample; 12 lucky quotes prove nothing.
  const flagged = row.clv_avg_cents > HONESTY_FLAG_CENTS && row.clv_n >= HONESTY_MIN_N;
  return {
    value: `${bpsPct(row.clv_avg_cents)} vs close`,
    sub: flagged
      ? "hard to match at post time"
      : `beats the close ${Math.round(row.clv_beat_pct)}% of ${row.clv_n}`,
    tone: flagged ? "warn" : "muted",
  };
}

function timingCell(row: EdgeRow): EdgeCell {
  const m = row.median_lead_minutes;
  if (m == null) return { value: "n/a", sub: "post timing unknown", tone: "muted" };
  const warn = m < LEAD_WARN_MINUTES;
  return {
    value: `${fmtLead(m)} pre-pitch`,
    sub: warn ? "posts near first pitch" : "median post to first pitch",
    tone: warn ? "warn" : "muted",
  };
}

export function buildEdgeCells(row: EdgeRow): EdgeCells {
  return {
    luck: luckCell(row),
    trend: trendCell(row),
    close: closeCell(row),
    timing: timingCell(row),
  };
}

export function buildHeadlineStrip(rows: EdgeRow[]): HeadlineStrip {
  let net = 0;
  let expected = 0;
  let luckN = 0;
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
      luckN += r.x_n ?? 0;
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
  // Below the floor the honesty read is noise; render the cell as no-data.
  const avgCents = centsN >= HONESTY_MIN_N ? centsSum / centsN : null;
  const leadMin = leadN > 0 ? leadSum / leadN : null;
  return {
    luck: hasLuck ? { net, expected, delta: net - expected, n: luckN } : null,
    honesty:
      avgCents != null
        ? { avgCents, n: centsN, flagged: avgCents > HONESTY_FLAG_CENTS }
        : null,
    lead: leadMin != null ? { minutes: leadMin, warn: leadMin < LEAD_WARN_MINUTES } : null,
  };
}
