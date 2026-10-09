// Slow-upstream visibility. A /slate render hung to the 30s function limit
// on 2026-10-09 with nothing in the Vercel logs to say which call it was
// waiting on. Anything over SLOW_UPSTREAM_MS (or any failure) now logs one
// line naming the call; normal requests log nothing.
export const SLOW_UPSTREAM_MS = 2_000;

export function shortUrl(url: string): string {
  return url.replace(/^https?:\/\/[^/]+/, "").slice(0, 140);
}

/** Warn when a call that got a response was slow, or answered 5xx (fast
 *  outages must show up too; 4xx such as a missing profile stay quiet). */
export function warnIfSlow(label: string, url: string, started: number, status: number, detail = ""): void {
  const ms = Date.now() - started;
  if (ms >= SLOW_UPSTREAM_MS || status >= 500) {
    const what = status >= 500 ? `HTTP ${status}` : "slow";
    console.warn(`[upstream] ${label} ${what} ${ms}ms ${shortUrl(url)} ${detail}`.trim());
  }
}

export function warnFailed(label: string, url: string, started: number, err: unknown, detail = ""): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`[upstream] ${label} failed after ${Date.now() - started}ms ${shortUrl(url)} ${detail}: ${msg}`);
}
