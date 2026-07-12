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
  // This user's follow rows for the capper: null = loading, [] = not
  // tailing, ["all"] = whole capper, ["ML", ...] = scoped markets.
  const [follows, setFollows] = useState<string[] | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!supabase || !session?.user?.id) {
      setFollows([]);
      return;
    }
    supabase
      .from("capper_follows")
      .select("market")
      .eq("user_id", session.user.id)
      .eq("capper_id", capperId)
      .then(({ data }) => setFollows(((data ?? []) as { market: string }[]).map((r) => r.market)));
  }, [session, capperId, supabase]);

  const hasAll = !!follows?.includes("all");
  const scoped = !hasAll && !!follows && follows.length > 0;
  const tailing = follows === null ? null : follows.length > 0;

  async function toggle() {
    if (pending || follows === null) return;
    if (!entitlements.isLoggedIn || !session) {
      document.cookie = `${RETURN_COOKIE}=${encodeURIComponent(
        window.location.pathname
      )}; path=/; max-age=1800; samesite=lax`;
      router.push("/login");
      return;
    }
    if (!supabase) return;
    setPending(true);
    const before = follows;
    try {
      if (hasAll) {
        // Fully tailed -> untail. No market filter on purpose: removes the
        // whole-capper row AND any leftover market-scoped rows.
        setFollows([]);
        const { error } = await supabase
          .from("capper_follows")
          .delete()
          .eq("user_id", session.user.id)
          .eq("capper_id", capperId);
        if (error) setFollows(before);
      } else if (scoped) {
        // Scoped -> whole capper: replace the market rows with an 'all' row.
        setFollows(["all"]);
        const { error: delErr } = await supabase
          .from("capper_follows")
          .delete()
          .eq("user_id", session.user.id)
          .eq("capper_id", capperId);
        if (delErr) {
          setFollows(before);
          return;
        }
        const { error } = await supabase
          .from("capper_follows")
          .insert({ user_id: session.user.id, capper_id: capperId, market: "all" });
        if (error) {
          setFollows(before);
          // Best effort restore of the scoped rows we removed above.
          await supabase.from("capper_follows").insert(
            before.map((m) => ({ user_id: session.user.id, capper_id: capperId, market: m }))
          );
        }
      } else {
        setFollows(["all"]);
        const { error } = await supabase
          .from("capper_follows")
          .insert({ user_id: session.user.id, capper_id: capperId, market: "all" });
        if (error) setFollows(before);
      }
    } finally {
      setPending(false);
    }
  }

  if (variant === "bare") {
    // Editorial small caps + crown, matching MarketTailToggle's pill look.
    return (
      <button
        onClick={toggle}
        disabled={pending || tailing === null}
        title={
          hasAll
            ? "Untail this capper"
            : scoped
              ? "Tailing specific markets. Click to tail every market."
              : "Tail this capper"
        }
        className={`relative inline-flex items-end gap-2.5 whitespace-nowrap text-[11px] font-bold uppercase leading-none tracking-[0.18em] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          tailing
            ? "text-[var(--color-text)]"
            : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        }`}
      >
        {hasAll ? "Tailing" : scoped ? "Tailing markets" : "Tail capper"}
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
        <TailCrown size={16} className={tailing ? "text-[#35a05f]" : ""} />
        {tailing ? "Tailing" : "Tail"}
      </span>
    </button>
  );
}
