/* PostHog settings shared by the client init and the identify bridge.
 *
 * PostHog stays off until NEXT_PUBLIC_POSTHOG_KEY is set, so this ships
 * dark and turns on with one Vercel env var. Events go through the
 * site's own /ingest rewrite (next.config.ts) so ad blockers that drop
 * *.posthog.com requests don't skew the counts.
 */
export const POSTHOG_INGEST_PATH = "/ingest";
export const POSTHOG_UI_HOST = "https://us.posthog.com";
export const EXCLUDE_FLAG_KEY = "tailslips_exclude_analytics";

// Next.js inlines NEXT_PUBLIC_* into the browser bundle only where the code
// reads the literal `process.env.NEXT_PUBLIC_POSTHOG_KEY`. Passing process.env
// around as an object leaves the browser with undefined, so the literal read
// lives here and the parser below stays testable.
export function posthogKey(raw: string | undefined = process.env.NEXT_PUBLIC_POSTHOG_KEY): string | null {
  const k = raw?.trim();
  return k ? k : null;
}

/** True when this browser opted out via /exclude-me (the same flag the
 *  Vercel Analytics wrapper honors). Storage errors count as not excluded. */
export function isExcludedBrowser(storage: Pick<Storage, "getItem"> | null): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(EXCLUDE_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}
