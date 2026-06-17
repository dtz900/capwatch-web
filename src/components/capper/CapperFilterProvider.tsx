"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { fetchCapperSlice } from "@/lib/capperClient";
import {
  buildMarketOptions,
  marketSliceToAggregate,
  rangeScopeLabel,
  scopeLabel,
} from "@/lib/capperFilters";
import type { MarketOption } from "@/lib/capperFilters";
import type {
  BetTypeFilter,
  CapperAggregate,
  CapperProfile,
  HistoryPick,
  Window,
} from "@/lib/types";

const DEFAULT_WINDOW: Window = "season";
const PAGE_SIZE = 25;

interface FilterContextValue {
  handle: string;
  profile: CapperProfile;
  window: Window;
  betType: BetTypeFilter;
  market: string;
  outcome: string;
  range: { start: string; end: string } | null;
  setRange: (start: string, end: string) => void;
  clearRange: () => void;
  /** Aggregate to render: market slice overlay when a market is active,
   * otherwise the headline aggregate for the window. */
  displayAgg: CapperAggregate | undefined;
  displayTrajectory: number[];
  /** "Season · Spread" style scope label. */
  label: string;
  /** True when a specific market is selected (StatBand hides streak + biggest
   * win, which are not computed per market). */
  marketScoped: boolean;
  marketOptions: MarketOption[];
  /** Market filter is disabled under the Parlays bet type. */
  marketDisabled: boolean;
  history: HistoryPick[];
  historyTotal: number;
  loadingHistory: boolean;
  loadingStats: boolean;
  hasMore: boolean;
  heroRef: React.RefObject<HTMLDivElement | null>;
  setWindow: (w: Window) => void;
  setBetType: (b: BetTypeFilter) => void;
  setMarket: (m: string) => void;
  setOutcome: (o: string) => void;
  loadMore: () => void;
}

const Ctx = createContext<FilterContextValue | null>(null);

export function useCapperFilters(): FilterContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCapperFilters must be used within CapperFilterProvider");
  return v;
}

/** A market implies straight picks (a parlay spans multiple markets), so the
 * effective bet type sent to the history query is "straights" whenever a
 * specific market is active. */
function effectiveBetType(market: string, betType: BetTypeFilter): BetTypeFilter {
  return market ? "straights" : betType;
}

