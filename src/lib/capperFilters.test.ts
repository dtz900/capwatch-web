import { describe, it, expect } from "vitest";
import { formatRangeLabel, rangeScopeLabel } from "./capperFilters";

describe("formatRangeLabel", () => {
  it("same month collapses the second month name", () => {
    expect(formatRangeLabel("2026-06-08", "2026-06-14")).toBe("Jun 8 - 14");
  });
  it("cross-month keeps both month names", () => {
    expect(formatRangeLabel("2026-05-28", "2026-06-03")).toBe("May 28 - Jun 3");
  });
  it("single day shows one date", () => {
    expect(formatRangeLabel("2026-06-08", "2026-06-08")).toBe("Jun 8");
  });
  it("never emits an em dash or double hyphen", () => {
    const out = formatRangeLabel("2026-05-28", "2026-06-03");
    expect(out).not.toMatch(/—|--/);
  });
});

describe("rangeScopeLabel", () => {
  it("appends bet type when not all", () => {
    expect(rangeScopeLabel("2026-06-08", "2026-06-14", "straights")).toBe("Jun 8 - 14 · Straights");
  });
  it("range only when bet type all", () => {
    expect(rangeScopeLabel("2026-06-08", "2026-06-14", "all")).toBe("Jun 8 - 14");
  });
});
