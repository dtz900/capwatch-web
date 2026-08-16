import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { CapperRow, ScopeStat, TodayPickEntry } from "@/lib/types";
import { MARKET_LABELS, toneCls } from "@/lib/edges";
import { CapperAvatar } from "@/components/leaderboard/CapperAvatar";
import { StreakBadge } from "@/components/leaderboard/StreakBadge";
import { Sparkline } from "@/components/leaderboard/Sparkline";
import { MomentumStrip } from "@/components/leaderboard/MomentumStrip";
import { StatusPill } from "@/components/my-tails/StatusPill";
import { formatUnits, formatUnitsSmart, trimUnits } from "@/lib/formatters";
import { useBetSlip } from "@/components/my-tails/BetSlipContext";

/** localStorage key holding the capper ids whose lifetime block is folded. */
const HIDE_KEY = "ts:stable:hideProfit";
const HIDE_EVENT = "ts:stable:hideProfit:change";

/** Tiny external store over localStorage so every card (and every tab)
 *  agrees on which lifetime blocks are folded, without setState-in-effect. */
function readHidden(): string {
  try {
    return window.localStorage.getItem(HIDE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
function subscribeHidden(cb: () => void): () => void {
  window.addEventListener("storage", cb);
  window.addEventListener(HIDE_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(HIDE_EVENT, cb);
  };
}
function writeHidden(ids: number[]): void {
  try {
    window.localStorage.setItem(HIDE_KEY, JSON.stringify(ids));
  } catch {
    // preference is a nicety; never let storage break the toggle
  }
  window.dispatchEvent(new Event(HIDE_EVENT));
}

/** Eye / eye-off, sized to sit beside the untail control. */
function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  );
}

export function StableCard({
  capper,
  onUntail,
  todayPicks = [],
  scopes = [],
  scopeStats = [],
  onUntailMarket,
}: {
  capper: CapperRow;
  onUntail: () => void;
  todayPicks?: TodayPickEntry[];
  scopes?: string[];
  scopeStats?: ScopeStat[];
  onUntailMarket?: (market: string) => void;
}) {
  const slip = useBetSlip();
  const [openParlays, setOpenParlays] = useState<Set<number>>(new Set());
  // Per-capper "hide the lifetime block" toggle. A capper can win a night by
  // 19u while sitting red for the season, and the season figure sitting above
  // that night is both off-message and unkind to the capper, so the eye folds
  // the card straight from the name to the momentum strip. Persisted per
  // capper in localStorage; read after mount so SSR markup stays stable.
  const hiddenRaw = useSyncExternalStore(subscribeHidden, readHidden, () => "[]");
  const hiddenIds = useMemo<number[]>(() => {
    try {
      const parsed = JSON.parse(hiddenRaw);
      return Array.isArray(parsed) ? parsed.map(Number) : [];
    } catch {
      return [];
    }
  }, [hiddenRaw]);
  const profitHidden = hiddenIds.includes(Number(capper.capper_id));
  const toggleProfit = () => {
    const id = Number(capper.capper_id);
    const kept = hiddenIds.filter((x) => x !== id);
    writeHidden(profitHidden ? kept : [...kept, id]);
  };
  const scoped = scopes.length > 0;
  const positive = (capper.units_profit ?? 0) >= 0;
  // Assigned slip stake for this capper, driven by a tap stepper (no text
  // input: this card language has no form fields). AUTO = the capper's own
  // posted units carry to the slip, else 1u. Steps of 0.25u; stepping below
  // 0.25u returns to AUTO. Every tap commits to the provider SYNCHRONOUSLY
  // (so an immediate add-to-slip uses the displayed stake); the provider
  // owns the debounced DB write and flushes it on unmount (Codex #73).
  const shownStake = slip?.capperStakes[String(capper.capper_id)] ?? null;
  const stepStake = (dir: 1 | -1) => {
    if (!slip) return;
    const cur = shownStake;
    const next: number | null =
      dir === 1
        ? cur === null
          ? 1.0
          : Math.min(10, Math.round((cur + 0.25) * 4) / 4)
        : cur === null || cur <= 0.25
          ? null
          : Math.round((cur - 0.25) * 4) / 4;
    if (next === cur) return;
    slip.setCapperStake(Number(capper.capper_id), next);
  };
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#15151a] via-[#0f0f14] to-[#0a0a0d] border border-[var(--color-border)] px-5 py-5">
      {/* Only unscoped cards render the lifetime block, so only they get
          the eye; a scoped card would have a button that changes nothing
          (Codex, PR #85). */}
      {!scoped && (
        <button
          aria-label={
            profitHidden
              ? `Show lifetime profit for ${capper.display_name ?? capper.handle}`
              : `Hide lifetime profit for ${capper.display_name ?? capper.handle}`
          }
          aria-pressed={profitHidden}
          onClick={toggleProfit}
          className="absolute right-9 top-3 z-10 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          title={profitHidden ? "Show net profit" : "Hide net profit"}
        >
          <EyeIcon off={profitHidden} />
        </button>
      )}
      <button
        aria-label={`Untail ${capper.display_name ?? capper.handle}`}
        onClick={onUntail}
        className="absolute right-3 top-3 z-10 text-[var(--color-text-muted)] hover:text-[var(--color-neg)] text-sm"
        title="Untail"
      >
        {"✕"}
      </button>
      {/* Only the header links to the profile; the card body (stats, today
          picks) is plain so slip adds and the parlay expander don't navigate. */}
      <Link href={`/cappers/${capper.handle}`} className="block">
        <div className="flex items-center gap-3">
          <CapperAvatar url={capper.profile_image_url} handle={capper.handle} size={44} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--color-text)] truncate">
                {capper.display_name ?? capper.handle}
              </span>
              <StreakBadge streak={capper.current_day_streak} size="sm" />
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">@{capper.handle}</span>
            {scoped && (
              <span className="ml-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-gold)]">
                {scopes.length === 1
                  ? `${MARKET_LABELS[scopes[0]] ?? scopes[0]} only`
                  : `${scopes.length} markets only`}
              </span>
            )}
          </div>
        </div>
      </Link>
        {!scoped && (
          <>
            {!profitHidden && (
            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                  Net profit
                </div>
                <div
                  className={`text-[32px] leading-none font-extrabold tabular-nums ${
                    positive ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"
                  }`}
                >
                  {formatUnits(capper.units_profit)}
                </div>
                <div className="mt-1 text-xs text-[var(--color-text-soft)]">
                  {capper.roi_pct != null ? `${capper.roi_pct > 0 ? "+" : ""}${capper.roi_pct.toFixed(1)}% ROI` : ""}
                  {capper.win_rate != null ? ` · ${Math.round(capper.win_rate * 100)}% win` : ""}
                  {` · ${capper.picks_count} picks`}
                </div>
              </div>
              {capper.trajectory_units && capper.trajectory_units.length >= 2 && (
                <Sparkline values={capper.trajectory_units} width={116} height={38} />
              )}
            </div>
            )}
            {capper.last_picks && capper.last_picks.length > 0 && (
              <div className={profitHidden ? "mt-4" : "mt-3"}>
                <MomentumStrip picks={capper.last_picks} />
              </div>
            )}
          </>
        )}
        {scoped && (
          <div className="mt-4 space-y-2.5">
            {/* ROI only, on purpose: xROI/CLV/verdicts are VIP inventory
                and never reach this surface (ScopeStat carries just the
                public-safe fields). */}
            {scopes.map((m) => {
              const label = MARKET_LABELS[m] ?? m;
              const s = scopeStats.find((r) => r.market === m);
              const untail = onUntailMarket && (
                <button
                  aria-label={`Untail ${label}`}
                  title="Untail this market"
                  onClick={(ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    onUntailMarket(m);
                  }}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-neg)] text-xs"
                >
                  {"✕"}
                </button>
              );
              if (!s) {
                return (
                  <div key={m} className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                      {label}
                    </span>
                    <span className="ml-auto text-xs text-[var(--color-text-muted)]">
                      no data yet
                    </span>
                    {untail}
                  </div>
                );
              }
              const roiTone =
                s.roi_pct != null && s.roi_pct > 0
                  ? "pos"
                  : s.roi_pct != null && s.roi_pct < 0
                    ? "neg"
                    : "muted";
              return (
                <div key={m}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                      {label}
                    </span>
                    {untail}
                  </div>
                  <div className="mt-1 flex items-baseline gap-2 tabular-nums">
                    <span className={`text-[22px] leading-none font-extrabold ${toneCls(roiTone)}`}>
                      {s.roi_pct != null
                        ? `${s.roi_pct > 0 ? "+" : ""}${s.roi_pct.toFixed(1)}%`
                        : "n/a"}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      ROI · {s.n_decided} picks
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {slip && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
              Slip stake
            </span>
            {/* Framed stepper pill, same chrome as the card: no text input.
                AUTO carries the capper's posted units to the slip. */}
            <div className="flex items-stretch overflow-hidden rounded-lg ring-1 ring-[var(--color-border)] bg-[rgba(255,255,255,0.03)]">
              <button
                aria-label={`Decrease slip stake for ${capper.display_name ?? capper.handle}`}
                onClick={(ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  stepStake(-1);
                }}
                disabled={shownStake === null}
                className="h-7 w-7 text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:hover:text-[var(--color-text-muted)]"
              >
                {"−"}
              </button>
              <span
                title="AUTO carries the capper's posted units"
                className={`flex min-w-12 items-center justify-center border-x border-[var(--color-border)] px-1.5 text-[12px] font-extrabold tabular-nums ${
                  shownStake === null
                    ? "tracking-[0.12em] text-[var(--color-text-muted)]"
                    : "text-[var(--color-text)]"
                }`}
              >
                {shownStake === null ? "AUTO" : `${trimUnits(shownStake)}u`}
              </span>
              <button
                aria-label={`Increase slip stake for ${capper.display_name ?? capper.handle}`}
                onClick={(ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  stepStake(1);
                }}
                className="h-7 w-7 text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                {"+"}
              </button>
            </div>
          </div>
        )}
        <div className="mt-4 border-t border-[var(--color-border)] pt-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
              Today
            </span>
            {todayPicks.length > 0 && (
              <span className="text-[10px] font-bold tabular-nums text-[var(--color-text-soft)]">
                {todayPicks.length} pick{todayPicks.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {todayPicks.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">No picks yet today.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {todayPicks.map((p, i) => {
                const expandable =
                  p.kind === "parlay" && p.parlay_id != null && (p.legs?.length ?? 0) > 0;
                const open = expandable && openParlays.has(p.parlay_id as number);
                return (
                <li key={`${p.posted_at}-${i}`}>
                <div className="flex items-center justify-between gap-3">
                  <div
                    className={`min-w-0 ${expandable ? "cursor-pointer" : ""}`}
                    {...(expandable
                      ? {
                          role: "button" as const,
                          tabIndex: 0,
                          "aria-expanded": open,
                          "aria-label": `${open ? "Hide" : "Show"} ${p.selection} legs`,
                          onClick: (ev: React.MouseEvent) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            setOpenParlays((prev) => {
                              const next = new Set(prev);
                              const id = p.parlay_id as number;
                              if (next.has(id)) next.delete(id);
                              else next.add(id);
                              return next;
                            });
                          },
                        }
                      : {})}
                  >
                    <div className="text-sm font-semibold leading-tight text-[var(--color-text)] truncate">
                      {p.selection}
                      {expandable && (
                        <span className="ml-1.5 text-[10px] text-[var(--color-text-muted)]">
                          {open ? "▾" : "▸"}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] truncate">
                      {p.matchup ?? (p.kind === "parlay" ? "Multi-game" : "")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.units != null && (
                      <span
                        className="text-[10px] font-bold tabular-nums text-[var(--color-text-muted)]"
                        title="Capper's posted stake"
                      >
                        {p.units}u
                      </span>
                    )}
                    {p.odds_taken != null && (
                      <span className="text-xs font-semibold tabular-nums text-[var(--color-text-soft)]">
                        {p.odds_taken > 0 ? "+" : ""}
                        {p.odds_taken}
                      </span>
                    )}
                    {(p.outcome === "W" || p.outcome === "L") && p.profit_units != null && (
                      <span
                        className={`text-xs font-bold tabular-nums ${
                          p.profit_units >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"
                        }`}
                      >
                        {formatUnitsSmart(p.profit_units)}u
                      </span>
                    )}
                    <StatusPill outcome={p.outcome} />
                    {slip && p.outcome == null &&
                      (p.kind === "straight" ? p.pick_id != null : p.parlay_id != null) && (
                      (p.kind === "straight" ? slip.inSlip(p.pick_id) : slip.inSlipParlay(p.parlay_id)) ? (
                        <button
                          aria-label={`Remove ${p.selection} from bet slip`}
                          title="On your slip. Click to remove"
                          onClick={(ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            const entry = slip.entries?.find((e) =>
                              p.kind === "straight"
                                ? e.pick_id === p.pick_id
                                : e.parlay_id === p.parlay_id
                            );
                            if (entry) slip.removeEntry(entry.id);
                          }}
                          className="text-[var(--color-pos)] text-sm font-bold"
                        >
                          {"✓"}
                        </button>
                      ) : (
                        <button
                          aria-label={`Add ${p.selection} to bet slip`}
                          title="Add to bet slip"
                          onClick={(ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            slip.addFromPick(p);
                          }}
                          className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-sm font-bold"
                        >
                          {"+"}
                        </button>
                      )
                    )}
                  </div>
                </div>
                {open && (
                  <ul className="mt-1.5 ml-1 space-y-1.5 border-l border-[var(--color-border)] pl-2.5">
                    {p.legs!.map((leg) => (
                      <li key={leg.leg_index} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold leading-tight text-[var(--color-text-soft)] truncate">
                            {leg.selection}
                          </div>
                          <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] truncate">
                            {[leg.game_label, leg.market].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {leg.odds_taken != null && (
                            <span className="text-[11px] font-semibold tabular-nums text-[var(--color-text-muted)]">
                              {leg.odds_taken > 0 ? "+" : ""}
                              {leg.odds_taken}
                            </span>
                          )}
                          {leg.outcome != null && (
                            <span
                              className={`text-[11px] font-bold ${
                                leg.outcome === "W"
                                  ? "text-[var(--color-pos)]"
                                  : leg.outcome === "L"
                                    ? "text-[var(--color-neg)]"
                                    : "text-[var(--color-text-muted)]"
                              }`}
                            >
                              {leg.outcome}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                </li>
                );
              })}
            </ul>
          )}
          {/* Day P&L across the graded picks shown on this card, footered
              like the bet slip's tally. */}
          {todayPicks.some((p) => p.profit_units != null) && (
            <div className="mt-3 flex items-baseline justify-between border-t border-[var(--color-border)] pt-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
                Day P&L
              </span>
              <span
                className={`text-[17px] font-extrabold tabular-nums leading-none ${
                  todayPicks.reduce((n, p) => n + (p.profit_units ?? 0), 0) >= 0
                    ? "text-[var(--color-pos)]"
                    : "text-[var(--color-neg)]"
                }`}
              >
                {formatUnits(todayPicks.reduce((n, p) => n + (p.profit_units ?? 0), 0))}u
              </span>
            </div>
          )}
        </div>
    </div>
  );
}
