import { describe, it, expect } from "vitest";
import {
  buildEdgeDepth,
  buildHeadlineStrip,
  fmtU,
  HONESTY_FLAG_CENTS,
  LEAD_WARN_MINUTES,
  TREND_MIN_N,
} from "@/lib/edgeDepth";
import type { EdgeRow } from "@/lib/edges";

const base: EdgeRow = {
  market: "Game Total",
  n_decided: 40,
  roi_pct: -11.3,
  xroi_pct: -11.2,
  clv_beat_pct: 48,
  clv_avg_cents: 4,
  clv_n: 20,
  tracked_days: 60,
  gate_pass: false,
  gate_reasons: [],
  originator: false,
  tail_at_close_roi: null,
  pnl_units: -2.4,
  x_actual_pnl_units: -2.4,
  x_pnl_units: -0.6,
  roi_30d: -8.0,
  xroi_30d: -8.1,
  n_30d: 12,
  x_n_30d: 12,
  median_lead_minutes: 18,
};

describe("fmtU", () => {
  it("signs and suffixes units", () => {
    expect(fmtU(1.53)).toBe("+1.5u");
    expect(fmtU(-0.18)).toBe("-0.2u");
    expect(fmtU(0)).toBe("+0.0u");
  });
});

describe("buildEdgeDepth", () => {
  it("phrases the luck split as ran cold when actual < expected", () => {
    const d = buildEdgeDepth(base);
    expect(d.luck.text).toContain("-2.4u");
    expect(d.luck.text).toContain("-0.6u expected");
    expect(d.luck.text).toContain("ran cold by 1.8u");
    expect(d.luck.tone).toBe("muted");
  });

  it("says de-luck unavailable when unit columns are missing", () => {
    const d = buildEdgeDepth({ ...base, x_actual_pnl_units: null, x_pnl_units: null });
    expect(d.luck.text).toBe("De-luck unavailable for this market.");
  });

  it("reads the 30d trend vs season with enough sample", () => {
    const d = buildEdgeDepth(base);
    expect(d.trend.text).toContain("Last 30d xROI -8.1%");
    expect(d.trend.text).toContain("vs season -11.2%");
    expect(d.trend.tone).toBe("pos"); // improving by more than TREND_FLAT_TOL
  });

  it("labels a thin 30d sample instead of trending it", () => {
    const d = buildEdgeDepth({ ...base, x_n_30d: TREND_MIN_N - 1, n_30d: TREND_MIN_N - 1 });
    expect(d.trend.text).toContain("too thin to read");
    expect(d.trend.tone).toBe("muted");
  });

  it("summarizes price honesty from clv columns", () => {
    const d = buildEdgeDepth(base);
    expect(d.honesty.text).toContain("beats the close 48%");
    expect(d.honesty.text).toContain("+4c");
    expect(d.honesty.tone).toBe("muted");
  });

  it("says no priced picks when clv_n is 0", () => {
    const d = buildEdgeDepth({ ...base, clv_n: 0, clv_beat_pct: null, clv_avg_cents: null });
    expect(d.honesty.text).toBe("No priced picks in this market.");
  });

  it("shows the median lead and warns when it is short", () => {
    const d = buildEdgeDepth(base);
    expect(d.lead.text).toContain("18 min before first pitch");
    expect(d.lead.tone).toBe("muted");
    const short = buildEdgeDepth({ ...base, median_lead_minutes: LEAD_WARN_MINUTES - 3 });
    expect(short.lead.tone).toBe("warn");
  });
});

describe("buildHeadlineStrip", () => {
  const ml: EdgeRow = {
    ...base,
    market: "ML",
    n_decided: 60,
    pnl_units: 9.0,
    x_actual_pnl_units: 9.0,
    x_pnl_units: 3.0,
    clv_avg_cents: 20,
    clv_n: 60,
    median_lead_minutes: 50,
  };

  it("sums the luck split across rows", () => {
    const s = buildHeadlineStrip([base, ml]);
    expect(s.luck).not.toBeNull();
    expect(s.luck!.net).toBeCloseTo(6.6, 5);
    expect(s.luck!.expected).toBeCloseTo(2.4, 5);
    expect(s.luck!.delta).toBeCloseTo(4.2, 5);
  });

  it("weights honesty by priced-pick count and flags hard-to-match prices", () => {
    const s = buildHeadlineStrip([base, ml]);
    // (4*20 + 20*60) / 80 = 16c, above HONESTY_FLAG_CENTS
    expect(s.honesty).not.toBeNull();
    expect(s.honesty!.avgCents).toBeCloseTo(16, 5);
    expect(s.honesty!.n).toBe(80);
    expect(s.honesty!.flagged).toBe(true);
    expect(HONESTY_FLAG_CENTS).toBe(15);
  });

  it("weights typical lead by decided picks", () => {
    const s = buildHeadlineStrip([base, ml]);
    // (18*40 + 50*60) / 100 = 37.2
    expect(s.lead).not.toBeNull();
    expect(s.lead!.minutes).toBeCloseTo(37.2, 5);
    expect(s.lead!.warn).toBe(false);
  });

  it("returns null cells when no row carries the data", () => {
    const bare: EdgeRow = { ...base, pnl_units: null, x_actual_pnl_units: null,
      x_pnl_units: null, clv_n: 0, clv_avg_cents: null, median_lead_minutes: null };
    const s = buildHeadlineStrip([bare]);
    expect(s.luck).toBeNull();
    expect(s.honesty).toBeNull();
    expect(s.lead).toBeNull();
  });
});
