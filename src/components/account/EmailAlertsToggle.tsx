"use client";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { createBrowserSupabase } from "@/lib/supabase/client";

/* Email alerts opt-out toggle. Reads/writes ts_profiles.email_tail_alerts;
 * RLS row policy plus a column-scoped grant restrict the write to exactly
 * this column on the user's own row. Optimistic flip with rollback. */
export function EmailAlertsToggle() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const supabase = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? createBrowserSupabase()
        : null,
    []
  );

  useEffect(() => {
    if (!supabase || !userId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("ts_profiles")
        .select("email_tail_alerts")
        .eq("user_id", userId)
        .maybeSingle();
      if (!cancelled && !error && data) setEnabled(Boolean(data.email_tail_alerts));
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  async function toggle() {
    if (!supabase || !userId || pending || enabled === null) return;
    setPending(true);
    const next = !enabled;
    setEnabled(next);
    const { error } = await supabase
      .from("ts_profiles")
      .update({ email_tail_alerts: next })
      .eq("user_id", userId);
    if (error) setEnabled(!next);
    setPending(false);
  }

  if (enabled === null) return null;

  return (
    <div className="mt-3 flex items-center justify-between">
      <div>
        <div className="text-[15px] font-bold text-[var(--color-text)]">
          Email me when my tails post picks
        </div>
        <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          One email per burst of new picks, with the full day board included.
        </div>
      </div>
      <button
        onClick={() => void toggle()}
        disabled={pending}
        aria-label="Toggle tail email alerts"
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          enabled ? "bg-[#2fd9c0]" : "bg-[var(--color-border)]"
        } ${pending ? "opacity-60" : ""}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-[#0a0a0d] transition-all ${
            enabled ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
