import { describe, it, expect } from "vitest";
import { buildTrend, dayLabel, ptDayKey, shiftKey } from "./signup-trend";

describe("ptDayKey", () => {
  it("resolves an instant to its Pacific calendar day, not the server's", () => {
    // 02:00 UTC on the 24th is still the evening of the 23rd in Pacific.
    expect(ptDayKey(new Date("2026-09-24T02:00:00Z"))).toBe("2026-09-23");
    expect(ptDayKey(new Date("2026-09-24T18:00:00Z"))).toBe("2026-09-24");
  });
});

describe("shiftKey", () => {
  it("walks calendar days", () => {
    expect(shiftKey("2026-09-24", -1)).toBe("2026-09-23");
    expect(shiftKey("2026-09-24", 1)).toBe("2026-09-25");
  });

  it("crosses month and year boundaries", () => {
    expect(shiftKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftKey("2028-03-01", -1)).toBe("2028-02-29"); // leap year
  });

  it("steps one day across both Pacific DST transitions", () => {
    // Fall back (2026-11-01) and spring forward (2026-03-08). A 24-hour step
    // would double or skip a date here; calendar arithmetic cannot.
    expect(shiftKey("2026-11-01", 1)).toBe("2026-11-02");
    expect(shiftKey("2026-10-31", 1)).toBe("2026-11-01");
    expect(shiftKey("2026-03-08", 1)).toBe("2026-03-09");
    expect(shiftKey("2026-03-07", 1)).toBe("2026-03-08");
  });
});

describe("buildTrend", () => {
  it("returns consecutive days ending on today", () => {
    const days = buildTrend([], "2026-09-24", 5);
    expect(days.map((d) => d.date)).toEqual([
      "2026-09-20",
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
    ]);
  });

  it("counts signups on the Pacific day they landed on", () => {
    const days = buildTrend(
      [
        "2026-09-24T02:00:00Z", // 7pm PT on the 23rd
        "2026-09-24T18:00:00Z", // 11am PT on the 24th
        "2026-09-24T20:00:00Z",
      ],
      "2026-09-24",
      3,
    );
    expect(days).toEqual([
      { date: "2026-09-22", count: 0 },
      { date: "2026-09-23", count: 1 },
      { date: "2026-09-24", count: 2 },
    ]);
  });

  /* The bug Codex caught on #150: the window was built by advancing a Date by
     24 hours and then reading each instant in Pacific, so a render during the
     affected UTC hour produced the same Pacific date twice and dropped the
     next one. That is a duplicate React key and a wrong seven-day slice. */
  it("never repeats or skips a day across a DST transition", () => {
    for (const today of ["2026-11-01", "2026-11-02", "2026-03-08", "2026-03-09"]) {
      const days = buildTrend([], today, 21);
      const keys = days.map((d) => d.date);
      expect(new Set(keys).size).toBe(21);
      expect(keys[keys.length - 1]).toBe(today);
      for (let i = 1; i < keys.length; i++) {
        expect(shiftKey(keys[i - 1], 1)).toBe(keys[i]);
      }
    }
  });

  it("holds for every day of a year", () => {
    let key = "2026-01-01";
    for (let i = 0; i < 365; i++) {
      const keys = buildTrend([], key, 21).map((d) => d.date);
      expect(new Set(keys).size).toBe(21);
      expect(keys[keys.length - 1]).toBe(key);
      key = shiftKey(key, 1);
    }
  });
});

describe("dayLabel", () => {
  it("formats an instant in Pacific", () => {
    expect(dayLabel("2026-09-24T02:00:00Z")).toBe("Sep 23");
    expect(dayLabel("2026-09-24T18:00:00Z")).toBe("Sep 24");
  });

  it("formats a date-only column as the day it already names", () => {
    // Parsing this as an instant would read midnight UTC and say Sep 22.
    expect(dayLabel("2026-09-23")).toBe("Sep 23");
  });

  it("returns null for nothing and for garbage", () => {
    expect(dayLabel(null)).toBeNull();
    expect(dayLabel("not a date")).toBeNull();
  });
});
