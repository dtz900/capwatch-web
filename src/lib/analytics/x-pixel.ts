/** X (Twitter) ads pixel config, from X Ads Events manager (2026-11-04).
 *  Public ids (they ship in the page source), so they default here; env
 *  overrides them, and setting either env var to "off" disables the pixel. */
const DEFAULT_PIXEL_ID = "rii1b";
const DEFAULT_SIGNUP_EVENT_ID = "tw-rii1b-rii1k";

function fromEnv(value: string | undefined, fallback: string): string | null {
  if (value === "off") return null;
  return value || fallback;
}

export function xPixelId(): string | null {
  return fromEnv(process.env.NEXT_PUBLIC_X_PIXEL_ID, DEFAULT_PIXEL_ID);
}

export function xSignupEventId(): string | null {
  return fromEnv(process.env.NEXT_PUBLIC_X_SIGNUP_EVENT_ID, DEFAULT_SIGNUP_EVENT_ID);
}

/** How recent the first email confirmation must be to count as a new
 *  account. A magic link or code confirms the email on first use; every later
 *  sign-in leaves the timestamp where it was, so a returning user never
 *  converts. Google sign-ups confirm at creation. */
export const FRESH_SIGNUP_WINDOW_MS = 15 * 60 * 1000;

type AuthUserLike = {
  created_at?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
};

export function isFreshSignup(user: AuthUserLike, now: number = Date.now()): boolean {
  const stamp = user.email_confirmed_at ?? user.confirmed_at ?? user.created_at;
  if (!stamp) return false;
  const t = Date.parse(stamp);
  if (Number.isNaN(t)) return false;
  const age = now - t;
  return age >= -60_000 && age < FRESH_SIGNUP_WINDOW_MS;
}

/** localStorage key that stops a refresh inside the window from firing twice.
 *  X also dedupes on conversion_id (the user id). */
export function signupFiredKey(userId: string): string {
  return `ts_x_signup_fired:${userId}`;
}
