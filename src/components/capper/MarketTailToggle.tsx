"use client";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

/* Tail exactly one market from one capper. VIP only: non-VIPs render nothing
   (the panel that hosts this is already teaser-gated for them). Plain text
   control by design; no pill chrome. */
export function MarketTailToggle({ capperId, market }: { capperId: number; market: string }) {
  const { session, entitlements } = useAuth();
  const supabase = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? createBrowserSupabase()
        : null,
    []
  );
  const [tailing, setTailing] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!supabase || !session?.user?.id || !entitlements.isVip) {
      setTailing(false);
      return;
    }
    supabase
      .from("capper_follows")
      .select("market")
      .eq("user_id", session.user.id)
      .eq("capper_id", capperId)
      .eq("market", market)
      .maybeSingle()
      .then(({ data }) => setTailing(!!data));
  }, [session, capperId, market, supabase, entitlements.isVip]);

  if (!entitlements.isVip) return null;

  async function toggle() {
    if (!supabase || !session?.user?.id || pending || tailing === null) return;
    setPending(true);
    try {
      if (tailing) {
        setTailing(false);
        const { error } = await supabase
          .from("capper_follows")
          .delete()
          .eq("user_id", session.user.id)
          .eq("capper_id", capperId)
          .eq("market", market);
        if (error) setTailing(true);
      } else {
        setTailing(true);
        // A whole-capper tail converts to scoped: drop the 'all' row first.
        await supabase
          .from("capper_follows")
          .delete()
          .eq("user_id", session.user.id)
          .eq("capper_id", capperId)
          .eq("market", "all");
        const { error } = await supabase
          .from("capper_follows")
          .insert({ user_id: session.user.id, capper_id: capperId, market });
        if (error) setTailing(false);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={pending || tailing === null}
      title={tailing ? "Untail this market" : "Tail only this market from this capper"}
      className={`text-xs font-semibold transition-colors disabled:opacity-50 ${
        tailing
          ? "text-[var(--color-pos)] hover:text-[var(--color-neg)]"
          : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      }`}
    >
      {tailing ? "tailing" : "+ tail"}
    </button>
  );
}
