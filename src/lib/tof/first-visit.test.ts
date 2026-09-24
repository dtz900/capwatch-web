import { describe, it, expect } from "vitest";
import { shouldLandOpen, type ArrivalState } from "./first-visit";

const firstTimer: ArrivalState = {
  authReady: true,
  isLoggedIn: false,
  slateDate: "2026-09-23",
  hasSwipedBefore: false,
  guestChoiceCount: 0,
};

describe("shouldLandOpen", () => {
  it("opens for a signed-out browser that has never swiped", () => {
    expect(shouldLandOpen(firstTimer)).toBe(true);
  });

  it("stays folded once that browser has swiped before", () => {
    expect(shouldLandOpen({ ...firstTimer, hasSwipedBefore: true })).toBe(false);
  });

  it("stays folded when guest choices are already stored for this slate", () => {
    expect(shouldLandOpen({ ...firstTimer, guestChoiceCount: 1 })).toBe(false);
  });

  it("stays folded for a signed-in user", () => {
    expect(shouldLandOpen({ ...firstTimer, isLoggedIn: true })).toBe(false);
  });

  it("waits for auth: a signed-in user reads as signed out until getSession lands", () => {
    expect(shouldLandOpen({ ...firstTimer, authReady: false })).toBe(false);
    expect(shouldLandOpen({ ...firstTimer, authReady: false, isLoggedIn: true })).toBe(false);
  });

  it("waits for a hand: there is nothing to open onto yet", () => {
    expect(shouldLandOpen({ ...firstTimer, slateDate: null })).toBe(false);
  });
});
