import { describe, it, expect } from "vitest";
import {
  sortKey,
  headline,
  rankRows,
  digest,
  isTailable,
  marketsPresent,
  type RankedEdgeRow,
} from "@/lib/marketRankings";

const base: RankedEdgeRow = {
  capper_id: 1,
  handle: "capper_a",
  display_name: "Capper A",
  market: "HRR",
  n_decided: 50,
  roi_pct: 5.0,
  xroi_pct: 6.0,
  clv_beat_pct: null,
  clv_avg_cents: null,
  clv_n: 0,
  tracked_days: 40,
  gate_pass: true,
  gate_reasons: [],
  originator: false,
  tail_at_close_roi: null,
  x_n: 50,
};
const row = (over: Partial<RankedEdgeRow>): RankedEdgeRow => ({ ...base, ...over });

describe("sortKey precedence", () => {
  it("uses xroi when x_n > 0", () => {
    expect(sortKey(row({ xroi_pct: 8.3 }))).toBe(8.3);
  });

  it("originator always uses tail_at_close_roi, even when xroi exists", () => {
    expect(
      sortKey(row({ originator: true, tail_at_close_roi: 7.8, xroi_pct: 99 }))
    ).toBe(7.8);
  });

  it("ML rows (x_n = 0, no xroi) fall back to tail_at_close_roi", () => {
    expect(
      sortKey(row({ market: "ML", x_n: 0, xroi_pct: null, tail_at_close_roi: 4.2 }))
    ).toBe(4.2);
  });

  it("falls back to realized roi last", () => {
    expect(
      sortKey(row({ x_n: 0, xroi_pct: null, tail_at_close_roi: null, roi_pct: 9.1 }))
    ).toBe(9.1);
  });

  it("returns null when no key exists", () => {
    expect(
      sortKey(row({ x_n: 0, xroi_pct: null, tail_at_close_roi: null, roi_pct: null }))
    ).toBeNull();
  });
});

describe("headline", () => {
  it("labels xroi as by closing odds", () => {
    expect(headline(row({ xroi_pct: 8.3 }))).toEqual({
      value: "+8.3%",
      label: "by closing odds",
    });
  });

  it("labels originator as tailing at close", () => {
    expect(
      headline(row({ originator: true, tail_at_close_roi: 7.8, xroi_pct: 99 }))
    ).toEqual({ value: "+7.8%", label: "tailing at close" });
  });

  it("labels the last-resort realized roi as ROI and signs negatives", () => {
    expect(
      headline(row({ x_n: 0, xroi_pct: null, tail_at_close_roi: null, roi_pct: -3.2 }))
    ).toEqual({ value: "-3.2%", label: "ROI" });
  });

  it("returns null when no key exists", () => {
    expect(
      headline(row({ x_n: 0, xroi_pct: null, tail_at_close_roi: null, roi_pct: null }))
    ).toBeNull();
  });
});

describe("rankRows", () => {
  it("sorts desc by key, sinks null keys, and does not mutate the input", () => {
    const a = row({ capper_id: 1, xroi_pct: 2.0 });
    const b = row({ capper_id: 2, xroi_pct: 10.0 });
    const c = row({
      capper_id: 3,
      x_n: 0,
      xroi_pct: null,
      tail_at_close_roi: null,
      roi_pct: null,
    });
    const input = [a, c, b];
    const out = rankRows(input);
    expect(out.map((r) => r.capper_id)).toEqual([2, 1, 3]);
    expect(input.map((r) => r.capper_id)).toEqual([1, 3, 2]);
  });
});

describe("digest membership", () => {
  it("keeps gate passers and originators, drops the rest", () => {
    const pass = row({ capper_id: 1, gate_pass: true, originator: false });
    const orig = row({
      capper_id: 2,
      gate_pass: false,
      originator: true,
      tail_at_close_roi: 7.8,
    });
    const fail = row({ capper_id: 3, gate_pass: false, originator: false });
    expect(isTailable(fail)).toBe(false);
    expect(digest([fail, pass, orig]).map((r) => r.capper_id)).toEqual([2, 1]);
  });
});

describe("marketsPresent", () => {
  it("returns present markets in vocabulary order, unknowns appended", () => {
    const rows = [
      row({ market: "Strikeouts" }),
      row({ market: "ML" }),
      row({ market: "Mystery" }),
      row({ market: "HRR" }),
      row({ market: "ML" }),
    ];
    expect(marketsPresent(rows)).toEqual(["ML", "HRR", "Strikeouts", "Mystery"]);
  });
});
