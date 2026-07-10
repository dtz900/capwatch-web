import { describe, expect, it } from "vitest";
import { buildEdgeView } from "@/lib/edges";

describe("buildEdgeView formatting", () => {
  it("formats a passing soft-market row", () => {
    const out = buildEdgeView({
      market: "Team Total", n_decided: 60, roi_pct: 8.1, xroi_pct: 5.3,
      clv_beat_pct: null, clv_avg_cents: null, clv_n: 0,
      tracked_days: 55, gate_pass: true, gate_reasons: [],
      originator: false, tail_at_close_roi: null,
    });
    expect(out.label).toBe("Team Total");
    expect(out.roi).toBe("+8.1% ROI");
    expect(out.roiTone).toBe("pos");
    expect(out.secondary).toBe("+5.3% by closing odds");
    expect(out.meta).toContain("60 picks");
  });

  it("marks a CLV-negative ML row", () => {
    const out = buildEdgeView({
      market: "ML", n_decided: 80, roi_pct: 12.0, xroi_pct: null,
      clv_beat_pct: 30, clv_avg_cents: -12, clv_n: 50,
      tracked_days: 90, gate_pass: false,
      gate_reasons: ["CLV negative: record looks like variance, not edge"],
      originator: false, tail_at_close_roi: null,
    });
    expect(out.label).toBe("Moneyline");
    expect(out.secondary).toBe("beats the close 30% of the time");
    expect(out.roi).toBe("+12.0% ROI");
    expect(out.verdict.label).toBe("VARIANCE");
  });
});
