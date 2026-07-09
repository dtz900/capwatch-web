"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

const RETURN_COOKIE = "ts_return_to";

export function TailButton({
  capperId,
  size = "hero",
}: {
  capperId: number;
  size?: "hero" | "compact";
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
      .select("capper_id")
      .eq("user_id", session.user.id)
      .eq("capper_id", capperId)
      .maybeSingle()
      .then(({ data }) => setTailing(!!data));
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
          .insert({ user_id: session.user.id, capper_id: capperId });
        if (error) setTailing(false);
      }
    } finally {
      setPending(false);
    }
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
      {tailing ? "Tailing ✓" : "+ Tail"}
    </button>
  );
}
