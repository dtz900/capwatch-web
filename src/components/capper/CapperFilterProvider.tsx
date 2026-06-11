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
  children,
}: {
  handle: string;
  initialProfile: CapperProfile;
  initialWindow: Window;
  initialBetType: BetTypeFilter;
  initialMarket: string;
  initialOutcome: string;
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
  const [history, setHistory] = useState<HistoryPick[]>(initialProfile.history);
  const [historyTotal, setHistoryTotal] = useState<number>(initialProfile.history_total);
  const [offset, setOffset] = useState<number>(initialProfile.history.length);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  const baseAgg = profile.aggregates[window] ?? profile.aggregates["all_time"];
  const marketSlices = baseAgg?.market_slices ?? null;
  const marketOptions = useMemo(() => buildMarketOptions(marketSlices), [marketSlices]);
  const activeSlice = market && marketSlices ? marketSlices[market] : undefined;
  const displayAgg =
    activeSlice && baseAgg ? marketSliceToAggregate(baseAgg, activeSlice) : baseAgg;
  const displayTrajectory = activeSlice
    ? activeSlice.trajectory
    : profile.trajectory?.[window] ?? [];
  const marketLabel = market
    ? marketOptions.find((o) => o.value === market)?.label ?? null
    : null;
  const label = scopeLabel(window, market ? "straights" : betType, marketLabel);

  const syncUrl = useCallback(
    (w: Window, bt: BetTypeFilter, mk: string, oc: string) => {
      const params = new URLSearchParams();
      if (w !== DEFAULT_WINDOW) params.set("window", w);
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
      let bt = next.betType ?? betType;
      let mk = next.market ?? market;
      const oc = next.outcome ?? outcome;

      // Parlays cannot be market-scoped; clear the market.
      if (bt === "parlays") mk = "";
      // Choosing All or Parlays from the bet-type toggle clears any market.
      if (next.betType && next.betType !== "straights") mk = "";

      setWindowState(w);
      setBetTypeState(bt);
      setMarketState(mk);
      setOutcomeState(oc);
      syncUrl(w, bt, mk, oc);

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
  }, [handle, window, betType, market, outcome, offset, history.length, historyTotal, loadingHistory]);

  const value: FilterContextValue = {
    handle,
    profile,
    window,
    betType,
    market,
    outcome,
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
