"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { buildEdgeView, MARKET_LABELS, VERDICT_WORDS, toneCls } from "@/lib/edges";
import { CapperAvatar } from "@/components/leaderboard/CapperAvatar";
import { XIcon } from "@/components/icons/XIcon";
import { MarketTailToggle } from "@/components/capper/MarketTailToggle";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  fmtPct,
  headline,
  marketsPresent,
  rankRows,
  type RankedEdgeRow,
} from "@/lib/marketRankings";

/* The master's crown follows the PUBLIC verdict, not the internal tail gate:
   edges.ts deliberately lets provenance-only gate failures (tracked days,
   half splits) still read "real edge", and a market cannot say NO MASTER
   while a row on screen says REAL EDGE. */
function holdsBeltVerdict(row: RankedEdgeRow): boolean {
  const label = buildEdgeView(row).verdict.label;
  return label === "HOLDS UP" || label === "ORIGINATOR";
}

/* The ranked (close-judged) number, or null when the row has no line data
   and fell back to raw ROI: then the expected column has nothing to add. */
function expectedValue(row: RankedEdgeRow): string | null {
  const h = headline(row);
  return h && h.label !== "ROI" ? h.value : null;
}

/* VIP discovery on My Tails: every market crowns a master, the top-ranked
   capper who survives the de-lucking (gate pass or originator). A market
   with no survivor has no master. Contenders run underneath in small print
   with their verdicts. The structure carries the methodology so the rows
   never have to. */
