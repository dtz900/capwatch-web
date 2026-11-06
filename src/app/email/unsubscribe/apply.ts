import crypto from "crypto";
import { createServiceSupabase } from "@/lib/supabase/service";

import { unsubKind, unsubPayload } from "./kinds";

/* Server-only. Shared by the unsubscribe page (a person tapping the footer
 * link) and the one-click POST route (a mailbox provider acting on the
 * List-Unsubscribe header). Token scheme must stay in sync with the
 * backend's core/email_unsub.py: hex HMAC-SHA256(EMAIL_UNSUB_SECRET,
 * payload). The service client bypasses RLS, so a verified token is the
 * only thing authorizing the write. */

export type UnsubResult = "ok" | "invalid" | "error";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_SHA256 = /^[0-9a-f]{64}$/i;

export function validUnsubToken(userId: string, token: string, k: string | undefined): boolean {
  const secret = process.env.EMAIL_UNSUB_SECRET;
  if (!secret || !UUID.test(userId) || !HEX_SHA256.test(token)) return false;
  const expected = crypto.createHmac("sha256", secret).update(unsubPayload(userId, k)).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(token.toLowerCase(), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Turn off the preference the link names. "invalid" = bad or missing
 *  token (nothing written); "error" = the token was good but the write
 *  failed, so the caller must not tell anyone they are unsubscribed. */
export async function applyUnsub(userId: string, token: string, k: string | undefined): Promise<UnsubResult> {
  if (!validUnsubToken(userId, token, k)) return "invalid";
  const supabase = createServiceSupabase();
  if (!supabase) {
    console.error("email unsubscribe: service client not configured");
    return "error";
  }
  const { error } = await supabase
    .from("ts_profiles")
    .update({ [unsubKind(k).column]: false })
    .eq("user_id", userId);
  if (error) {
    console.error("email unsubscribe: update failed:", error);
    return "error";
  }
  return "ok";
}
