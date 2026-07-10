"use client";
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { fetchPickOutcomes } from "@/lib/api";
import {
  clampOdds, clampStake, slipInsertFromPick, slipTotals, type SlipEntry,
} from "@/lib/betslip";
import type { TodayPickEntry } from "@/lib/types";

export interface BetSlipCtx {
  entries: SlipEntry[] | null;
  inSlip: (pickId: number | null) => boolean;
  addFromPick: (p: TodayPickEntry) => void;
  removeEntry: (id: number) => void;
  updateEntry: (id: number, patch: { stake?: number; odds?: number }) => void;
  totals: { today: number; allTime: number; pending: number };
  teaserOpen: boolean;
  closeTeaser: () => void;
}

const Ctx = createContext<BetSlipCtx | null>(null);

/** Null outside the provider so shared components degrade gracefully. */
export function useBetSlip(): BetSlipCtx | null {
  return useContext(Ctx);
}

export function BetSlipProvider({
  todayDate,
  children,
}: {
  todayDate: string | null;
  children: React.ReactNode;
}) {
  const { session, entitlements } = useAuth();
  const userId = session?.user?.id ?? null;
  const supabase = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? createBrowserSupabase()
        : null,
    []
  );
  const [entries, setEntries] = useState<SlipEntry[] | null>(null);
  const [teaserOpen, setTeaserOpen] = useState(false);

  useEffect(() => {
    if (!supabase || !userId) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_bet_slips")
        .select(
          "id, pick_id, stake, odds, capper_id, capper_handle, matchup, market, selection, line, game_date, created_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error("bet slip load failed:", error);
        setEntries([]);
        return;
      }
      const rows: SlipEntry[] = (data ?? []).map((r) => ({
        ...(r as Omit<SlipEntry, "outcome">),
        outcome: null,
      }));
      const ids = rows.map((r) => r.pick_id).filter((x): x is number => x != null);
      let outcomes: Awaited<ReturnType<typeof fetchPickOutcomes>> = {};
      try {
        outcomes = ids.length > 0 ? await fetchPickOutcomes(ids) : {};
      } catch (err) {
        console.error("bet slip outcomes fetch failed:", err);
      }
      if (cancelled) return;
      setEntries(
        rows.map((r) => ({
          ...r,
          // pick purged upstream: render from snapshot, count as void
          outcome: r.pick_id == null ? "V" : outcomes[r.pick_id]?.outcome ?? null,
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  const inSlip = useCallback(
    (pickId: number | null) =>
      pickId != null && (entries ?? []).some((e) => e.pick_id === pickId),
    [entries]
  );

  const addFromPick = useCallback(
    (p: TodayPickEntry) => {
      if (!entitlements.isVip) {
        setTeaserOpen(true);
        return;
      }
      if (!supabase || !userId || entries === null) return;
      const payload = slipInsertFromPick(userId, p, todayDate);
      if (!payload || inSlip(p.pick_id)) return;
      const tempId = -Date.now();
      const optimistic: SlipEntry = {
        id: tempId,
        pick_id: p.pick_id,
        stake: payload.stake as number,
        odds: payload.odds as number,
        capper_id: p.capper_id,
        capper_handle: p.handle,
        matchup: p.matchup,
        market: p.market,
        selection: p.selection,
        line: p.line,
        game_date: todayDate,
        created_at: new Date().toISOString(),
        outcome: null,
      };
      setEntries((prev) => [optimistic, ...(prev ?? [])]);
      supabase
        .from("user_bet_slips")
        .insert(payload)
        .select(
          "id, pick_id, stake, odds, capper_id, capper_handle, matchup, market, selection, line, game_date, created_at"
        )
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            console.error("bet slip insert failed:", error);
            setEntries((prev) => (prev ?? []).filter((e) => e.id !== tempId));
            return;
          }
          setEntries((prev) =>
            (prev ?? []).map((e) =>
              e.id === tempId ? { ...(data as Omit<SlipEntry, "outcome">), outcome: null } : e
            )
          );
        });
    },
    [entitlements.isVip, supabase, userId, entries, todayDate, inSlip]
  );

  const removeEntry = useCallback(
    (id: number) => {
      if (!supabase || !userId) return;
      const target = (entries ?? []).find((e) => e.id === id);
      if (!target || target.outcome !== null) return; // graded = locked
      setEntries((prev) => (prev ?? []).filter((e) => e.id !== id));
      supabase
        .from("user_bet_slips")
        .delete()
        .eq("user_id", userId)
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            console.error("bet slip delete failed:", error);
            setEntries((prev) => [target, ...(prev ?? [])]);
          }
        });
    },
    [supabase, userId, entries]
  );

  const updateEntry = useCallback(
    (id: number, patch: { stake?: number; odds?: number }) => {
      if (!supabase || !userId) return;
      const target = (entries ?? []).find((e) => e.id === id);
      if (!target || target.outcome !== null) return; // graded = locked
      const stake = patch.stake !== undefined ? clampStake(patch.stake) : target.stake;
      const odds = patch.odds !== undefined ? clampOdds(patch.odds) : target.odds;
      if (stake === null || odds === null) return; // rejected input, keep old
      setEntries((prev) =>
        (prev ?? []).map((e) => (e.id === id ? { ...e, stake, odds } : e))
      );
      supabase
        .from("user_bet_slips")
        .update({ stake, odds })
        .eq("user_id", userId)
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            console.error("bet slip update failed:", error);
            setEntries((prev) =>
              (prev ?? []).map((e) => (e.id === id ? target : e))
            );
          }
        });
    },
    [supabase, userId, entries]
  );

  const totals = useMemo(
    () => slipTotals(entries ?? [], todayDate),
    [entries, todayDate]
  );

  const value = useMemo(
    () => ({
      entries, inSlip, addFromPick, removeEntry, updateEntry, totals,
      teaserOpen, closeTeaser: () => setTeaserOpen(false),
    }),
    [entries, inSlip, addFromPick, removeEntry, updateEntry, totals, teaserOpen]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