export function MarketRankings({ rows, vip }: { rows: RankedEdgeRow[]; vip: boolean }) {
  const { entitlements } = useAuth();

  const header = (
    <div>
      <h2 className="text-lg font-bold text-[var(--color-text)]">Market Masters</h2>
      <p className="mt-0.5 text-sm text-[var(--color-text-soft)]">
        One master per market: whoever holds up against closing lines, not raw
        profit. No survivor, no master.
      </p>
    </div>
  );

  if (!vip) {
    return (
      <section className="rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] px-5 py-5">
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-gold)]">VIP</div>
        <div className="mt-1">{header}</div>
        <p className="mt-2 text-sm text-[var(--color-text)]">
          See who actually runs every market, with a tail button on every row.
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

  return (
    <section className="rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] px-5 py-5">
      <div className="flex items-start justify-between gap-4">{header}</div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">
          Rankings are being computed. Check back soon.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {markets.map((m) => (
            <DivisionStrip
              key={m}
              market={m}
              rows={rankRows(rows.filter((r) => r.market === m))}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function roiTone(roi: number | null): "pos" | "neg" | "muted" {
  if (roi != null && roi > 0) return "pos";
  if (roi != null && roi < 0) return "neg";
  return "muted";
}

function CapperName({ row, className }: { row: RankedEdgeRow; className: string }) {
  return row.handle ? (
    <Link href={`/cappers/${row.handle}`} className={`${className} hover:underline`}>
      {row.handle}
    </Link>
  ) : (
    <span className={className}>{row.display_name ?? `capper ${row.capper_id}`}</span>
  );
}

function DivisionStrip({ market, rows }: { market: string; rows: RankedEdgeRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const label = MARKET_LABELS[market] ?? market;

  /* Collapsing a long contender list leaves the viewport stranded below the
     shrunken strip; snap back so the strip tops out under the sticky nav. */
  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    if (!next) {
      requestAnimationFrame(() => {
        stripRef.current?.scrollIntoView({ block: "nearest" });
      });
    }
  }

  const champ = rows.find(holdsBeltVerdict) ?? null;
  const contenders = rows.filter((r) => r !== champ);
  const shown = expanded ? contenders : contenders.slice(0, 3);

  return (
    <div
      ref={stripRef}
      className="scroll-mt-20 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
    >
      <div className="flex items-baseline justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--color-text)]">
          {label}
        </span>
        <span className="text-[11px] text-[var(--color-text-muted)]">
          {rows.length} contender{rows.length === 1 ? "" : "s"}
        </span>
      </div>

      {champ ? (
        <div className="flex items-center gap-3 px-4 py-3">
          <CapperAvatar url={champ.profile_image_url} handle={champ.handle} size={44} />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-gold)]">
              Market Master
            </div>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2.5">
              <CapperName
                row={champ}
                className="truncate text-xl font-bold text-[var(--color-text)]"
              />
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${toneCls(buildEdgeView(champ).verdict.tone)}`}
              >
                {VERDICT_WORDS[buildEdgeView(champ).verdict.label] ??
                  buildEdgeView(champ).verdict.label}
              </span>
              {champ.handle && (
                <a
                  href={`https://x.com/${champ.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${champ.handle} on X`}
                  className="inline-flex h-6 w-6 items-center justify-center self-center rounded-md bg-[rgba(255,255,255,0.04)] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
                >
                  <XIcon size={11} />
                </a>
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
              {champ.n_decided} picks · {champ.tracked_days ?? "?"}d tracked
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div
              className={`text-2xl font-bold tabular-nums leading-tight ${toneCls(roiTone(champ.roi_pct))}`}
            >
              {champ.roi_pct != null ? fmtPct(champ.roi_pct) : "n/a"}
            </div>
            {expectedValue(champ) && (
              <div className="text-[11px] text-[var(--color-text-muted)]">
                expected{" "}
                <span className="font-semibold text-[var(--color-text)]">
                  {expectedValue(champ)}
                </span>
              </div>
            )}
          </div>
          <MarketTailToggle capperId={champ.capper_id} market={champ.market} />
        </div>
      ) : (
        <div className="px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            No master yet
          </div>
          <div className="mt-0.5 text-sm text-[var(--color-text-soft)]">
            Nobody in this market beats the closing line yet.
          </div>
        </div>
      )}

      {contenders.length > 0 && (
        <>
          <div className="flex items-center border-t border-[var(--color-border)] px-4 py-1">
            <span className="ml-auto w-16 text-right text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Expected
            </span>
            <span className="w-16 text-right text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Actual
            </span>
            <span className="w-12 shrink-0" />
          </div>
          <ol className="border-t border-[var(--color-border)]">
            {shown.map((row, i) => {
              const view = buildEdgeView(row);
              const word = VERDICT_WORDS[view.verdict.label] ?? view.verdict.label;
              const exp = expectedValue(row);
              return (
                <li
                  key={row.capper_id}
                  className="flex items-center gap-2.5 border-b border-[var(--color-border)] px-4 py-1.5 last:border-b-0"
                >
                  <span className="w-4 shrink-0 text-right text-[11px] font-bold tabular-nums text-[var(--color-text-muted)]">
                    {i + (champ ? 2 : 1)}
                  </span>
                  <CapperName
                    row={row}
                    className="truncate text-[13px] font-bold text-[var(--color-text)]"
                  />
                  <span
                    className={`shrink-0 text-[10px] font-bold uppercase tracking-wider ${toneCls(view.verdict.tone)}`}
                  >
                    {word}
                  </span>
                  <span className="hidden sm:inline text-[11px] text-[var(--color-text-muted)]">
                    {row.n_decided} picks · {row.tracked_days ?? "?"}d
                  </span>
                  <span className="ml-auto w-16 shrink-0 text-right text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
                    {exp ?? "n/a"}
                  </span>
                  <span
                    className={`w-16 shrink-0 text-right text-[13px] font-bold tabular-nums ${toneCls(roiTone(row.roi_pct))}`}
                  >
                    {row.roi_pct != null ? fmtPct(row.roi_pct) : "n/a"}
                  </span>
                  <span className="flex w-12 shrink-0 justify-end">
                    <MarketTailToggle capperId={row.capper_id} market={row.market} />
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      )}

      {contenders.length > 3 && (
        <button
          onClick={toggleExpanded}
          className="w-full border-t border-[var(--color-border)] py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
        >
          {expanded ? "Fewer" : `All ${contenders.length} contenders`}
        </button>
      )}
    </div>
  );
}
