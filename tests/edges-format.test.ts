import { describe, expect, it } from "vitest";
import { formatEdgeRow } from "@/lib/edges";

describe("formatEdgeRow", () => {
  it("formats a passing soft-market row", () => {
    const out = formatEdgeRow({
      market: "Team Total", n_decided: 60, roi_pct: 8.1, xroi_pct: 5.3,
      clv_beat_pct: null, clv_avg_cents: null, clv_n: 0,
      tracked_days: 55, gate_pass: true, gate_reasons: [],
    });
    expect(out.label).toBe("Team Total");
    expect(out.roi).toBe("+8.1%");
    expect(out.xroi).toBe("+5.3%");
    expect(out.trust).toContain("60 picks");
  });

  it("marks a CLV-negative ML row", () => {
    const out = formatEdgeRow({
      market: "ML", n_decided: 80, roi_pct: 12.0, xroi_pct: null,
      clv_beat_pct: 30, clv_avg_cents: -12, clv_n: 50,
      tracked_days: 90, gate_pass: false,
      gate_reasons: ["CLV negative: record looks like variance, not edge"],
    });
    expect(out.clv).toBe("beat close 30%");
    expect(out.roi).toBe("+12.0%");
  });
});
