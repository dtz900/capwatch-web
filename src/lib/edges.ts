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

export type VerdictTone = "pos" | "neg" | "muted";

export interface EdgeView {
  label: string;
  meta: string;
  verdict: { label: string; tone: VerdictTone };
  sentence: string;
  roi: string;
  roiTone: VerdictTone;
  secondary: string;
}

/* Friendly market names. Anything unmapped renders as-is. */
export const MARKET_LABELS: Record<string, string> = {
  ML: "Moneyline",
  HRR: "Hits + Runs + RBIs",
  First5: "First 5 Innings",
};

const pct = (v: number | null) =>
  v === null ? "n/a" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;

const hasReason = (reasons: string[], needle: string) =>
  reasons.some((r) => r.includes(needle));

/* The backend's gate_reasons are fixed analyst strings (core/market_edges.py
   evaluate_gate). This maps them to one plain-English verdict + sentence.
   Precedence: a passing gate wins, then an outright losing record, then the
   closing-line variance flag, then small samples, then the luck check. */
function verdict(row: EdgeRow): { label: string; tone: VerdictTone; sentence: string } {
  const reasons = row.gate_reasons ?? [];
  const roi = row.roi_pct;
  const xroi = row.xroi_pct;

  if (row.gate_pass) {
    return {
      label: "HOLDS UP",
      tone: "pos",
      sentence: "Profitable even judged by closing odds instead of results. That is what real edge looks like.",
    };
  }

  if (roi !== null && roi < 0) {
    const smallSample =
      hasReason(reasons, "fewer than") || hasReason(reasons, "too few picks");
    if (xroi !== null && xroi > 0 && !smallSample) {
      /* The judge must cut both ways: if winning above expectation is luck,
         losing below a positive expectation is bad luck, not bad betting. */
      return {
        label: "UNLUCKY",
        tone: "pos",
        sentence: `Down ${Math.abs(roi).toFixed(1)}%, but closing odds say these picks should be winning (${pct(xroi)} expected). Bad run, good bets.`,
      };
    }
    if (xroi !== null && xroi > 0) {
      return {
        label: "LOSING",
        tone: "neg",
        sentence: `Down ${Math.abs(roi).toFixed(1)}%, though closing odds say these picks deserved better. Sample is still small.`,
      };
    }
    return {
      label: "LOSING",
      tone: "neg",
      sentence: `Down ${Math.abs(roi).toFixed(1)}% in this market this season.`,
    };
  }

  if (hasReason(reasons, "CLV negative")) {
    const beat = row.clv_beat_pct !== null ? Math.round(row.clv_beat_pct) : null;
    return {
      label: "VARIANCE",
      tone: "neg",
      sentence:
        beat !== null
          ? `Up so far, but he beats the closing number only ${beat}% of the time. That is coin-flip territory.`
          : "Up so far, but he is not beating the closing number. That is coin-flip territory.",
    };
  }

  if (hasReason(reasons, "fewer than") || hasReason(reasons, "too few picks")) {
    return {
      label: "TOO EARLY",
      tone: "muted",
      sentence: `Only ${row.n_decided} graded picks so far. Too early to separate skill from luck.`,
    };
  }

  if (hasReason(reasons, "xROI not positive")) {
    return {
      label: "LUCK SO FAR",
      tone: "neg",
      sentence:
        xroi !== null
          ? `Up ${pct(roi)}, but closing odds say these picks should be around ${pct(xroi)}. The extra is luck, and luck fades.`
          : "He is winning more than closing odds say these picks should. That gap usually fades.",
    };
  }

  if (hasReason(reasons, "realized ROI under")) {
    return {
      label: "MARGINAL",
      tone: "muted",
      sentence: "Slightly up, but not enough edge yet to call it real.",
    };
  }

  /* Remaining failures are provenance checks only (tracked days, season
     halves). Those bind the internal tailing gate, not the public verdict:
     the numbers here are positive by closing odds, so say so. */
  return {
    label: "HOLDS UP",
    tone: "pos",
    sentence: "Profitable even judged by closing odds instead of results. That is what real edge looks like.",
  };
}

export function buildEdgeView(row: EdgeRow): EdgeView {
  const v = verdict(row);
  let secondary: string;
  if (row.xroi_pct !== null) {
    secondary = `${pct(row.xroi_pct)} by closing odds`;
  } else if (row.clv_n > 0 && row.clv_beat_pct !== null) {
    secondary = `beats the close ${Math.round(row.clv_beat_pct)}% of the time`;
  } else {
    secondary = "no line data";
  }
  return {
    label: MARKET_LABELS[row.market] ?? row.market,
    meta: `${row.n_decided} picks · ${row.tracked_days ?? "?"} days tracked`,
    verdict: { label: v.label, tone: v.tone },
    sentence: v.sentence,
    roi: `${pct(row.roi_pct)} ROI`,
    roiTone:
      row.roi_pct !== null && row.roi_pct > 0
        ? "pos"
        : row.roi_pct !== null && row.roi_pct < 0
          ? "neg"
          : "muted",
    secondary,
  };
}

/* Plain-word verdicts. No pill chrome; the word and its color carry it. */
export const VERDICT_WORDS: Record<string, string> = {
  "HOLDS UP": "real edge",
  UNLUCKY: "unlucky",
  "LUCK SO FAR": "luck",
  VARIANCE: "variance",
  LOSING: "losing",
  MARGINAL: "thin",
  "TOO EARLY": "too early",
};

export const toneCls = (tone: VerdictTone) =>
  tone === "pos"
    ? "text-[var(--color-pos)]"
    : tone === "neg"
      ? "text-[var(--color-neg)]"
      : "text-[var(--color-text-muted)]";
