import { describe, it, expect } from "vitest";
import { buildEdgeView, type EdgeRow } from "@/lib/edges";

const base: EdgeRow = {
  market: "Strikeouts",
  n_decided: 117,
  roi_pct: 2.3,
  xroi_pct: -7.5,
  clv_beat_pct: null,
  clv_avg_cents: null,
  clv_n: 0,
  tracked_days: 73,
  gate_pass: false,
  gate_reasons: [],
};

describe("buildEdgeView verdicts", () => {
  it("HOLDS UP when the gate passes", () => {
    const v = buildEdgeView({ ...base, gate_pass: true, roi_pct: 13.4, xroi_pct: 4.2 });
    expect(v.verdict).toEqual({ label: "HOLDS UP", tone: "pos" });
  });

  it("LOSING when realized ROI is negative", () => {
    const v = buildEdgeView({
      ...base,
      roi_pct: -15.1,
      xroi_pct: -10.9,
      gate_reasons: ["fewer than 40 decided picks", "realized ROI under 6%"],
    });
    expect(v.verdict.label).toBe("LOSING");
    expect(v.verdict.tone).toBe("neg");
    expect(v.sentence).toContain("15.1%");
  });

  it("UNLUCKY when losing but the close-judged expectation is positive on a real sample", () => {
    const v = buildEdgeView({ ...base, roi_pct: -3.7, xroi_pct: 15.7 });
    expect(v.verdict).toEqual({ label: "UNLUCKY", tone: "pos" });
    expect(v.sentence).toContain("+15.7%");
  });

  it("stays LOSING when the positive expectation rests on a small sample", () => {
    const v = buildEdgeView({
      ...base,
      n_decided: 14,
      roi_pct: -19.2,
      xroi_pct: 1.1,
      gate_reasons: ["fewer than 40 decided picks", "realized ROI under 6%"],
    });
    expect(v.verdict.label).toBe("LOSING");
    expect(v.sentence).toContain("deserved better");
  });

  it("VARIANCE when the CLV gate fails", () => {
    const v = buildEdgeView({
      ...base,
      market: "ML",
      roi_pct: 1.9,
      xroi_pct: null,
      clv_beat_pct: 36,
      clv_n: 94,
      gate_reasons: ["realized ROI under 6%", "CLV negative: record looks like variance, not edge"],
    });
    expect(v.verdict).toEqual({ label: "VARIANCE", tone: "neg" });
    expect(v.sentence).toContain("36%");
  });

  it("HOLDS UP on strong numbers even when only provenance checks failed (backfilled record)", () => {
    const v = buildEdgeView({
      ...base,
      market: "Game Total",
      n_decided: 228,
      roi_pct: 15.6,
      xroi_pct: 9.4,
      tracked_days: 0,
      gate_reasons: [
        "tracked under 21 days (backfilled record)",
        "thin sample in one half of the season",
      ],
    });
    expect(v.verdict).toEqual({ label: "HOLDS UP", tone: "pos" });
  });

  it("TOO EARLY when the sample is small, even if other checks also failed", () => {
    const v = buildEdgeView({
      ...base,
      market: "Spread",
      n_decided: 23,
      roi_pct: 4.3,
      xroi_pct: 2.9,
      gate_reasons: [
        "fewer than 40 decided picks",
        "thin sample in one half of the season",
        "realized ROI under 6%",
        "de-lucked xROI materially negative in one half",
      ],
    });
    expect(v.verdict).toEqual({ label: "TOO EARLY", tone: "muted" });
    expect(v.sentence).toContain("23");
  });

  it("LUCK SO FAR when the luck-adjusted return is not positive", () => {
    const v = buildEdgeView({
      ...base,
      gate_reasons: [
        "realized ROI under 6%",
        "not profitable in both halves",
        "de-lucked xROI not positive",
      ],
    });
    expect(v.verdict).toEqual({ label: "LUCK SO FAR", tone: "neg" });
    expect(v.sentence).toContain("-7.5%");
  });

  it("MARGINAL when profitable but under the ROI bar", () => {
    const v = buildEdgeView({
      ...base,
      roi_pct: 4.9,
      xroi_pct: 11.9,
      gate_reasons: [
        "tracked under 21 days (backfilled record)",
        "realized ROI under 6%",
        "not profitable in both halves",
      ],
    });
    expect(v.verdict).toEqual({ label: "MARGINAL", tone: "muted" });
  });

  it("maps market codes to friendly names", () => {
    expect(buildEdgeView({ ...base, market: "ML" }).label).toBe("Moneyline");
    expect(buildEdgeView({ ...base, market: "HRR" }).label).toBe("Hits + Runs + RBIs");
    expect(buildEdgeView({ ...base, market: "Team Total" }).label).toBe("Team Total");
  });

  it("secondary line prefers the close-judged return, then close data, then none", () => {
    expect(buildEdgeView(base).secondary).toBe("-7.5% by closing odds");
    expect(
      buildEdgeView({ ...base, xroi_pct: null, clv_n: 94, clv_beat_pct: 36 }).secondary
    ).toBe("beats the close 36% of the time");
    expect(buildEdgeView({ ...base, xroi_pct: null }).secondary).toBe("no line data");
  });
});
