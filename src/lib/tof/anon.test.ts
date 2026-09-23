import { describe, it, expect, beforeEach, vi } from "vitest";
import { getAnonId, peekAnonId, isUuid } from "./anon";

const KEY = "ts:tof:anon";

beforeEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("getAnonId", () => {
  it("mints once and then reuses it", () => {
    const first = getAnonId();
    expect(isUuid(first)).toBe(true);
    expect(getAnonId()).toBe(first);
    expect(localStorage.getItem(KEY)).toBe(first);
  });

  it("replaces a corrupted value instead of sending it", () => {
    localStorage.setItem(KEY, "garbage");
    const id = getAnonId();
    expect(isUuid(id)).toBe(true);
    expect(id).not.toBe("garbage");
  });

  it("returns null when storage throws, so telemetry is skipped", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(getAnonId()).toBeNull();
    spy.mockRestore();
  });
});

describe("peekAnonId", () => {
  it("does not mint an id for a browser that never swiped", () => {
    expect(peekAnonId()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("returns the stored id once one exists", () => {
    const id = getAnonId();
    expect(peekAnonId()).toBe(id);
  });
});
