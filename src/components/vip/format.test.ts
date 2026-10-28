import { describe, expect, it } from "vitest";
import { formatRevealTime } from "./format";

describe("formatRevealTime", () => {
  const now = new Date("2026-10-27T16:00:00Z"); // Tue noon ET

  it("same ET day shows the time only", () => {
    expect(formatRevealTime("2026-10-27T23:05:00Z", now)).toBe("7:05 PM ET");
  });

  it("another ET day leads with the weekday", () => {
    expect(formatRevealTime("2026-10-28T23:05:00Z", now)).toBe("Wed 7:05 PM ET");
    // 01:30Z on the 28th is still Tuesday evening in ET.
    expect(formatRevealTime("2026-10-28T01:30:00Z", now)).toBe("9:30 PM ET");
  });
});
