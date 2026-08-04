import { describe, it, expect } from "vitest";
import { formatUnits, formatUnits2, formatUnitsSmart, formatRoi, formatWinRate, formatStreak, formatHandle, formatPickDate, displayUnits, trimUnits, formatStake, MAX_DECLARED_UNITS } from "@/lib/formatters";

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

describe("displayUnits", () => {
  // ChalkItSpreads posted "Pete Alonso o0.5 Hits +100 6.4u". The display cap
  // must honor that (the grader stores it at 6.4u), not collapse it to 1u.
  it("honors declared stakes up to the grader cap", () => {
    expect(displayUnits(6.4)).toBe(6.4);
    expect(displayUnits(3.2)).toBe(3.2);
    expect(displayUnits(25)).toBe(25);
    expect(displayUnits(MAX_DECLARED_UNITS)).toBe(MAX_DECLARED_UNITS);
  });
  it("clamps implausible stakes to 1u (e.g. a dollar figure misread as units)", () => {
    expect(displayUnits(1000)).toBe(1);
    expect(displayUnits(MAX_DECLARED_UNITS + 0.1)).toBe(1);
  });
  it("defaults missing or non-positive to 1u", () => {
    expect(displayUnits(null)).toBe(1);
    expect(displayUnits(undefined)).toBe(1);
    expect(displayUnits(0)).toBe(1);
    expect(displayUnits(-2)).toBe(1);
  });
});

describe("trimUnits", () => {
  it("keeps quarter-unit stakes exact instead of rounding to 1 decimal", () => {
    expect(trimUnits(1.25)).toBe("1.25");
    expect(trimUnits(2.75)).toBe("2.75");
  });
  it("drops trailing zeros and the decimal point on whole numbers", () => {
    expect(trimUnits(1)).toBe("1");
    expect(trimUnits(1.5)).toBe("1.5");
    expect(trimUnits(0.5)).toBe("0.5");
  });
  it("cleans float artifacts", () => {
    expect(trimUnits(0.1 + 0.2)).toBe("0.3");
  });
});

describe("formatStake", () => {
  it("renders declared stakes exactly", () => {
    expect(formatStake(1.25)).toBe("1.25u");
    expect(formatStake(6.4)).toBe("6.4u");
    expect(formatStake(1)).toBe("1u");
  });
  it("clamps missing or implausible stakes to the 1u baseline", () => {
    expect(formatStake(null)).toBe("1u");
    expect(formatStake(undefined)).toBe("1u");
    expect(formatStake(0)).toBe("1u");
    expect(formatStake(1000)).toBe("1u");
  });
});

describe("formatUnitsSmart", () => {
  it("uses 2 decimals when 1 decimal would round the value", () => {
    expect(formatUnitsSmart(1.25)).toBe("+1.25");
    expect(formatUnitsSmart(-1.25)).toBe("-1.25");
  });
  it("keeps 1 decimal when it is exact", () => {
    expect(formatUnitsSmart(3)).toBe("+3.0");
    expect(formatUnitsSmart(1.3)).toBe("+1.3");
    expect(formatUnitsSmart(-2.5)).toBe("-2.5");
  });
  it("uses 2 decimals below 1 so small values don't render as +0.0", () => {
    expect(formatUnitsSmart(0.91)).toBe("+0.91");
    expect(formatUnitsSmart(-0.05)).toBe("-0.05");
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
