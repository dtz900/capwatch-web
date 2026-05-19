// tests/lib/api.parlayPalace.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchPalaceList, fetchPalaceEntry } from "@/lib/api";

afterEach(() => vi.restoreAllMocks());

describe("fetchPalaceList", () => {
  it("hits /api/public/parlay-palace and returns entries", async () => {
    const sample = { entries: [{ slug: "x-2leg-2026-05-18" }] };
    const spy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true, json: async () => sample,
    } as unknown as Response);
    const out = await fetchPalaceList();
    expect(out).toEqual(sample.entries);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("/api/public/parlay-palace"),
      expect.any(Object));
  });
});

describe("fetchPalaceEntry", () => {
  it("returns null on 404", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false, status: 404,
    } as unknown as Response);
    expect(await fetchPalaceEntry("missing")).toBeNull();
  });
});
