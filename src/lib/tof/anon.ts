/* A per-browser id for Tail or Fade guest telemetry.
 *
 * It identifies a browser, not a person: it is generated locally, never sent
 * anywhere but /api/tof/guest-swipe, and only ever tied to an account when
 * that browser signs in and the conversion stamp runs. Clearing site data
 * makes a new one, which is the intended privacy behaviour.
 */
const ANON_KEY = "ts:tof:anon";

/** The id for this browser, creating one on first call. Null when storage is
 *  unavailable (private mode, blocked cookies): telemetry is then skipped and
 *  the deck still works, which is the whole contract of this module. */
export function getAnonId(): string | null {
  try {
    const existing = localStorage.getItem(ANON_KEY);
    if (existing && isUuid(existing)) return existing;
    const fresh = crypto.randomUUID();
    localStorage.setItem(ANON_KEY, fresh);
    return fresh;
  } catch {
    return null;
  }
}

/** Reads without creating: the conversion stamp must not mint an id for a
 *  browser that never swiped as a guest. */
export function peekAnonId(): string | null {
  try {
    const v = localStorage.getItem(ANON_KEY);
    return v && isUuid(v) ? v : null;
  } catch {
    return null;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}
