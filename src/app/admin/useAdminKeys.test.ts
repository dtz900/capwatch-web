import { describe, expect, it } from "vitest";
import { keyToAction } from "./useAdminKeys";

const MAP = { j: "next", enter: "approve", r: "reject", " ": "select", "shift+ ": "selectTweet" } as const;

describe("keyToAction (generic)", () => {
  it("maps shift+space to selectTweet", () => {
    expect(keyToAction({ key: " ", shiftKey: true }, MAP, "approve")).toBe("selectTweet");
  });
  it("ignores enter on a button", () => {
    expect(keyToAction({ key: "Enter", target: { tagName: "BUTTON" } }, MAP, "approve")).toBeNull();
  });
  it("ignores keys while typing", () => {
    expect(keyToAction({ key: "r", target: { tagName: "INPUT" } }, MAP, "approve")).toBeNull();
  });
});
