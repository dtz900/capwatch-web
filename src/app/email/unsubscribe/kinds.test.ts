import { describe, expect, it } from "vitest";
import { unsubKind } from "./kinds";

describe("unsubKind", () => {
  it("defaults to tail alerts", () => {
    expect(unsubKind(undefined)).toEqual({ column: "email_tail_alerts", heading: "Tail alerts", done: "You are unsubscribed from tail alerts." });
    expect(unsubKind("garbage").column).toBe("email_tail_alerts");
  });
  it("maps tof to the deal email column", () => {
    expect(unsubKind("tof")).toEqual({ column: "email_tof_deals", heading: "Deal emails", done: "You are unsubscribed from the daily hand email." });
  });
});

import { unsubPayload } from "./kinds";

describe("unsubPayload", () => {
  it("signs the user id alone for legacy tail-alert links and user:kind otherwise", () => {
    expect(unsubPayload("u1", undefined)).toBe("u1");
    expect(unsubPayload("u1", "tof")).toBe("u1:tof");
  });
});
