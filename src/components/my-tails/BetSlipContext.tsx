"use client";
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { vipTierEnabled } from "@/lib/flags";
import { useAuth } from "@/components/auth/AuthProvider";
import { fetchPickOutcomes } from "@/lib/api";
import {
  clampOdds, clampStake, slipInsertFromPick, slipTotals, type SlipEntry,
} from "@/lib/betslip";
import type { TodayPickEntry } from "@/lib/types";

export interface BetSlipCtx {
  entries: SlipEntry[] | null;
  inSlip: (pickId: number | null) => boolean;
  inSlipParlay: (parlayId: number | null) => boolean;
  addFromPick: (p: TodayPickEntry) => void;
  removeEntry: (id: number) => void;
  updateEntry: (id: number, patch: { stake?: number; odds?: number | null }) => void;
  totals: { today: number; allTime: number; pending: number };
  /** Per-capper assigned slip stake; null/absent = auto (capper's units, else 1u). */
  capperStakes: Record<string, number>;
  setCapperStake: (capperId: number, stake: number | null) => void;
  /** Wipe the running tally: history rows stay, the baseline moves to now. */
  startFresh: () => void;
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
  initialStakes = {},
  initialResetAt = null,
  children,
}: {
  todayDate: string | null;
  /** Server-loaded capper_follows.default_stake by capper id. */
  initialStakes?: Record<string, number>;
  /** Server-loaded ts_profiles.slip_reset_at. */
  initialResetAt?: string | null;
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
  const [capperStakes, setCapperStakes] = useState<Record<string, number>>(initialStakes);
  const [resetAt, setResetAt] = useState<string | null>(initialResetAt);
  const insertingKeysRef = useRef<Set<string>>(new Set());
  // Mirror of capperStakes for callbacks; written in the setter path (never
  // during render) so addFromPick reads live stakes without depending on the
  // map and re-creating per keystroke.
  const capperStakesRef = useRef<Record<string, number>>(initialStakes);
  // The provider owns the write debounce (Codex #73): the in-memory stake
  // updates SYNCHRONOUSLY on every tap so an add-to-slip inside the debounce
  // window reads the displayed value, and only the DB write per capper is
  // debounced. Pending writes flush on unmount so a quick navigation can't
  // discard a visibly accepted change.
  const stakeTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Last value confirmed in the DB per capper; the rollback target when a
  // debounced write fails.
  const persistedStakesRef = useRef<Record<string, number>>({ ...initialStakes });

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
          "id, pick_id, parlay_id, stake, odds, capper_id, capper_handle, matchup, market, selection, line, game_date, created_at"
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
        ...(r as Omit<SlipEntry, "outcome" | "market_odds">),
        market_odds: null,
        outcome: null,
      }));
      const ids = rows.map((r) => r.pick_id).filter((x): x is number => x != null);
      const pids = rows.map((r) => r.parlay_id).filter((x): x is number => x != null);
      let outcomes: Awaited<ReturnType<typeof fetchPickOutcomes>> = { picks: {}, parlays: {} };
      try {
        if (ids.length > 0 || pids.length > 0) {
          outcomes = await fetchPickOutcomes(ids, pids);
        }
      } catch (err) {
        console.error("bet slip outcomes fetch failed:", err);
      }
      if (cancelled) return;
      setEntries(
        rows.map((r) => {
          const graded =
            r.pick_id != null
              ? outcomes.picks[r.pick_id] ?? null
              : r.parlay_id != null
                ? outcomes.parlays[r.parlay_id] ?? null
                : null;
          return {
            ...r,
            market_odds: graded?.market_odds ?? null,
            outcome:
              graded?.outcome ??
              // pick purged upstream: render from snapshot, count as void
              (r.pick_id == null && r.parlay_id == null ? "V" : null),
          };
        })
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

  const inSlipParlay = useCallback(
    (parlayId: number | null) =>
      parlayId != null && (entries ?? []).some((e) => e.parlay_id === parlayId),
    [entries]
  );

  const addFromPick = useCallback(
    (p: TodayPickEntry) => {
      // The paid-tier teaser only exists once the VIP tier is live; on the
      // free launch every signed-in user gets the slip.
      if (vipTierEnabled() && !entitlements.isVip) {
        setTeaserOpen(true);
        return;
      }
      if (!supabase || !userId) return;
      // Straights key the dedup by pick id, parlay tails by parlay id;
      // prefixes keep the two id spaces from colliding in the shared ref.
      const dedupKey =
        p.kind === "parlay"
          ? p.parlay_id != null
            ? `parlay:${p.parlay_id}`
            : null
          : p.pick_id != null
            ? `pick:${p.pick_id}`
            : null;
      if (dedupKey === null) return;
      // Synchronous dedup check using ref
      if (insertingKeysRef.current.has(dedupKey)) {
        return;
      }
      insertingKeysRef.current.add(dedupKey);

      const payload = slipInsertFromPick(
        userId, p, todayDate, capperStakesRef.current[String(p.capper_id)] ?? null
      );
      if (!payload) {
        insertingKeysRef.current.delete(dedupKey);
        return;
      }
      const isDup = (e: SlipEntry) =>
        p.kind === "parlay" ? e.parlay_id === p.parlay_id : e.pick_id === p.pick_id;
      const tempId = -Date.now();
      const optimistic: SlipEntry = {
        id: tempId,
        pick_id: (payload.pick_id as number | null) ?? null,
        parlay_id: (payload.parlay_id as number | null) ?? null,
        stake: payload.stake as number,
        odds: (payload.odds as number | null) ?? null,
        market_odds: null,
        capper_id: p.capper_id,
        capper_handle: p.handle,
        matchup: (payload.matchup as string | null) ?? null,
        market: (payload.market as string | null) ?? null,
        selection: p.selection,
        line: (payload.line as number | null) ?? null,
        game_date: todayDate,
        created_at: new Date().toISOString(),
        outcome: null,
      };
      // Dedup inside the functional updater so a rapid double tap cannot
      // slip past a stale entries snapshot and insert twice.
      let duplicate = false;
      setEntries((prev) => {
        if (prev === null) return prev; // still loading
        if (prev.some(isDup)) {
          duplicate = true;
          return prev;
        }
        return [optimistic, ...prev];
      });
      if (duplicate) {
        insertingKeysRef.current.delete(dedupKey);
        return;
      }
      supabase
        .from("user_bet_slips")
        .insert(payload)
        .select(
          "id, pick_id, parlay_id, stake, odds, capper_id, capper_handle, matchup, market, selection, line, game_date, created_at"
        )
        .single()
        .then(({ data, error }) => {
          insertingKeysRef.current.delete(dedupKey);
          if (error || !data) {
            console.error("bet slip insert failed:", error);
            setEntries((prev) => (prev ?? []).filter((e) => e.id !== tempId));
            return;
          }
          const real: SlipEntry = {
            ...(data as Omit<SlipEntry, "outcome" | "market_odds">),
            market_odds: null,
            outcome: null,
          };
          setEntries((prev) => {
            const list = prev ?? [];
            // The initial load can resolve between the optimistic set and
            // this callback; if tempId is gone, append the committed row
            // instead of silently dropping it until the next reload.
            if (!list.some((e) => e.id === tempId)) {
              return list.some(isDup) ? list : [real, ...list];
            }
            return list.map((e) => (e.id === tempId ? real : e));
          });
        });
    },
    [entitlements.isVip, supabase, userId, todayDate]
  );

  const removeEntry = useCallback(
    (id: number) => {
      if (!supabase || !userId) return;
      const target = (entries ?? []).find((e) => e.id === id);
      if (!target || target.outcome !== null) return; // graded = locked
      const idx = (entries ?? []).findIndex((e) => e.id === id);
      setEntries((prev) => (prev ?? []).filter((e) => e.id !== id));
      supabase
        .from("user_bet_slips")
        .delete()
        .eq("user_id", userId)
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            console.error("bet slip delete failed:", error);
            // restore at the original position, not the top
            setEntries((prev) => {
              const next = [...(prev ?? [])];
              next.splice(Math.max(0, idx), 0, target);
              return next;
            });
          }
        });
    },
    [supabase, userId, entries]
  );

  const updateEntry = useCallback(
    (id: number, patch: { stake?: number; odds?: number | null }) => {
      if (!supabase || !userId) return;
      const target = (entries ?? []).find((e) => e.id === id);
      if (!target || target.outcome !== null) return; // graded = locked
      const stake = patch.stake !== undefined ? clampStake(patch.stake) : target.stake;
      // odds: undefined = untouched; null = back to "follow market";
      // a number passes through the clamp and rejects out of range.
      const odds =
        patch.odds === undefined ? target.odds
        : patch.odds === null ? null
        : clampOdds(patch.odds);
      if (stake === null || (patch.odds !== undefined && patch.odds !== null && odds === null)) {
        return; // rejected input, keep old
      }
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

  const persistCapperStake = useCallback(
    (capperId: number, value: number | null) => {
      if (!supabase || !userId) return;
      const key = String(capperId);
      // One stake per capper: applied to every follow row (whole-capper or
      // scoped) so the setting survives scope toggles.
      supabase
        .from("capper_follows")
        .update({ default_stake: value })
        .eq("user_id", userId)
        .eq("capper_id", capperId)
        .then(({ error }) => {
          if (error) {
            console.error("capper stake update failed:", error);
            const prev = persistedStakesRef.current[key] ?? null;
            setCapperStakes((m) => {
              const next = { ...m };
              if (prev === null) delete next[key];
              else next[key] = prev;
              capperStakesRef.current = next;
              return next;
            });
          } else if (value === null) {
            delete persistedStakesRef.current[key];
          } else {
            persistedStakesRef.current[key] = value;
          }
        });
    },
    [supabase, userId]
  );

  const setCapperStake = useCallback(
    (capperId: number, stake: number | null) => {
      if (!supabase || !userId) return;
      const key = String(capperId);
      const clamped = stake === null ? null : clampStake(stake);
      if (stake !== null && clamped === null) return; // rejected input, keep old
      if ((capperStakesRef.current[key] ?? null) === clamped) return;
      // Synchronous local update: display and addFromPick see it immediately.
      setCapperStakes((m) => {
        const next = { ...m };
        if (clamped === null) delete next[key];
        else next[key] = clamped;
        capperStakesRef.current = next;
        return next;
      });
      // Debounce only the DB write: a run of stepper taps lands as one call.
      const existing = stakeTimersRef.current.get(key);
      if (existing) clearTimeout(existing);
      stakeTimersRef.current.set(
        key,
        setTimeout(() => {
          stakeTimersRef.current.delete(key);
          persistCapperStake(capperId, capperStakesRef.current[key] ?? null);
        }, 500)
      );
    },
    [supabase, userId, persistCapperStake]
  );

  useEffect(() => {
    const timers = stakeTimersRef.current;
    return () => {
      // Unmount flush: commit any pending debounced stake immediately so a
      // fast navigation never drops an accepted change.
      for (const [key, t] of timers) {
        clearTimeout(t);
        persistCapperStake(Number(key), capperStakesRef.current[key] ?? null);
      }
      timers.clear();
    };
  }, [persistCapperStake]);

  const startFresh = useCallback(() => {
    if (!supabase || !userId) return;
    const prev = resetAt;
    // Optimistic with the browser clock; replaced by the DB's now() from the
    // RPC. The boundary must come from the database clock because
    // user_bet_slips.created_at does (Codex #72: a skewed device clock made
    // the tally boundary inconsistent either direction).
    setResetAt(new Date().toISOString());
    (async () => {
      const { data, error } = await supabase.rpc("slip_start_fresh");
      if (error || !data) {
        console.error("start fresh failed:", error);
        setResetAt(prev);
        return;
      }
      setResetAt(data as string);
    })();
  }, [supabase, userId, resetAt]);

  const totals = useMemo(
    () => slipTotals(entries ?? [], todayDate, resetAt),
    [entries, todayDate, resetAt]
  );

  // The slip renders as a daily card: only today's entries show. History
  // stays in user_bet_slips (it feeds the all-time total and the future
  // bet-log surface); yesterday's graded bets roll off at the date flip.
  const todayEntries = useMemo(() => {
    if (entries === null) return null;
    if (!todayDate) return entries;
    return entries.filter((e) => e.game_date === todayDate);
  }, [entries, todayDate]);

  const value = useMemo(
    () => ({
      entries: todayEntries, inSlip, inSlipParlay, addFromPick, removeEntry, updateEntry, totals,
      capperStakes, setCapperStake, startFresh,
      teaserOpen, closeTeaser: () => setTeaserOpen(false),
    }),
    [todayEntries, inSlip, inSlipParlay, addFromPick, removeEntry, updateEntry, totals,
     capperStakes, setCapperStake, startFresh, teaserOpen]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
