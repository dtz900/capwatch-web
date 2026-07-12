"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { TailCrown } from "@/components/icons/TailCrown";

const RETURN_COOKIE = "ts_return_to";

export function TailButton({
  capperId,
  size = "hero",
  variant = "solid",
}: {
  capperId: number;
  size?: "hero" | "compact";
  /** "bare" drops the button chrome: quiet text + crown on the right that
   * fills when tailing (the stat-band placement). */
  variant?: "solid" | "bare";
}) {
  const { entitlements, session } = useAuth();
  const supabase = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? createBrowserSupabase()
        : null,
    []
  );
  const router = useRouter();
  const [tailing, setTailing] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!supabase || !session?.user?.id) {
      setTailing(false);
      return;
    }
    supabase
      .from("capper_follows")
      .select("market")
      .eq("user_id", session.user.id)
      .eq("capper_id", capperId)
      .then(({ data }) => setTailing(!!data && data.length > 0));
  }, [session, capperId, supabase]);

  async function toggle() {
    if (pending || tailing === null) return;
    if (!entitlements.isLoggedIn || !session) {
      document.cookie = `${RETURN_COOKIE}=${encodeURIComponent(
        window.location.pathname
      )}; path=/; max-age=1800; samesite=lax`;
      router.push("/login");
      return;
    }
    if (!supabase) return;
    setPending(true);
    try {
      if (tailing) {
        setTailing(false);
        // No market filter on purpose: untailing the capper removes the
        // whole-capper row AND any market-scoped rows.
        const { error } = await supabase
          .from("capper_follows")
          .delete()
          .eq("user_id", session.user.id)
          .eq("capper_id", capperId);
        if (error) setTailing(true);
      } else {
        setTailing(true);
        const { error } = await supabase
          .from("capper_follows")
          .insert({ user_id: session.user.id, capper_id: capperId, market: "all" });
        if (error) setTailing(false);
      }
    } finally {
      setPending(false);
    }
  }

  if (variant === "bare") {
    return (
      <button
        onClick={toggle}
        disabled={pending || tailing === null}
        title={tailing ? "Untail this capper" : "Tail this capper"}
        className={`inline-flex items-center gap-2 whitespace-nowrap text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          tailing
            ? "text-[var(--color-text)]"
            : "text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
        }`}
      >
        {tailing ? "Tailing" : "Tail capper"}
        <TailCrown
          filled={!!tailing}
          size={20}
          className={tailing ? "text-[var(--color-pos)]" : ""}
        />
      </button>
    );
  }

  const pad = size === "hero" ? "px-5 py-2" : "px-3 py-1.5";
  const base = `rounded-lg text-sm font-bold uppercase tracking-wide transition-colors ${pad} disabled:opacity-50 disabled:cursor-not-allowed`;

  return (
    <button
      onClick={toggle}
      disabled={pending || tailing === null}
      className={
        tailing
          ? `${base} border border-[var(--color-border-h)] text-[var(--color-text)] hover:border-[var(--color-neg)]`
          : `${base} bg-[var(--color-text)] text-black hover:opacity-90`
      }
    >
      <span className="inline-flex items-center gap-1.5">
        <TailCrown filled={!!tailing} className={tailing ? "text-[var(--color-pos)]" : ""} />
        {tailing ? "Tailing" : "Tail"}
      </span>
    </button>
  );
}