export function CapperFilterProvider({
  handle,
  initialProfile,
  initialWindow,
  initialBetType,
  initialMarket,
  initialOutcome,
  initialRange = null,
  children,
}: {
  handle: string;
  initialProfile: CapperProfile;
  initialWindow: Window;
  initialBetType: BetTypeFilter;
  initialMarket: string;
  initialOutcome: string;
  initialRange?: { start: string; end: string } | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement | null>(null);
  // Monotonic request id: a newer filter change invalidates an in-flight
  // response so out-of-order fetches cannot clobber fresher state.
  const reqSeq = useRef(0);

  const [profile, setProfile] = useState<CapperProfile>(initialProfile);
  // bet_type the loaded `profile` aggregates were fetched for.
  const [loadedBetType, setLoadedBetType] = useState<BetTypeFilter>(
    effectiveBetType(initialMarket, initialBetType),
  );
  const [window, setWindowState] = useState<Window>(initialWindow);
  const [betType, setBetTypeState] = useState<BetTypeFilter>(initialBetType);
  const [market, setMarketState] = useState<string>(initialMarket);
  const [outcome, setOutcomeState] = useState<string>(initialOutcome);
  const [range, setRangeState] = useState<{ start: string; end: string } | null>(initialRange);
  const [history, setHistory] = useState<HistoryPick[]>(initialProfile.history);
  const [historyTotal, setHistoryTotal] = useState<number>(initialProfile.history_total);
  const [offset, setOffset] = useState<number>(initialProfile.history.length);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  const rangeAgg = profile.range_aggregate ?? undefined;
  const baseAgg = range
    ? rangeAgg
    : profile.aggregates[window] ?? profile.aggregates["all_time"];
  const marketSlices = baseAgg?.market_slices ?? null;
  const marketOptions = useMemo(() => buildMarketOptions(marketSlices), [marketSlices]);
  const activeSlice = market && marketSlices ? marketSlices[market] : undefined;
  const displayAgg =
    activeSlice && baseAgg ? marketSliceToAggregate(baseAgg, activeSlice) : baseAgg;
  const displayTrajectory = activeSlice
    ? activeSlice.trajectory
    : range
      ? rangeAgg?.trajectory ?? []
      : profile.trajectory?.[window] ?? [];
  const marketLabel = market
    ? marketOptions.find((o) => o.value === market)?.label ?? null
    : null;
  const label = range
    ? rangeScopeLabel(range.start, range.end, market ? "straights" : betType, marketLabel)
    : scopeLabel(window, market ? "straights" : betType, marketLabel);

  const syncUrl = useCallback(
    (w: Window, bt: BetTypeFilter, mk: string, oc: string, rg: { start: string; end: string } | null) => {
      const params = new URLSearchParams();
      if (rg) {
        params.set("start", rg.start);
        params.set("end", rg.end);
      } else if (w !== DEFAULT_WINDOW) {
        params.set("window", w);
      }
      if (bt !== "all") params.set("bet_type", bt);
      if (mk) params.set("market", mk);
      if (oc) params.set("outcome", oc);
      const qs = params.toString();
      const path = `/cappers/${encodeURIComponent(handle)}`;
      router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
    },
    [handle, router],
  );

  const applyFilters = useCallback(
    async (next: {
      window?: Window;
      betType?: BetTypeFilter;
      market?: string;
      outcome?: string;
    }) => {
      const w = next.window ?? window;
      const bt = next.betType ?? betType;
      let mk = next.market ?? market;
      const oc = next.outcome ?? outcome;

      // Parlays cannot be market-scoped; clear the market. This also covers the
      // case where betType is already "parlays" and only a market update is
      // passed (next.betType is undefined, so the second guard would not fire).
      if (bt === "parlays") mk = "";
      // Choosing All or Parlays from the bet-type toggle clears any market.
      if (next.betType && next.betType !== "straights") mk = "";

      setWindowState(w);
      setBetTypeState(bt);
      setMarketState(mk);
      setOutcomeState(oc);
      // Choosing a window/bet-type/market exits range mode.
      setRangeState(null);
      syncUrl(w, bt, mk, oc, null);

      const histBetType = effectiveBetType(mk, bt);
      // A fresh profile (aggregates) is needed only when the data we render
      // is not already loaded. For the headline (no market) we need the row
      // for the selected bet type. For a market view we need market_slices,
      // which live on the all/straights rows (identical), so only a
      // parlays-loaded profile must refetch.
      const needProfile = mk ? loadedBetType === "parlays" : loadedBetType !== bt;

      const seq = ++reqSeq.current;
      if (needProfile) setLoadingStats(true);
      setLoadingHistory(true);
      try {
        const fetched = await fetchCapperSlice(handle, {
          window: w,
          betType: histBetType,
          market: mk || undefined,
          outcome: oc || undefined,
          offset: 0,
          limit: PAGE_SIZE,
        });
        if (seq !== reqSeq.current) return; // superseded by a newer change
        if (needProfile) {
          setProfile(fetched);
          setLoadedBetType(histBetType);
        }
        setHistory(fetched.history);
        setHistoryTotal(fetched.history_total);
        setOffset(fetched.history.length);
      } catch {
        // Keep the prior view on a transient failure; the user can retry by
        // toggling again. No partial-render surprise.
      } finally {
        if (seq === reqSeq.current) {
          setLoadingStats(false);
          setLoadingHistory(false);
        }
      }
    },
    [handle, window, betType, market, outcome, loadedBetType, syncUrl],
  );

  const setRange = useCallback(
    async (start: string, end: string) => {
      const bt = betType;
      const mk = market;
      const oc = outcome;
      setRangeState({ start, end });
      syncUrl(window, bt, mk, oc, { start, end });
      const histBetType = effectiveBetType(mk, bt);
      const seq = ++reqSeq.current;
      setLoadingStats(true);
      setLoadingHistory(true);
      try {
        const fetched = await fetchCapperSlice(handle, {
          window,
          betType: histBetType,
          market: mk || undefined,
          outcome: oc || undefined,
          start,
          end,
          offset: 0,
          limit: PAGE_SIZE,
        });
        if (seq !== reqSeq.current) return;
        setProfile(fetched);
        setLoadedBetType(histBetType);
        setHistory(fetched.history);
        setHistoryTotal(fetched.history_total);
        setOffset(fetched.history.length);
      } catch {
        // keep prior view
      } finally {
        if (seq === reqSeq.current) {
          setLoadingStats(false);
          setLoadingHistory(false);
        }
      }
    },
    [handle, window, betType, market, outcome, syncUrl],
  );

  const clearRange = useCallback(() => {
    setRangeState(null);
    applyFilters({ window });
  }, [applyFilters, window]);

  const loadMore = useCallback(async () => {
    if (loadingHistory || history.length >= historyTotal) return;
    const histBetType = effectiveBetType(market, betType);
    const seq = ++reqSeq.current;
    setLoadingHistory(true);
    try {
      const fetched = await fetchCapperSlice(handle, {
        window,
        betType: histBetType,
        market: market || undefined,
        outcome: outcome || undefined,
        start: range?.start,
        end: range?.end,
        offset,
        limit: PAGE_SIZE,
      });
      if (seq !== reqSeq.current) return;
      setHistory((prev) => [...prev, ...fetched.history]);
      setHistoryTotal(fetched.history_total);
      setOffset((prev) => prev + fetched.history.length);
    } catch {
      // Leave already-loaded rows in place; the load-more control stays
      // available for a retry.
    } finally {
      if (seq === reqSeq.current) setLoadingHistory(false);
    }
  }, [handle, window, betType, market, outcome, range, offset, history.length, historyTotal, loadingHistory]);

  const value: FilterContextValue = {
    handle,
    profile,
    window,
    betType,
    market,
    outcome,
    range,
    setRange,
    clearRange,
    displayAgg,
    displayTrajectory,
    label,
    marketScoped: Boolean(market),
    marketOptions,
    marketDisabled: betType === "parlays",
    history,
    historyTotal,
    loadingHistory,
    loadingStats,
    hasMore: history.length < historyTotal,
    heroRef,
    setWindow: (w) => applyFilters({ window: w }),
    setBetType: (b) => applyFilters({ betType: b }),
    setMarket: (m) => applyFilters({ market: m }),
    setOutcome: (o) => applyFilters({ outcome: o }),
    loadMore,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
