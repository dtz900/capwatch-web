import { describe, it, expect, vi } from "vitest";
import { replayGuestPicks } from "./replay";

type Card = { id: number };

function harness(writeResults: boolean[] = []) {
  const calls: string[] = [];
  let i = 0;
  return {
    calls,
    writePlay: vi.fn(async (card: Card, choice: string) => {
      calls.push(`write:${card.id}:${choice}`);
      const r = writeResults[i++];
      return r === undefined ? true : r;
    }),
    requireUsername: vi.fn(() => {
      calls.push("username");
    }),
  };
}

const todo = [
  { card: { id: 9 }, choice: "tail" as const },
  { card: { id: 10 }, choice: "tail" as const },
];

describe("replayGuestPicks", () => {
  it("writes every pick before it ever asks for a username", async () => {
    const h = harness();
    const res = await replayGuestPicks({ todo, writePlay: h.writePlay, requireUsername: h.requireUsername });

    expect(res).toEqual({ written: 2, ok: true });
    expect(h.calls).toEqual(["write:9:tail", "write:10:tail", "username"]);
  });

  /* The 2026-09-24 loss: the modal ran first and a dismissal dropped both
     picks. Nothing the prompt does can cost a write any more, because the
     writes have already happened and it is not awaited. */
  it("keeps the picks even though the username prompt is never awaited", async () => {
    const h = harness();
    const requireUsername = vi.fn(() => {
      h.calls.push("username");
      // However the modal resolves, it cannot unwind what is already written.
      return undefined;
    });
    const res = await replayGuestPicks({ todo, writePlay: h.writePlay, requireUsername });

    expect(res.written).toBe(2);
    expect(h.writePlay).toHaveBeenCalledTimes(2);
    expect(requireUsername).toHaveBeenCalledTimes(1);
  });

  it("stops at the first failed write and reports it, so the stash is kept", async () => {
    const h = harness([true, false]);
    const res = await replayGuestPicks({ todo, writePlay: h.writePlay, requireUsername: h.requireUsername });

    expect(res).toEqual({ written: 1, ok: false });
    // No prompt on a failed run: the run will be retried on the next mount.
    expect(h.requireUsername).not.toHaveBeenCalled();
  });

  it("does not prompt when every pick was a pass", async () => {
    const h = harness();
    const res = await replayGuestPicks({
      todo: [{ card: { id: 9 }, choice: "pass" as const }],
      writePlay: h.writePlay,
      requireUsername: h.requireUsername,
    });

    expect(res).toEqual({ written: 1, ok: true });
    expect(h.requireUsername).not.toHaveBeenCalled();
  });

  it("does nothing with an empty stash", async () => {
    const h = harness();
    const res = await replayGuestPicks({ todo: [], writePlay: h.writePlay, requireUsername: h.requireUsername });

    expect(res).toEqual({ written: 0, ok: true });
    expect(h.writePlay).not.toHaveBeenCalled();
    expect(h.requireUsername).not.toHaveBeenCalled();
  });
});
