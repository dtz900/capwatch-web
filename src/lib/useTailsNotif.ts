"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { fetchTodayPicks } from "@/lib/api";
import { vipEnabled } from "@/lib/flags";

/* "New picks in My Tails" signal for the nav notification dot.

   Client-only bookkeeping: the latest relevant posted_at from the user's
   tailed cappers' today feed is compared against a per-user last-seen
   timestamp in localStorage. Visiting /my-tails records the latest as
   seen, so the dot clears there and re-arms when a newer pick lands.
   Relevance mirrors the My Tails page: whole-capper tails count every
   pick; market-scoped tails only count picks in the tailed market_group
   (parlays carry a null group and drop out of scoped views by design). */

const seenKey = (userId: string) => `ts-mytails-seen:${userId}`;

function readSeen(userId: string): string {
  try {
    return localStorage.getItem(seenKey(userId)) ?? "";
  } catch {
    return "";
  }
}

function writeSeen(userId: string, postedAt: string): void {
  try {
    // Never move the marker backwards (ISO strings compare lexically).
    if (postedAt > readSeen(userId)) localStorage.setItem(seenKey(userId), postedAt);
  } catch {
    /* storage unavailable: the dot just stays live */
  }
}

export function useNewTailPicks(): boolean {
  const pathname = usePathname() || "/";
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [hasNew, setHasNew] = useState(false);
  const onMyTails = pathname === "/my-tails" || pathname.startsWith("/my-tails/");
  const supabase = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? createBrowserSupabase()
        : null,
    []
  );

  useEffect(() => {
    if (!vipEnabled() || !supabase || !userId) {
      setHasNew(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("capper_follows")
        .select("capper_id, market")
        .eq("user_id", userId);
      if (cancelled || error || !data || data.length === 0) {
        if (!cancelled) setHasNew(false);
        return;
      }
      const rows = data as { capper_id: number; market: string }[];
      const whole = new Set(rows.filter((r) => r.market === "all").map((r) => r.capper_id));
      const scopes: Record<number, string[]> = {};
      for (const r of rows) {
        if (r.market === "all" || whole.has(r.capper_id)) continue;
        (scopes[r.capper_id] ??= []).push(r.market);
      }
      const ids = [...new Set(rows.map((r) => r.capper_id))];
      let latest = "";
      try {
        const today = await fetchTodayPicks(ids);
        for (const p of today.picks) {
          if (!whole.has(p.capper_id)) {
            const s = scopes[p.capper_id];
            if (!s || !p.market_group || !s.includes(p.market_group)) continue;
          }
          if (p.posted_at && p.posted_at > latest) latest = p.posted_at;
        }
      } catch (err) {
        console.error("tails notif feed fetch failed:", err);
        return;
      }
      if (cancelled) return;
      if (!latest) {
        setHasNew(false);
        return;
      }
      if (onMyTails) {
        writeSeen(userId, latest);
        setHasNew(false);
      } else {
        setHasNew(latest > readSeen(userId));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId, onMyTails, pathname]);

  return hasNew;
}
