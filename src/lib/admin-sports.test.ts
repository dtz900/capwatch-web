import { describe, expect, it } from "vitest";
import { ADMIN_SPORTS, parseAdminSport } from "./admin-sports";

describe("parseAdminSport", () => {
  it("upper-cases known sports", () => {
    expect(parseAdminSport("ncaab")).toBe("NCAAB");
    expect(parseAdminSport("MLB")).toBe("MLB");
  });
  it("rejects unknown or non-string input", () => {
    expect(parseAdminSport("xfl")).toBeUndefined();
    expect(parseAdminSport(undefined)).toBeUndefined();
    expect(parseAdminSport(3)).toBeUndefined();
  });
  it("lists the four admin sports", () => {
    expect([...ADMIN_SPORTS]).toEqual(["MLB", "NFL", "NBA", "NCAAB"]);
  });
});
