/* Password sign-in is the fallback for mailboxes that hold or junk the
 * sign-in email (Comcast sat on one for minutes, 2026-11-06). The emailed
 * link and code stay the default; a password only removes the wait.
 *
 * Messages here are what the visitor reads, so they say what to do next
 * instead of echoing Supabase's wording. */

export const MIN_PASSWORD_LENGTH = 8;
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

export function signInErrorMessage(error: AuthErrorLike): string {
  if (error.code === "invalid_credentials" || /invalid login credentials/i.test(error.message ?? "")) {
    return "That email and password do not match. If you have not set a password yet, use the email sign-in, then set one on your account page.";
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
