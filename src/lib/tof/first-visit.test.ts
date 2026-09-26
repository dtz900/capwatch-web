import { describe, it, expect } from "vitest";
import { shouldLandOpen, type ArrivalState } from "./first-visit";

const guest: ArrivalState = {
  authReady: true,
  isLoggedIn: false,
  slateDate: "2026-09-26",
  handStatus: "open",
  guestChoiceCount: 0,
  playsOnThisHand: 0,
};

const member: ArrivalState = { ...guest, isLoggedIn: true };

describe("shouldLandOpen", () => {
  it("opens for a signed-out browser with no choices on this hand", () => {
    expect(shouldLandOpen(guest)).toBe("open");
  });

  it("opens again on a later day: a new deck this browser has not swiped", () => {
    // The old policy folded any browser that had ever swiped; the rule is
    // now per hand, so yesterday's swipes do not fold today's deck.
    expect(shouldLandOpen({ ...guest, slateDate: "2026-09-27" })).toBe("open");
  });

  it("folds once guest choices exist for this hand", () => {
    expect(shouldLandOpen({ ...guest, guestChoiceCount: 1 })).toBe("fold");
  });

  it("opens for a signed-in user with no plays on this hand", () => {
    expect(shouldLandOpen(member)).toBe("open");
  });

  it("folds for a signed-in user who has already played this hand", () => {
    expect(shouldLandOpen({ ...member, playsOnThisHand: 1 })).toBe("fold");
  });

  it("waits for a signed-in user's plays to load before deciding", () => {
    expect(shouldLandOpen({ ...member, playsOnThisHand: null })).toBe("wait");
  });

  it("waits for a guest's stored stash to hydrate before deciding", () => {
    // The component passes null until the stash is in state; deciding from
    // an empty map would reopen a deck the guest already swiped (Codex on #157).
    expect(shouldLandOpen({ ...guest, playsOnThisHand: null })).toBe("wait");
    expect(shouldLandOpen({ ...guest, playsOnThisHand: null, guestChoiceCount: 3 })).toBe("wait");
  });

  it("folds when the hand is no longer open: nothing left to swipe", () => {
    expect(shouldLandOpen({ ...guest, handStatus: "locked" })).toBe("fold");
    expect(shouldLandOpen({ ...member, handStatus: "graded" })).toBe("fold");
  });

  it("waits for auth: a signed-in user reads as signed out until getSession lands", () => {
    expect(shouldLandOpen({ ...guest, authReady: false })).toBe("wait");
    expect(shouldLandOpen({ ...member, authReady: false })).toBe("wait");
  });

  it("waits for a hand: there is nothing to open onto yet", () => {
    expect(shouldLandOpen({ ...guest, slateDate: null, handStatus: null })).toBe("wait");
  });
});
