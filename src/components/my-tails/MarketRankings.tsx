"use client";
import { useState } from "react";
import Link from "next/link";
import { buildEdgeView, MARKET_LABELS, VERDICT_WORDS, toneCls } from "@/lib/edges";
import { MarketTailToggle } from "@/components/capper/MarketTailToggle";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  digest,
  headline,
  marketsPresent,
  rankRows,
  type RankedEdgeRow,
} from "@/lib/marketRankings";

/* VIP discovery section on My Tails: every (capper, market) pair ranked by
   what closing odds say it deserves. Digest = tailable pairs across all
   markets; a market chip drills into that market's full ranking including
   the failers, so the top raw-ROI name explains itself. */
export function MarketRankings({ rows, vip }: { rows: RankedEdgeRow[]; vip: boolean }) {
  const { entitlements } = useAuth();
  const [market, setMarket] = useState<string>("all");

  const header = (
    <div>
      <h2 className="text-lg font-bold text-[var(--color-text)]">Market Rankings</h2>
      <p className="mt-0.5 text-sm text-[var(--color-text-soft)]">
        Every capper in every market, ranked by what closing odds say they deserve.
      </p>
    </div>
  );

  if (!vip) {
    return (
      <section className="rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] px-5 py-5">
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-gold)]">VIP</div>
        <div className="mt-1">{header}</div>
        <p className="mt-2 text-sm text-[var(--color-text)]">
          See who actually holds up: de-lucked rankings for every market, with a
          tail button on every row.
        </p>
        <Link
          href={entitlements.isLoggedIn ? "/account" : "/login"}
          className="mt-3 inline-block rounded-lg border border-[var(--color-border-h)] px-3 py-1.5 text-sm text-[var(--color-text)]"
        >
          {entitlements.isLoggedIn ? "Upgrade to VIP" : "Sign in to get started"}
        </Link>
      </section>
    );
  }

  const markets = marketsPresent(rows);
  const shown =
    market === "all" ? digest(rows) : rankRows(rows.filter((r) => r.market === market));

  return (
    <section className="rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] px-5 py-5">
      <div className="flex items-start justify-between gap-4">{header}</div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">
          Rankings are being computed. Check back soon.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setMarket("all")}
              className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${
                market === "all"
                  ? "text-[var(--color-text)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              Best available
            </button>
            {markets.map((m) => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  market === m
                    ? "text-[var(--color-text)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {MARKET_LABELS[m] ?? m}
              </button>
            ))}
          </div>

          <ol className="mt-3 divide-y divide-[var(--color-border)]">
            {shown.map((row, i) => {
              const view = buildEdgeView(row);
              const h = headline(row);
              const word = VERDICT_WORDS[view.verdict.label] ?? view.verdict.label;
              return (
                <li
                  key={`${row.capper_id}-${row.market}`}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5"
                >
                  <span className="w-6 shrink-0 text-right text-sm tabular-nums text-[var(--color-text-muted)]">
                    {i + 1}
                  </span>
                  <span className="min-w-0 font-bold text-[var(--color-text)]">
                    {row.handle ? (
                      <Link href={`/cappers/${row.handle}`} className="hover:underline">
                        {row.handle}
                      </Link>
                    ) : (
                      (row.display_name ?? `capper ${row.capper_id}`)
                    )}
                  </span>
                  {market === "all" && (
                    <span className="text-xs text-[var(--color-text-soft)]">
                      {MARKET_LABELS[row.market] ?? row.market}
                    </span>
                  )}
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider ${toneCls(view.verdict.tone)}`}
                  >
                    {word}
                  </span>
                  <span className="ml-auto flex items-baseline gap-x-3">
                    {h && (
                      <span className="text-sm">
                        <span className="font-bold text-[var(--color-text)]">{h.value}</span>{" "}
                        <span className="text-[var(--color-text-muted)]">{h.label}</span>
                      </span>
                    )}
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {row.n_decided} picks · {row.tracked_days ?? "?"}d
                    </span>
                    <MarketTailToggle capperId={row.capper_id} market={row.market} />
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
