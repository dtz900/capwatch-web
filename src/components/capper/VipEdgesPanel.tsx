"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { buildEdgeView, type EdgeRow, type VerdictTone } from "@/lib/edges";
import { VipTeaser } from "@/components/capper/VipTeaser";

interface ClvSummary {
  beatPct: number | null;
  avg: number | null;
  n: number | null;
}

/* Plain-word verdicts. No pill chrome; the word and its color carry it. */
const VERDICT_WORDS: Record<string, string> = {
  "HOLDS UP": "real edge",
  "LUCK SO FAR": "luck",
  VARIANCE: "variance",
  LOSING: "losing",
  MARGINAL: "thin",
  "TOO EARLY": "too early",
};

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
        "market,n_decided,roi_pct,xroi_pct,clv_beat_pct,clv_avg_cents,clv_n,tracked_days,gate_pass,gate_reasons"
      )
      .eq("capper_id", capperId)
      .order("n_decided", { ascending: false })
      .then(({ data }) => setRows((data as EdgeRow[]) ?? []));
  }, [entitlements.isVip, capperId, supabase]);

  if (!entitlements.isVip) return <VipTeaser />;

  return (
    <section className="rounded-2xl border border-[rgba(245,197,74,0.22)] bg-gradient-to-b from-[rgba(245,197,74,0.07)] via-[rgba(245,197,74,0.025)] to-[rgba(255,255,255,0.02)] px-5 py-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-gold)]">
        VIP: skill vs. luck breakdown
      </div>
      <p className="mt-1 text-xs text-[var(--color-text-soft)]">
        Every market judged against closing odds, the sharpest public read of what a fair price
        is. Skilled bettors consistently get better numbers than the close; lucky ones just win
        for a while.{" "}
        <Link href="/methodology" className="underline hover:text-[var(--color-text)]">
          Full method
        </Link>
      </p>
      {clv.n != null && clv.n > 0 && clv.beatPct != null && (
        <div className="mt-3 text-sm text-[var(--color-text)]">
          Got a better number than the closing line on{" "}
          {/* allTimeAgg clv_beat_pct is fractional 0..1; edge rows' clv_beat_pct is already percent */}
          {Math.round(clv.beatPct * 100)}% of {clv.n} moneyline and run-line picks.
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
      {rows && rows.length > 0 && <ScoutReport rows={rows} />}
    </section>
  );
}

const toneCls = (tone: VerdictTone) =>
  tone === "pos"
    ? "text-[var(--color-pos)]"
    : tone === "neg"
      ? "text-[var(--color-neg)]"
      : "text-[var(--color-text-muted)]";

const VERDICT_RANK: Record<string, number> = {
  "HOLDS UP": 0,
  "LUCK SO FAR": 1,
  VARIANCE: 1,
  LOSING: 1,
  MARGINAL: 2,
  "TOO EARLY": 3,
};

/* Stat-band-style table: tiny uppercase column labels, tabular numbers,
   verdict as one plain colored word. The full sentence survives as a
   hover title only. */
function ScoutReport({ rows }: { rows: EdgeRow[] }) {
  const views = rows
    .map((r) => ({ row: r, view: buildEdgeView(r) }))
    .sort((a, b) => {
      const ra = VERDICT_RANK[a.view.verdict.label] ?? 2;
      const rb = VERDICT_RANK[b.view.verdict.label] ?? 2;
      if (ra !== rb) return ra - rb;
      return b.row.n_decided - a.row.n_decided;
    });

  return (
    <div className="mt-4">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-5 items-baseline border-b border-[var(--color-border)] pb-1.5 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
        <span>Market</span>
        <span className="text-right">ROI</span>
        <span className="text-right">By closing odds</span>
        <span className="text-right w-16">Verdict</span>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {views.map(({ row, view: f }) => (
          <div
            key={row.market}
            title={f.sentence}
            className="grid grid-cols-[1fr_auto_auto_auto] gap-x-5 items-baseline py-2.5"
          >
            <div className="min-w-0">
              <span className="text-sm font-semibold text-[var(--color-text)] truncate">
                {f.label}
              </span>
              <span className="ml-2 text-[11px] tabular-nums text-[var(--color-text-muted)]">
                {row.n_decided}
              </span>
            </div>
            <span className={`text-right text-[15px] font-bold tabular-nums ${toneCls(f.roiTone)}`}>
              {f.roi.replace(" ROI", "")}
            </span>
            <span className="text-right text-[15px] font-bold tabular-nums text-[var(--color-text-soft)]">
              {row.xroi_pct !== null
                ? `${row.xroi_pct > 0 ? "+" : ""}${row.xroi_pct.toFixed(1)}%`
                : row.clv_n > 0 && row.clv_beat_pct !== null
                  ? `${Math.round(row.clv_beat_pct)}% beat`
                  : "n/a"}
            </span>
            <span
              className={`text-right w-16 text-xs font-semibold lowercase ${toneCls(f.verdict.tone)}`}
            >
              {VERDICT_WORDS[f.verdict.label] ?? f.verdict.label.toLowerCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
