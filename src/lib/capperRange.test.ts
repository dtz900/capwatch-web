import { describe, it, expect } from "vitest";
import { ymd, addDays, monthMatrix, shortcutRange } from "@/components/capper/DateRangePicker";

describe("date utils", () => {
  it("ymd formats a Date to YYYY-MM-DD in UTC", () => {
    expect(ymd(new Date(Date.UTC(2026, 5, 8)))).toBe("2026-06-08");
  });
  it("addDays crosses month boundaries", () => {
    expect(addDays("2026-05-30", 4)).toBe("2026-06-03");
  });
  it("monthMatrix returns 6 weeks of 7 days", () => {
    const m = monthMatrix(2026, 6); // June 2026
    expect(m.length).toBe(6);
    expect(m[0].length).toBe(7);
  });
  it("shortcutRange('last_week') returns a Mon-Sun pair before today", () => {
    const { start, end } = shortcutRange("last_week", "2026-06-16"); // Tue
    expect(start).toBe("2026-06-08"); // prior Monday
    expect(end).toBe("2026-06-14");   // prior Sunday
  });
});
