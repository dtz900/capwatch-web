import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimeout, readBodyWithin } from "@/lib/api";

/**
 * An upstream that sends headers and then stalls mid-body used to escape the
 * timeout entirely: the timer was cleared on headers, and the caller's
 * res.json() waited until the 30s function limit. The body is now read inside
 * the timed window.
 */
function stallingBodyFetch() {
  return vi.fn((_url: string, init?: RequestInit) => {
    const signal = init?.signal;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"partial":'));
        signal?.addEventListener("abort", () =>
          controller.error(new DOMException("The operation was aborted.", "AbortError")),
        );
      },
    });
    return Promise.resolve(new Response(body, { status: 200 }));
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("upstream body timeout", () => {
  it("fetchWithTimeout aborts a response whose body stalls after the headers", async () => {
    vi.spyOn(global, "fetch").mockImplementation(stallingBodyFetch() as unknown as typeof fetch);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const t = Date.now();
    await expect(fetchWithTimeout("https://api.test/slow", {}, 100)).rejects.toThrow();
    expect(Date.now() - t).toBeLessThan(2_000);
  });

  it("readBodyWithin returns a readable copy with the same status and body", async () => {
    const out = await readBodyWithin(new Response('{"a":1}', { status: 201, headers: { "x-k": "v" } }));
    expect(out.status).toBe(201);
    expect(out.headers.get("x-k")).toBe("v");
    expect(await out.json()).toEqual({ a: 1 });
  });

  it("readBodyWithin handles an empty body (204)", async () => {
    const out = await readBodyWithin(new Response(null, { status: 204 }));
    expect(out.status).toBe(204);
  });
});
