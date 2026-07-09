"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { buildEdgeView, toneCls, VERDICT_WORDS, type EdgeRow } from "@/lib/edges";
import { VipTeaser } from "@/components/capper/VipTeaser";
import { MarketTailToggle } from "@/components/capper/MarketTailToggle";

interface ClvSummary {
  beatPct: number | null;
  avg: number | null;
  n: number | null;
}

function VipGem() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3h12l4 6-10 12L2 9z" />
      <path d="M2 9h20" />
      <path d="M12 3l-2 6 2 12 2-12-2-6" />
    </svg>
  );
}

export function VipEdgesPanel({ capperId, clv }: { capperId: number; clv: ClvSummary }) {
  const { entitlements } = useAuth();
  const supabase = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? createBrowserSupabase()
        : null,
    []
  );
  const [rows, setRows] = useState<EdgeRow[] | null>(null);

  useEffect(() => {
    if (!supabase || !entitlements.isVip) return;
    supabase
      .from("capper_market_edges")
      .select(
        "market,n_decided,roi_pct,xroi_pct,clv_beat_pct,clv_avg_cents,clv_n,tracked_days,gate_pass,gate_reasons,originator,tail_at_close_roi"
      )
      .eq("capper_id", capperId)
      .order("n_decided", { ascending: false })
      .then(({ data }) => setRows((data as EdgeRow[]) ?? []));
  }, [entitlements.isVip, capperId, supabase]);

  if (!entitlements.isVip) return <VipTeaser />;

  return (
    <section className="rounded-2xl border border-[rgba(245,197,74,0.22)] bg-gradient-to-b from-[rgba(245,197,74,0.07)] via-[rgba(245,197,74,0.025)] to-[rgba(255,255,255,0.02)] px-5 py-5">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-gold)]">
        <VipGem />
        VIP · Skill vs. luck breakdown
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-text-soft)]">
        We grade every market against the closing line. Beat that number and it is skill. Win
        without it and it is luck. Luck runs out.{" "}
        <Link href="/methodology" className="underline hover:text-[var(--color-text)]">
          Full method
        </Link>
      </p>
      {clv.n != null && clv.n > 0 && clv.beatPct != null && (
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Beats the close
          </span>
          <span className="text-[17px] font-extrabold tabular-nums text-[var(--color-text)]">
            {/* allTimeAgg clv_beat_pct is fractional 0..1; edge rows' clv_beat_pct is already percent */}
            {Math.round(clv.beatPct * 100)}%
          </span>
          <span className="text-[11px] tabular-nums text-[var(--color-text-muted)]">
            of {clv.n} priced picks
          </span>
        </div>
      )}
      {rows === null && (
        <p className="mt-3 py-2 text-sm text-[var(--color-text-muted)]">Loading...</p>
      )}
      {rows?.length === 0 && (
        <p className="mt-3 py-2 text-sm text-[var(--color-text-muted)]">
          Not enough graded picks yet for a market breakdown.
        </p>
      )}
      {rows && rows.length > 0 && <ScoutReport rows={rows} capperId={capperId} />}
    </section>
  );
}

const VERDICT_RANK: Record<string, number> = {
  "HOLDS UP": 0,
  ORIGINATOR: 1,
  UNLUCKY: 2,
  "LUCK SO FAR": 3,
  VARIANCE: 3,
  LOSING: 3,
  MARGINAL: 4,
  "TOO EARLY": 5,
};

/* Stat-band-style table: tiny uppercase column labels, tabular numbers,
   verdict as one plain colored word. The full sentence survives as a
   hover title only. */
function ScoutReport({ rows, capperId }: { rows: EdgeRow[]; capperId: number }) {
  const views = rows
    .map((r) => ({ row: r, view: buildEdgeView(r) }))
    .sort((a, b) => {
      const ra = VERDICT_RANK[a.view.verdict.label] ?? 3;
      const rb = VERDICT_RANK[b.view.verdict.label] ?? 3;
      if (ra !== rb) return ra - rb;
      return b.row.n_decided - a.row.n_decided;
    });

  return (
    <div className="mt-4">
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-5 items-baseline border-b border-[var(--color-border)] pb-1.5 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
        <span>Market</span>
        <span className="text-right">ROI</span>
        <span className="text-right">By closing odds</span>
        <span className="text-right w-16">Verdict</span>
        <span className="text-right w-14">Tail</span>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {views.map(({ row, view: f }) => (
          <div
            key={row.market}
            title={f.sentence}
            className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-5 items-baseline py-2.5 transition-colors hover:bg-white/[0.02]"
          >
            <div className="min-w-0">
              <span className="text-sm font-semibold text-[var(--color-text)] truncate">
                {f.label}
              </span>
              <span className="ml-2 text-[11px] tabular-nums text-[var(--color-text-muted)]">
                {row.n_decided}
              </span>
            </div>
            <span className="text-right text-[15px] font-semibold tabular-nums text-[var(--color-text)]">
              {f.roi.replace(" ROI", "")}
            </span>
            <span className="text-right text-[15px] font-semibold tabular-nums text-[var(--color-text-soft)]">
              {row.originator && row.tail_at_close_roi !== null
                ? `${row.tail_at_close_roi > 0 ? "+" : ""}${row.tail_at_close_roi.toFixed(1)}%`
                : row.xroi_pct !== null
                  ? `${row.xroi_pct > 0 ? "+" : ""}${row.xroi_pct.toFixed(1)}%`
                  : row.clv_n > 0 && row.clv_beat_pct !== null
                    ? `${Math.round(row.clv_beat_pct)}% beat`
                    : "n/a"}
            </span>
            <span
              className={`text-right w-16 text-xs font-bold lowercase ${toneCls(f.verdict.tone)}`}
            >
              {VERDICT_WORDS[f.verdict.label] ?? f.verdict.label.toLowerCase()}
            </span>
            <span className="text-right w-14">
              <MarketTailToggle capperId={capperId} market={row.market} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
