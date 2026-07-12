import Link from "next/link";
import type { CapperRow, ScopeStat, TodayPickEntry } from "@/lib/types";
import { MARKET_LABELS, toneCls } from "@/lib/edges";
import { CapperAvatar } from "@/components/leaderboard/CapperAvatar";
import { StreakBadge } from "@/components/leaderboard/StreakBadge";
import { Sparkline } from "@/components/leaderboard/Sparkline";
import { MomentumStrip } from "@/components/leaderboard/MomentumStrip";
import { StatusPill } from "@/components/my-tails/StatusPill";
import { formatUnits } from "@/lib/formatters";
import { useBetSlip } from "@/components/my-tails/BetSlipContext";

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
  const scoped = scopes.length > 0;
  const positive = (capper.units_profit ?? 0) >= 0;
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#15151a] via-[#0f0f14] to-[#0a0a0d] border border-[var(--color-border)] px-5 py-5">
      <button
        aria-label={`Untail ${capper.display_name ?? capper.handle}`}
        onClick={onUntail}
        className="absolute right-3 top-3 z-10 text-[var(--color-text-muted)] hover:text-[var(--color-neg)] text-sm"
        title="Untail"
      >
        {"✕"}
      </button>
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
        {!scoped && (
          <>
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
            {capper.last_picks && capper.last_picks.length > 0 && (
              <div className="mt-3">
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
              {todayPicks.map((p, i) => (
                <li
                  key={`${p.posted_at}-${i}`}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-tight text-[var(--color-text)] truncate">
                      {p.selection}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] truncate">
                      {p.matchup ?? (p.kind === "parlay" ? "Multi-game" : "")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
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
                        {p.profit_units >= 0 ? "+" : ""}
                        {p.profit_units.toFixed(1)}u
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
                </li>
              ))}
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
      </Link>
    </div>
  );
}
