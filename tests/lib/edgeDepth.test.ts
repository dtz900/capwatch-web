import { describe, it, expect } from "vitest";
import {
  buildEdgeCells,
  buildHeadlineStrip,
  fmtLead,
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
  x_n: 40,
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

describe("fmtLead", () => {
  it("uses minutes under two hours and hours above", () => {
    expect(fmtLead(18)).toBe("18 min");
    expect(fmtLead(119)).toBe("119 min");
    expect(fmtLead(627)).toBe("~10h");
  });
});

describe("buildEdgeCells", () => {
  it("phrases the luck cell as ran cold when actual < expected", () => {
    const c = buildEdgeCells(base);
    expect(c.luck.value).toBe("ran cold by 1.8u");
    expect(c.luck.sub).toBe("-2.4u actual vs -0.6u expected");
    expect(c.luck.tone).toBe("muted");
  });

  it("marks a hot run with the warn tone", () => {
    const c = buildEdgeCells({ ...base, x_actual_pnl_units: 5.0, x_pnl_units: 1.0 });
    expect(c.luck.value).toBe("ran hot by 4.0u");
    expect(c.luck.tone).toBe("warn");
  });

  it("says de-luck unavailable when unit columns are missing", () => {
    const c = buildEdgeCells({ ...base, x_actual_pnl_units: null, x_pnl_units: null });
    expect(c.luck.value).toBe("n/a");
    expect(c.luck.sub).toBe("de-luck unavailable");
  });

  it("reads the 30d trend vs season with enough sample", () => {
    const c = buildEdgeCells(base);
    expect(c.trend.value).toBe("-8.1% last 30d");
    expect(c.trend.sub).toContain("season -11.2% by close, improving");
    expect(c.trend.tone).toBe("pos"); // improving by more than TREND_FLAT_TOL
  });

  it("labels a thin 30d sample instead of trending it", () => {
    const c = buildEdgeCells({ ...base, x_n_30d: TREND_MIN_N - 1, n_30d: TREND_MIN_N - 1 });
    expect(c.trend.value).toBe("too thin");
    expect(c.trend.sub).toContain("only 9 picks in 30d");
    expect(c.trend.tone).toBe("muted");
  });

  it("summarizes the close cell from clv columns", () => {
    const c = buildEdgeCells(base);
    expect(c.close.value).toBe("+4c vs close");
    expect(c.close.sub).toBe("beats the close 48% of 20");
    expect(c.close.tone).toBe("muted");
  });

  it("flags hard-to-match prices past the honesty threshold", () => {
    const c = buildEdgeCells({ ...base, clv_avg_cents: HONESTY_FLAG_CENTS + 5 });
    expect(c.close.sub).toBe("hard to match at post time");
    expect(c.close.tone).toBe("warn");
  });

  it("says no priced picks when clv_n is 0", () => {
    const c = buildEdgeCells({ ...base, clv_n: 0, clv_beat_pct: null, clv_avg_cents: null });
    expect(c.close.value).toBe("n/a");
    expect(c.close.sub).toBe("no priced picks");
  });

  it("shows the lead time and warns when it is short", () => {
    const c = buildEdgeCells(base);
    expect(c.timing.value).toBe("18 min pre-pitch");
    expect(c.timing.tone).toBe("muted");
    const short = buildEdgeCells({ ...base, median_lead_minutes: LEAD_WARN_MINUTES - 3 });
    expect(short.timing.tone).toBe("warn");
    expect(short.timing.sub).toBe("posts near first pitch");
  });
});

describe("buildHeadlineStrip", () => {
  const prop: EdgeRow = {
    ...base,
    market: "Strikeouts",
    n_decided: 60,
    pnl_units: 9.0,
    x_actual_pnl_units: 9.0,
    x_pnl_units: 3.0,
    x_n: 60,
    clv_avg_cents: 20,
    clv_n: 60,
    median_lead_minutes: 50,
  };

  it("sums the luck split and straight count across rows", () => {
    const s = buildHeadlineStrip([base, prop]);
    expect(s.luck).not.toBeNull();
    expect(s.luck!.net).toBeCloseTo(6.6, 5);
    expect(s.luck!.expected).toBeCloseTo(2.4, 5);
    expect(s.luck!.delta).toBeCloseTo(4.2, 5);
    expect(s.luck!.n).toBe(100);
  });

  it("weights honesty by priced-pick count and flags hard-to-match prices", () => {
    const s = buildHeadlineStrip([base, prop]);
    // (4*20 + 20*60) / 80 = 16c, above HONESTY_FLAG_CENTS
    expect(s.honesty).not.toBeNull();
    expect(s.honesty!.avgCents).toBeCloseTo(16, 5);
    expect(s.honesty!.n).toBe(80);
    expect(s.honesty!.flagged).toBe(true);
    expect(HONESTY_FLAG_CENTS).toBe(15);
  });

  it("weights typical lead by decided picks", () => {
    const s = buildHeadlineStrip([base, prop]);
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
