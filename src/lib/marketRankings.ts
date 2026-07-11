import type { EdgeRow } from "@/lib/edges";

/* One edge row joined with its capper identity (from the leaderboard the
   my-tails page already loads). */
export interface RankedEdgeRow extends EdgeRow {
  capper_id: number;
  handle: string | null;
  display_name: string | null;
}

/* Chip order. Matches the coarse market vocabulary of capper_market_edges. */
export const MARKET_ORDER: string[] = [
  "ML",
  "Spread",
  "Game Total",
  "Team Total",
  "First5",
  "HRR",
  "Strikeouts",
  "Total Bases",
  "Home Runs",
  "Other Prop",
];

/* Sort key precedence (spec 2026-07-11): originators rank by tail-at-close
   even when xROI exists (CLV cannot see an originator), then de-lucked xROI,
   then tail-at-close (covers ML, which never has xROI), then realized ROI. */
export function sortKey(row: RankedEdgeRow): number | null {
  if (row.originator && row.tail_at_close_roi != null) return row.tail_at_close_roi;
  if ((row.x_n ?? 0) > 0 && row.xroi_pct != null) return row.xroi_pct;
  if (row.tail_at_close_roi != null) return row.tail_at_close_roi;
  if (row.roi_pct != null) return row.roi_pct;
  return null;
}

export const fmtPct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;

/* The displayed number is always the number the row was ranked by. */
export function headline(row: RankedEdgeRow): { value: string; label: string } | null {
  if (row.originator && row.tail_at_close_roi != null)
    return { value: fmtPct(row.tail_at_close_roi), label: "tailing at close" };
  if ((row.x_n ?? 0) > 0 && row.xroi_pct != null)
    return { value: fmtPct(row.xroi_pct), label: "by closing odds" };
  if (row.tail_at_close_roi != null)
    return { value: fmtPct(row.tail_at_close_roi), label: "tailing at close" };
  if (row.roi_pct != null) return { value: fmtPct(row.roi_pct), label: "ROI" };
  return null;
}

export function rankRows(rows: RankedEdgeRow[]): RankedEdgeRow[] {
  return [...rows].sort((a, b) => {
    const ka = sortKey(a);
    const kb = sortKey(b);
    if (ka == null && kb == null) return 0;
    if (ka == null) return 1;
    if (kb == null) return -1;
    return kb - ka;
  });
}

export const isTailable = (row: RankedEdgeRow): boolean =>
  row.gate_pass || row.originator;

export function digest(rows: RankedEdgeRow[]): RankedEdgeRow[] {
  return rankRows(rows.filter(isTailable));
}

export function marketsPresent(rows: RankedEdgeRow[]): string[] {
  const present = new Set(rows.map((r) => r.market));
  const known = MARKET_ORDER.filter((m) => present.has(m));
  const unknown = [...present].filter((m) => !MARKET_ORDER.includes(m)).sort();
  return [...known, ...unknown];
}
