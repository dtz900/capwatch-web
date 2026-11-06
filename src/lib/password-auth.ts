import type { SupabaseClient } from "@supabase/supabase-js";

/* Password sign-in is the fallback for mailboxes that hold or junk the
 * sign-in email (Comcast sat on one for minutes, 2026-11-06). The emailed
 * link and code stay the default; a password only removes the wait.
 *
 * Messages here are what the visitor reads, so they say what to do next
 * instead of echoing Supabase's wording. */

// Enforced here because the login system itself accepts six characters and
// took "abc123" and "password" when tested (2026-11-06). People sell on the
// platform now, so the form is the gate until the project setting is raised.
export const MIN_PASSWORD_LENGTH = 12;
// bcrypt, which Supabase hashes with, ignores everything past 72 bytes.
export const MAX_PASSWORD_LENGTH = 72;

interface AuthErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

/** Null when the password is acceptable, else the reason to show. */
export function validateNewPassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_LENGTH) {
    return `Keep it under ${MAX_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

/** True when this account owns a capper profile, by the same column the
 *  platform's seller routes check (cappers.claimed_by_user_id). Not the X
 *  verification on the auth context: an owner linked without it is still a
 *  seller. Throws when the lookup fails; callers treat that as "do not let a
 *  password through", never as "not a seller". */
export async function ownsCapper(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase.from("cappers").select("id").eq("claimed_by_user_id", userId).limit(1);
  if (error) throw error instanceof Error ? error : new Error("capper ownership lookup failed");
  return (data?.length ?? 0) > 0;
}

export const SELLER_NO_PASSWORD =
  "Seller accounts sign in with the emailed link only. Use the email sign-in.";

/** How many times this password shows up in known breaches (Have I Been
 *  Pwned range API). Only the first five characters of its SHA-1 leave the
 *  browser, so the password and its full hash are never sent anywhere.
 *  Throws when the lookup cannot be completed; the caller must not save a
 *  password it could not check. */
export async function breachCount(password: string, fetchImpl: typeof fetch = fetch): Promise<number> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(password));
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  const prefix = hex.slice(0, 5);
  const suffix = hex.slice(5);
  const res = await fetchImpl(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { "Add-Padding": "true" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`breach lookup failed: ${res.status}`);
  for (const line of (await res.text()).split(/\r?\n/)) {
    const [candidate, count] = line.trim().split(":");
    if (candidate === suffix) return Number.parseInt(count ?? "0", 10) || 0;
  }
  return 0;
}

export function signInErrorMessage(error: AuthErrorLike): string {
  if (error.code === "invalid_credentials" || /invalid login credentials/i.test(error.message ?? "")) {
    // The form's own hint under the error covers "no password yet".
    return "That email and password do not match.";
  }
  if (error.code === "email_not_confirmed") {
    return "This email has not been confirmed yet. Use the email sign-in to confirm it.";
  }
  if (error.status === 429 || error.code === "over_request_rate_limit") {
    return "Too many attempts. Wait a minute and try again.";
  }
  return "Sign-in failed. Try again, or use the email sign-in.";
}

export function setPasswordErrorMessage(error: AuthErrorLike): string {
  if (error.code === "same_password") {
    return "That is already your password.";
  }
  if (error.code === "weak_password") {
    return "That password is too easy to guess. Try a longer one.";
  }
  if (error.code === "reauthentication_needed" || error.code === "session_not_found" || error.status === 401) {
    return "For security, sign out, sign back in by email, then set your password right away.";
  }
  if (error.status === 429 || error.code === "over_request_rate_limit") {
    return "Too many attempts. Wait a minute and try again.";
  }
  return "Could not save the password. Try again.";
}
