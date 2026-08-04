import crypto from "crypto";
import Link from "next/link";
import { createServiceSupabase } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/* Signed one-click unsubscribe for tail email alerts. Token scheme must
 * stay in sync with the backend's core/email_unsub.py: hex
 * HMAC-SHA256(EMAIL_UNSUB_SECRET, user_id). The service client bypasses
 * RLS, so a verified token is the only thing authorizing the write. */
function validToken(userId: string, token: string): boolean {
  const secret = process.env.EMAIL_UNSUB_SECRET;
  if (!secret || !userId || !token) return false;
  const expected = crypto.createHmac("sha256", secret).update(userId).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(token, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string; t?: string }>;
}) {
  const { u = "", t = "" } = await searchParams;
  let ok = false;
  if (validToken(u, t)) {
    const supabase = createServiceSupabase();
    if (supabase) {
      const { error } = await supabase
        .from("ts_profiles")
        .update({ email_tail_alerts: false })
        .eq("user_id", u);
      ok = !error;
    }
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="w-full rounded-2xl bg-gradient-to-b from-[#15151a] via-[#0f0f14] to-[#0a0a0d] border border-[var(--color-border)] px-6 py-8">
        <h1 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
          Tail alerts
        </h1>
        {ok ? (
          <>
            <p className="mt-3 text-[15px] font-bold text-[var(--color-text)]">
              You are unsubscribed from tail alerts.
            </p>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              You can turn them back on anytime from your{" "}
              <Link href="/account" className="underline">
                account page
              </Link>
              .
            </p>
          </>
        ) : (
          <p className="mt-3 text-[15px] font-bold text-[var(--color-text)]">
            That unsubscribe link is invalid or expired.
          </p>
        )}
      </div>
    </main>
  );
}
