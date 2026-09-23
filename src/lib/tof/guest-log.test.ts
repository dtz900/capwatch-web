import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { logGuestSwipe, markGuestConverted } from "./guest-log";
import { getAnonId } from "./anon";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function body(call = 0): Record<string, unknown> {
  return JSON.parse((fetchMock.mock.calls[call][1] as RequestInit).body as string);
}

describe("logGuestSwipe", () => {
  it("posts the swipe with the browser id and keepalive", () => {
    logGuestSwipe({ handId: 2, cardId: 7, choice: "fade" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/tof/guest-swipe");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.keepalive).toBe(true);
    expect(body()).toEqual({
      anon_id: localStorage.getItem("ts:tof:anon"),
      hand_id: 2,
      card_id: 7,
      choice: "fade",
    });
  });

  it("reuses one browser id across swipes", () => {
    logGuestSwipe({ handId: 2, cardId: 7, choice: "tail" });
    logGuestSwipe({ handId: 2, cardId: 8, choice: "pass" });
    expect(body(0).anon_id).toBe(body(1).anon_id);
  });

  it("never throws when the request fails", () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    expect(() => logGuestSwipe({ handId: 2, cardId: 7, choice: "tail" })).not.toThrow();
  });

  it("never throws when fetch itself is unavailable", () => {
    vi.stubGlobal("fetch", () => {
      throw new Error("no fetch");
    });
    expect(() => logGuestSwipe({ handId: 2, cardId: 7, choice: "tail" })).not.toThrow();
  });

  it("skips the write when storage is blocked", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    logGuestSwipe({ handId: 2, cardId: 7, choice: "tail" });
    expect(fetchMock).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("markGuestConverted", () => {
  it("does nothing for a browser that never swiped as a guest", () => {
    markGuestConverted();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem("ts:tof:anon")).toBeNull();
  });

  it("posts the stored browser id, and no user id (the session decides that)", () => {
    const id = getAnonId();
    markGuestConverted();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/tof/guest-swipe/convert");
    expect(body()).toEqual({ anon_id: id });
  });
});
