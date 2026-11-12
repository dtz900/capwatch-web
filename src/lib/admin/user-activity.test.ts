import { describe, it, expect } from "vitest";
import { activityRank, parsePosthogQuery, relativeLabel } from "./user-activity";

// Noon Pacific on 2026-11-11 (PST, UTC-8).
const NOW = new Date("2026-11-11T20:00:00Z");

describe("relativeLabel", () => {
  it("says never for null", () => {
    expect(relativeLabel(null, NOW)).toBe("never");
  });
  it("says today for the same Pacific day", () => {
    expect(relativeLabel("2026-11-11T09:00:00Z", NOW)).toBe("today");
  });
  it("says yesterday across the Pacific midnight boundary", () => {
    // 07:30 UTC on the 11th is 23:30 PT on the 10th.
    expect(relativeLabel("2026-11-11T07:30:00Z", NOW)).toBe("yesterday");
  });
  it("counts days up to 13", () => {
    expect(relativeLabel("2026-11-06T20:00:00Z", NOW)).toBe("5d ago");
  });
  it("counts weeks", () => {
    expect(relativeLabel("2026-10-21T20:00:00Z", NOW)).toBe("3w ago");
  });
  it("falls back to a date for older values", () => {
    expect(relativeLabel("2026-09-03T20:00:00Z", NOW)).toBe("Sep 3");
  });
});

describe("activityRank", () => {
  const base = { activeDays30: 1, lastSeenAt: "2026-11-01T00:00:00Z", createdAt: "2026-01-01T00:00:00Z" };
  it("ranks active days over last seen", () => {
    const a = { ...base, activeDays30: 5, lastSeenAt: "2026-10-01T00:00:00Z" };
    const b = { ...base, activeDays30: 2, lastSeenAt: "2026-11-10T00:00:00Z" };
    expect([b, a].sort(activityRank)[0]).toBe(a);
  });
  it("puts nulls last", () => {
    const a = { ...base, activeDays30: null };
    const b = { ...base, activeDays30: 0 };
    expect([a, b].sort(activityRank)[0]).toBe(b);
    const c = { ...base, lastSeenAt: null };
    expect([c, base].sort(activityRank)[0]).toBe(base);
  });
  it("falls through to last seen then created", () => {
    const a = { ...base, lastSeenAt: "2026-11-05T00:00:00Z" };
    const b = { ...base, lastSeenAt: "2026-11-02T00:00:00Z" };
    expect([b, a].sort(activityRank)[0]).toBe(a);
    const c = { ...base, createdAt: "2026-05-01T00:00:00Z" };
    expect([base, c].sort(activityRank)[0]).toBe(c);
  });
});

describe("parsePosthogQuery", () => {
  it("maps columns to rows by name", () => {
    const m = parsePosthogQuery({
      columns: ["distinct_id", "active_days", "pageviews", "last_event"],
      results: [["u1", 4, 30, "2026-11-10T00:00:00Z"]],
    });
    expect(m.get("u1")).toEqual({ activeDays: 4, pageviews: 30, lastEventAt: "2026-11-10T00:00:00Z" });
  });
  it("ignores rows without a distinct_id", () => {
    const m = parsePosthogQuery({
      columns: ["distinct_id", "active_days", "pageviews", "last_event"],
      results: [[null, 1, 1, null], ["u2", 1, 2, null]],
    });
    expect([...m.keys()]).toEqual(["u2"]);
  });
  it("returns an empty map for empty or malformed bodies", () => {
    expect(parsePosthogQuery({ columns: ["distinct_id"], results: [] }).size).toBe(0);
    expect(parsePosthogQuery(null).size).toBe(0);
  });
});
