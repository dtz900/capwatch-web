import { describe, expect, it } from "vitest";
import { REPEATABLE, keyToAction } from "./useAuditKeys";

describe("keyToAction", () => {
  it("maps the flow keys", () => {
    expect(keyToAction({ key: "j" })).toBe("next");
    expect(keyToAction({ key: "k" })).toBe("prev");
    expect(keyToAction({ key: "Enter" })).toBe("enter");
    expect(keyToAction({ key: "w" })).toBe("grade:win");
    expect(keyToAction({ key: "L" })).toBe("grade:loss");
    expect(keyToAction({ key: "p" })).toBe("grade:push");
    expect(keyToAction({ key: "v" })).toBe("grade:void");
    expect(keyToAction({ key: "a" })).toBe("skip");
    expect(keyToAction({ key: "Escape" })).toBe("escape");
  });
  it("ignores unmapped keys", () => {
    expect(keyToAction({ key: "x" })).toBeNull();
  });
  it("ignores typing targets", () => {
    for (const tagName of ["INPUT", "TEXTAREA", "SELECT"]) {
      expect(keyToAction({ key: "j", target: { tagName } })).toBeNull();
    }
    expect(keyToAction({ key: "j", target: { tagName: "DIV", isContentEditable: true } })).toBeNull();
    expect(keyToAction({ key: "j", target: { tagName: "BUTTON" } })).toBe("next");
  });
  it("ignores modifier chords", () => {
    expect(keyToAction({ key: "r", ctrlKey: true } as never)).toBeNull();
    expect(keyToAction({ key: "j", metaKey: true } as never)).toBeNull();
    expect(keyToAction({ key: "j", altKey: true } as never)).toBeNull();
  });
  it("leaves Enter to focused buttons and links", () => {
    expect(keyToAction({ key: "Enter", target: { tagName: "BUTTON" } })).toBeNull();
    expect(keyToAction({ key: "Enter", target: { tagName: "A" } })).toBeNull();
    expect(keyToAction({ key: "Enter", target: { tagName: "SPAN", closest: () => ({}) } })).toBeNull();
    expect(keyToAction({ key: "Enter", target: { tagName: "BODY", closest: () => null } })).toBe("enter");
    expect(keyToAction({ key: "Enter", target: { tagName: "BODY" } })).toBe("enter");
  });
  it("allows key repeat only for queue navigation", () => {
    expect(REPEATABLE.has(keyToAction({ key: "j" })!)).toBe(true);
    expect(REPEATABLE.has(keyToAction({ key: "k" })!)).toBe(true);
    for (const key of ["Enter", "w", "l", "p", "v", "a", "Escape"]) {
      expect(REPEATABLE.has(keyToAction({ key })!)).toBe(false);
    }
  });
});
