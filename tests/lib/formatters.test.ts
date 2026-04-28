import { describe, it, expect } from "vitest";
import { formatUnits, formatRoi, formatWinRate, formatStreak, formatHandle } from "@/lib/formatters";

describe("formatUnits", () => {
  it("formats positive with + and one decimal", () => {
    expect(formatUnits(12.4)).toBe("+12.4");
  });
  it("formats negative with minus and one decimal", () => {
    expect(formatUnits(-3.2)).toBe("-3.2");
  });
  it("formats zero as +0.0", () => {
    expect(formatUnits(0)).toBe("+0.0");
  });
});

describe("formatRoi", () => {
  it("appends % and one decimal", () => {
    expect(formatRoi(14.2)).toBe("+14.2%");
    expect(formatRoi(-6.7)).toBe("-6.7%");
  });
});

describe("formatWinRate", () => {
  it("renders 0..1 as integer percent", () => {
    expect(formatWinRate(0.547)).toBe("55%");
    expect(formatWinRate(0)).toBe("0%");
    expect(formatWinRate(1)).toBe("100%");
  });
});

describe("formatStreak", () => {
  it("returns W{n} for positive", () => {
    expect(formatStreak(3)).toBe("W3");
  });
  it("returns L{n} for negative", () => {
    expect(formatStreak(-2)).toBe("L2");
  });
  it("returns dash for zero", () => {
    expect(formatStreak(0)).toBe("\u2014");
  });
});

describe("formatHandle", () => {
  it("prepends @ if missing", () => {
    expect(formatHandle("fadeai_")).toBe("@fadeai_");
    expect(formatHandle("@fadeai_")).toBe("@fadeai_");
  });
});
