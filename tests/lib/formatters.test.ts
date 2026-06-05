import { describe, it, expect } from "vitest";
import { formatUnits, formatUnits2, formatRoi, formatWinRate, formatStreak, formatHandle, formatPickDate } from "@/lib/formatters";

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

describe("formatUnits2", () => {
  it("formats with 2 decimals and explicit sign", () => {
    expect(formatUnits2(25.98)).toBe("+25.98");
    expect(formatUnits2(-1.5)).toBe("-1.50");
    expect(formatUnits2(0)).toBe("+0.00");
  });
});

describe("formatPickDate", () => {
  // pid 22560: D-backs F5 ML, an Arizona night game on Jun 4. The tweet was
  // posted at 5:56pm MST, which is 2026-06-05T00:56Z, so posted_at's UTC
  // calendar day is Jun 5. game_date carries the real ET play date (Jun 4).
  it("prefers game_date over posted_at so a late-night tweet shows the play date", () => {
    expect(formatPickDate("2026-06-04", "2026-06-05T00:56:05Z")).toBe("Jun 4, 2026");
  });

  it("anchors game_date at noon UTC so it never shifts a day on a UTC server", () => {
    expect(formatPickDate("2026-06-04", null)).toBe("Jun 4, 2026");
  });

  it("falls back to posted_at in ET (not server UTC) when no game is linked", () => {
    // 2026-06-05T00:56Z is 8:56pm ET on Jun 4.
    expect(formatPickDate(null, "2026-06-05T00:56:05Z")).toBe("Jun 4, 2026");
  });

  it("returns empty string when both are missing", () => {
    expect(formatPickDate(null, null)).toBe("");
    expect(formatPickDate(undefined, undefined)).toBe("");
  });
});
