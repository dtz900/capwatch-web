import { describe, expect, it } from "vitest";
import { activePrize, slateDate, type TofPrize } from "./prize";

const base: TofPrize = { enabled: true, amount: "$25", sponsor_handle: "doctorsportshq", starts: "2026-11-10", ends: null };

// 09:00 PT on each date is 17:00Z (PST).
const pt = (d: string) => new Date(`${d}T17:00:00Z`);

describe("activePrize", () => {
  it("is upcoming before its start date and live from it on", () => {
    expect(activePrize(base, pt("2026-11-05"))).toEqual({ prize: base, live: false });
    expect(activePrize(base, pt("2026-11-10"))).toEqual({ prize: base, live: true });
    expect(activePrize(base, pt("2026-12-20"))?.live).toBe(true); // open ended
  });

  it("goes live at the 6 AM ET slate rollover, not PT midnight", () => {
    // Tue Nov 10, 2026 (EST): 5:59 AM ET = 10:59Z is still Monday's slate.
    expect(slateDate(new Date("2026-11-10T10:59:00Z"))).toBe("2026-11-09");
    expect(slateDate(new Date("2026-11-10T11:00:00Z"))).toBe("2026-11-10");
    expect(activePrize(base, new Date("2026-11-10T09:00:00Z"))?.live).toBe(false); // 1 AM PT Tuesday
  });

  it("stops after its end date", () => {
    const ended = { ...base, ends: "2026-11-30" };
    expect(activePrize(ended, pt("2026-11-30"))?.live).toBe(true);
    expect(activePrize(ended, pt("2026-12-01"))).toBeNull();
  });

  it("shows nothing when off or malformed", () => {
    expect(activePrize({ ...base, enabled: false }, pt("2026-11-12"))).toBeNull();
    expect(activePrize({ ...base, sponsor_handle: "evil<script>" }, pt("2026-11-12"))).toBeNull();
    expect(activePrize({ ...base, sponsor_handle: "@doctorsportshq" }, pt("2026-11-12"))).toBeNull();
    expect(activePrize({ ...base, amount: "" }, pt("2026-11-12"))).toBeNull();
    expect(activePrize({ ...base, starts: "" }, pt("2026-11-12"))).toBeNull();
    expect(activePrize(null, pt("2026-11-12"))).toBeNull();
  });
});
