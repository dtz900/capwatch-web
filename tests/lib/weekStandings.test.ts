import { describe, it, expect } from "vitest";
import {
  currentSlateDay,
  weekBoundsFor,
  weekDaysToFetch,
  sumWeekStandings,
} from "@/lib/week-standings";
import type { DaySummary, SlateCapperSummary } from "@/lib/types";

function ds(partial: Partial<DaySummary> = {}): DaySummary {
  return {
    graded_count: 0, pending_count: 0, wins: 0, losses: 0,
    pushes: 0, voids: 0, net_units: 0, ...partial,
  };
}

function capper(partial: Partial<SlateCapperSummary> & { capper_id: number }): SlateCapperSummary {
  return {
    handle: null, display_name: null, profile_image_url: null,
    capper_rank: null, wins: 0, losses: 0, pushes: 0, voids: 0,
    graded_count: 0, pending_count: 0, net_units: 0,
    current_day_streak: null, ...partial,
  };
}

describe("currentSlateDay", () => {
  it("uses the ET calendar date during the evening", () => {
    // 2026-08-05 21:00 ET == 2026-08-06 01:00 UTC
    expect(currentSlateDay(new Date("2026-08-06T01:00:00Z"))).toBe("2026-08-05");
  });
  it("rolls a post-midnight ET hour back to the previous slate day", () => {
    // 2026-08-06 02:00 ET == 2026-08-06 06:00 UTC -> still Aug 5's slate
    expect(currentSlateDay(new Date("2026-08-06T06:00:00Z"))).toBe("2026-08-05");
  });
  it("flips to the new slate day at 6am ET", () => {
    // 2026-08-06 06:00 ET == 2026-08-06 10:00 UTC
    expect(currentSlateDay(new Date("2026-08-06T10:00:00Z"))).toBe("2026-08-06");
  });
});

describe("weekBoundsFor", () => {
  it("finds Mon-Sun for a midweek date", () => {
    // 2026-08-06 is a Thursday
    expect(weekBoundsFor("2026-08-06")).toEqual({ monday: "2026-08-03", sunday: "2026-08-09" });
  });
  it("keeps a Monday as its own week start", () => {
    expect(weekBoundsFor("2026-08-03")).toEqual({ monday: "2026-08-03", sunday: "2026-08-09" });
  });
  it("keeps a Sunday in the week that started the prior Monday", () => {
    expect(weekBoundsFor("2026-08-09")).toEqual({ monday: "2026-08-03", sunday: "2026-08-09" });
  });
});

describe("weekDaysToFetch", () => {
  it("returns Monday through today for the current week", () => {
    expect(weekDaysToFetch("2026-08-06", "2026-08-06")).toEqual([
      "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06",
    ]);
  });
  it("caps at Sunday for a fully past week", () => {
    expect(weekDaysToFetch("2026-07-29", "2026-08-06")).toHaveLength(7);
    expect(weekDaysToFetch("2026-07-29", "2026-08-06")[6]).toBe("2026-08-02");
  });
  it("is empty when the week has not started yet", () => {
    // viewing next Monday's slate from Sunday night
    expect(weekDaysToFetch("2026-08-10", "2026-08-09")).toEqual([]);
  });
  it("includes tomorrow's viewed day only up to today", () => {
    // viewing tomorrow (Friday) while today is Thursday: week days stop at today
    expect(weekDaysToFetch("2026-08-07", "2026-08-06")).toEqual([
      "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06",
    ]);
  });
});

describe("sumWeekStandings", () => {
  const bounds = { monday: "2026-08-03", sunday: "2026-08-09" };

  it("sums day summaries and capper rows across days", () => {
    const out = sumWeekStandings(
      [
        {
          date: "2026-08-03",
          day_summary: ds({ graded_count: 3, wins: 2, losses: 1, net_units: 1.5 }),
          capper_summary: [
            capper({ capper_id: 1, handle: "a", wins: 2, losses: 1, graded_count: 3, net_units: 1.5, capper_rank: 4 }),
          ],
        },
        {
          date: "2026-08-04",
          day_summary: ds({ graded_count: 2, wins: 0, losses: 2, net_units: -2, pending_count: 1 }),
          capper_summary: [
            capper({ capper_id: 1, handle: "a", wins: 0, losses: 2, graded_count: 2, net_units: -2, pending_count: 1, capper_rank: 5 }),
            capper({ capper_id: 2, handle: "b", wins: 0, losses: 0, pending_count: 1 }),
          ],
        },
      ],
      bounds,
    );
    expect(out.week_start).toBe("2026-08-03");
    expect(out.week_end).toBe("2026-08-09");
    expect(out.days_counted).toEqual(["2026-08-03", "2026-08-04"]);
    expect(out.summary.graded_count).toBe(5);
    expect(out.summary.net_units).toBe(-0.5);
    expect(out.summary.pending_count).toBe(1);
    const a = out.capper_summary.find((c) => c.capper_id === 1)!;
    expect(a.wins).toBe(2);
    expect(a.losses).toBe(3);
    expect(a.graded_count).toBe(5);
    expect(a.net_units).toBe(-0.5);
    // meta comes from the most recent day the capper appeared
    expect(a.capper_rank).toBe(5);
  });

  it("sorts by net units desc, then graded count desc, then rank asc", () => {
    const out = sumWeekStandings(
      [
        {
          date: "2026-08-03",
          day_summary: ds({ graded_count: 6 }),
          capper_summary: [
            capper({ capper_id: 1, net_units: 1, graded_count: 2, capper_rank: 9 }),
            capper({ capper_id: 2, net_units: 3, graded_count: 1 }),
            capper({ capper_id: 3, net_units: 1, graded_count: 3, capper_rank: 50 }),
          ],
        },
      ],
      bounds,
    );
    expect(out.capper_summary.map((c) => c.capper_id)).toEqual([2, 3, 1]);
  });

  it("rounds accumulated float drift to 2 decimals", () => {
    const days = [0.1, 0.2, 0.3].map((u, i) => ({
      date: `2026-08-0${3 + i}`,
      day_summary: ds({ graded_count: 1, wins: 1, net_units: u }),
      capper_summary: [capper({ capper_id: 1, wins: 1, graded_count: 1, net_units: u })],
    }));
    const out = sumWeekStandings(days, bounds);
    expect(out.summary.net_units).toBe(0.6);
    expect(out.capper_summary[0].net_units).toBe(0.6);
  });
});
