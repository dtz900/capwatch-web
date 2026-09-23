import { describe, it, expect } from "vitest";
import { parseGuestSwipe } from "./guest-swipe";

const ANON = "5f1c2f6e-9a4b-4c2d-8e11-0d9f3b7a6c21";
const shared = { anon_id: ANON, hand_id: 2, card_id: 7, choice: "tail" };

describe("parseGuestSwipe", () => {
  it("accepts a shared-card swipe", () => {
    expect(parseGuestSwipe(shared)).toEqual({ anon_id: ANON, hand_id: 2, card_id: 7, choice: "tail" });
  });

  it("accepts a pass", () => {
    expect(parseGuestSwipe({ ...shared, choice: "pass" })).not.toBeNull();
  });

  it("rejects a swipe with no card: a guest has no stable card to play", () => {
    expect(parseGuestSwipe({ ...shared, card_id: null })).toBeNull();
    expect(parseGuestSwipe({ anon_id: ANON, hand_id: 2, stable_pick_id: 991, choice: "tail" })).toBeNull();
  });

  it("rejects a bad browser id", () => {
    expect(parseGuestSwipe({ ...shared, anon_id: "not-a-uuid" })).toBeNull();
    expect(parseGuestSwipe({ ...shared, anon_id: 12 })).toBeNull();
    expect(parseGuestSwipe({ ...shared, anon_id: undefined })).toBeNull();
  });

  it("rejects ids that are not positive safe integers", () => {
    for (const bad of [0, -3, 1.5, "7", Number.MAX_SAFE_INTEGER + 2, null]) {
      expect(parseGuestSwipe({ ...shared, card_id: bad })).toBeNull();
    }
    expect(parseGuestSwipe({ ...shared, hand_id: 0 })).toBeNull();
  });

  it("rejects an unknown choice", () => {
    expect(parseGuestSwipe({ ...shared, choice: "tail " })).toBeNull();
    expect(parseGuestSwipe({ ...shared, choice: "TAIL" })).toBeNull();
    expect(parseGuestSwipe({ ...shared, choice: null })).toBeNull();
  });

  it("rejects non-objects", () => {
    for (const bad of [null, undefined, "x", 4, []]) {
      // An array has no anon_id, which is the first thing checked.
      expect(parseGuestSwipe(bad)).toBeNull();
    }
  });

  it("drops extra fields rather than passing them to the insert", () => {
    const parsed = parseGuestSwipe({ ...shared, converted_user_id: "someone", id: 4 });
    expect(parsed && Object.keys(parsed).sort()).toEqual(["anon_id", "card_id", "choice", "hand_id"]);
  });
});
