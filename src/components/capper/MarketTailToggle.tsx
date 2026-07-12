"use client";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { TailCrown } from "@/components/icons/TailCrown";

/* Tail exactly one market from one capper. Any signed-in user; logged-out
   viewers render nothing (their hosts show a sign-in path instead). Plain
   text control by default; `pill` renders a labeled bordered button for
   hosts like the profile market filter. */
export function MarketTailToggle({
  capperId,
  market,
  ink = false,
  pill = false,
}: {
  capperId: number;
  market: string;
  ink?: boolean;
  pill?: boolean;
}) {
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
    if (!supabase || !session?.user?.id || !entitlements.isLoggedIn) {
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
  }, [session, capperId, market, supabase, entitlements.isLoggedIn]);

  if (!entitlements.isLoggedIn) return null;

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
        // select() returns the deleted rows so we know whether one existed
        // and can restore it if the scoped insert then fails.
        const { data: deleted, error: delErr } = await supabase
          .from("capper_follows")
          .delete()
          .eq("user_id", session.user.id)
          .eq("capper_id", capperId)
          .eq("market", "all")
          .select("market");
        if (delErr) {
          setTailing(false);
          return;
        }
        const { error } = await supabase
          .from("capper_follows")
          .insert({ user_id: session.user.id, capper_id: capperId, market });
        if (error) {
          setTailing(false);
          if (deleted && deleted.length > 0) {
            // Best effort restore of the whole-capper tail we removed above.
            await supabase
              .from("capper_follows")
              .insert({ user_id: session.user.id, capper_id: capperId, market: "all" });
          }
        }
      }
    } finally {
      setPending(false);
    }
  }

  if (pill) {
    // Editorial small caps, crown on the right: solid soft crown at rest,
    // deep green with a glow once tailing. No button chrome.
    return (
      <button
        onClick={toggle}
        disabled={pending || tailing === null}
        title={tailing ? "Untail this market" : "Tail only this market from this capper"}
        className={`relative inline-flex items-end gap-2.5 whitespace-nowrap text-[11px] font-bold uppercase leading-none tracking-[0.18em] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          tailing
            ? "text-[var(--color-text)]"
            : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        }`}
      >
        {tailing ? "Tailing market" : "Tail this market"}
        {/* translate compensates the path's empty bottom band so the crown's
            base sits on the text baseline */}
        <TailCrown
          size={26}
          className={`translate-y-[5px] ${
            tailing ? "text-[#35a05f] [filter:drop-shadow(0_0_3px_rgba(53,160,95,0.5))]" : ""
          }`}
        />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={pending || tailing === null}
      title={tailing ? "Untail this market" : "Tail only this market from this capper"}
      className={`whitespace-nowrap text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
        ink
          ? tailing
            ? "text-[#15803d] hover:text-[#b91c1c]"
            : "text-[#7a7263] hover:text-[#17140f]"
          : tailing
            ? "text-[var(--color-text)] hover:text-[var(--color-neg)]"
            : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      }`}
    >
      {tailing ? "✓" : "Tail"}
    </button>
  );
}
