import { describe, expect, it } from "vitest";
import { downsample } from "@/components/leaderboard/Sparkline";

describe("sparkline downsample", () => {
  it("returns short series untouched", () => {
    expect(downsample([1, 2, 3], 42)).toEqual([1, 2, 3]);
  });

  it("caps long series and keeps the first and last point", () => {
    const series = Array.from({ length: 500 }, (_, i) => i * 0.1);
    const out = downsample(series, 42);
    expect(out.length).toBeLessThanOrEqual(42);
    expect(out[0]).toBe(series[0]);
    expect(out[out.length - 1]).toBe(series[499]);
  });

  it("keeps a one-point drawdown and spike that even sampling would drop", () => {
    const series = Array.from({ length: 500 }, (_, i) => i * 0.1);
    series[137] = -40; // brief drawdown
    series[311] = 90; // brief spike
    const out = downsample(series, 42);
    expect(Math.min(...out)).toBe(-40);
    expect(Math.max(...out)).toBe(90);
    // Time order survives: the drawdown comes before the spike.
    expect(out.indexOf(-40)).toBeLessThan(out.indexOf(90));
  });
});
