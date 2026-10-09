import { describe, expect, it } from "vitest";
import { downsample } from "@/components/leaderboard/Sparkline";

describe("sparkline downsample", () => {
  it("returns short series untouched", () => {
    expect(downsample([1, 2, 3], 42)).toEqual([1, 2, 3]);
  });

  it("caps long series and keeps the first and last point", () => {
    const series = Array.from({ length: 500 }, (_, i) => i * 0.1);
    const out = downsample(series, 42);
    expect(out).toHaveLength(42);
    expect(out[0]).toBe(series[0]);
    expect(out[out.length - 1]).toBe(series[499]);
  });
});
