import { afterEach, describe, expect, it, vi } from "vitest";
import { API_BASE } from "@/lib/config";
import {
  VipApiError,
  fixVipPick,
  getVipBoardGame,
  getVipBoardSlate,
  patchVipSeller,
  pullVipPick,
} from "@/lib/vip/client";

function stub(status: number, body?: unknown) {
  const fn = vi.fn().mockResolvedValue(
    body === undefined
      ? new Response(null, { status })
      : new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("pick builder client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("slate hits the board slate path with the sport", async () => {
    const fn = stub(200, { games: [] });
    await getVipBoardSlate("NBA", "t");
    expect(fn.mock.calls[0][0]).toBe(`${API_BASE}/api/vip/board/slate?sport=NBA`);
  });

  it("game board hits the per-game path", async () => {
    const fn = stub(200, { game_id: "401" });
    const out = await getVipBoardGame("NFL", "401", "t");
    expect(fn.mock.calls[0][0]).toBe(`${API_BASE}/api/vip/board/NFL/401`);
    expect(out.game_id).toBe("401");
  });

  it("fix PATCHes the ticket with the new body", async () => {
    const fn = stub(200, { ok: true, ticket_id: 9 });
    await fixVipPick(5, { sport: "NBA", legs: [{ selection: "LAL" }] }, "t");
    const [url, init] = fn.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/vip/picks/5`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body).legs[0].selection).toBe("LAL");
  });

  it("pull resolves on 204 without parsing a body", async () => {
    const fn = stub(204);
    await expect(pullVipPick(5, "t")).resolves.toBeUndefined();
    expect(fn.mock.calls[0][1].method).toBe("DELETE");
  });

  it("pull treats 404 as already pulled", async () => {
    stub(404, { detail: "pick_not_found" });
    await expect(pullVipPick(5, "t")).resolves.toBeUndefined();
  });

  it("pull surfaces game_started", async () => {
    stub(409, { detail: "game_started" });
    const err = (await pullVipPick(5, "t").catch((e) => e)) as VipApiError;
    expect(err.detail).toBe("game_started");
  });

  it("patch seller can send the preferred book alone", async () => {
    const fn = stub(200, { capper_id: 1 });
    await patchVipSeller({ preferred_book: "draftkings" }, "t");
    expect(JSON.parse(fn.mock.calls[0][1].body)).toEqual({ preferred_book: "draftkings" });
  });
});
