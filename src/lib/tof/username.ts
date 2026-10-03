/* Username rules, mirrored from the DB (migrations 2026-09-22_tail_or_fade.sql
   and 2026-10-03_tof_username_blocklist.sql). The trigger is the authority;
   this is the friendly pre-check. */

import { isBlockedUsername } from "./blocklist";

export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
export const USERNAME_CHANGE_DAYS = 30;

export const RESERVED_USERNAMES: readonly string[] = [
  "tailslips", "tailslip", "fadeai", "fade_ai", "admin", "support", "mod", "staff", "official", "team",
];

export type UsernameCheck = { ok: true } | { ok: false; reason: string };

export function validateUsername(raw: string, reserved: Iterable<string> = []): UsernameCheck {
  const name = (raw ?? "").trim();
  if (name.length < 3 || name.length > 20) return { ok: false, reason: "3 to 20 characters" };
  if (!USERNAME_RE.test(name)) return { ok: false, reason: "letters, numbers, underscores only" };
  const lower = name.toLowerCase();
  if (RESERVED_USERNAMES.includes(lower)) return { ok: false, reason: "that name is reserved" };
  for (const r of reserved) {
    if (r.toLowerCase() === lower) return { ok: false, reason: "that name is reserved" };
  }
  // Checked after reserved names, before the server round trip. A verified
  // capper's own handle bypasses this entirely server-side (tof.claim), so
  // there is nothing to mirror here for that path.
  if (isBlockedUsername(name)) return { ok: false, reason: "that name isn't allowed" };
  return { ok: true };
}

/** Null when the user may change now; otherwise the first allowed instant. */
export function nextUsernameChange(changedAt: string | null, now: Date = new Date()): Date | null {
  if (!changedAt) return null;
  const changed = new Date(changedAt);
  if (Number.isNaN(changed.getTime())) return null;
  const next = new Date(changed.getTime() + USERNAME_CHANGE_DAYS * 24 * 60 * 60 * 1000);
  return next > now ? next : null;
}
