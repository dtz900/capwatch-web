export interface EdgeRow {
  market: string;
  n_decided: number;
  roi_pct: number | null;
  xroi_pct: number | null;
  clv_beat_pct: number | null;
  clv_avg_cents: number | null;
  clv_n: number;
  tracked_days: number | null;
  gate_pass: boolean;
  gate_reasons: string[];
}

const pct = (v: number | null) =>
  v === null ? "n/a" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;

export function formatEdgeRow(row: EdgeRow) {
  return {
    label: row.market,
    roi: pct(row.roi_pct),
    xroi: pct(row.xroi_pct),
    clv: row.clv_n > 0 && row.clv_beat_pct !== null
      ? `beat close ${Math.round(row.clv_beat_pct)}%`
      : "no close data",
    trust: `${row.n_decided} picks, tracked ${row.tracked_days ?? "?"} days`,
  };
}
