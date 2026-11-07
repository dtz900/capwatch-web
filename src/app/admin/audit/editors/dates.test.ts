import { describe, expect, it } from "vitest";
import { dateLabel, postedYmd, shiftYmd } from "./dates";

describe("dates", () => {
  it("shifts across month ends", () => {
    expect(shiftYmd("2026-10-31", 1)).toBe("2026-11-01");
    expect(shiftYmd("2026-11-01", -1)).toBe("2026-10-31");
  });
  it("labels a plain date", () => {
    expect(dateLabel("2026-11-06")).toBe("Fri, Nov 6");
  });
  it("converts posted time to a Pacific date", () => {
    expect(postedYmd("2026-11-07T03:30:00Z")).toBe("2026-11-06");
    expect(postedYmd(null)).toBeNull();
  });
});
