"use client";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatEdgeRow, type EdgeRow } from "@/lib/edges";
import { VipTeaser } from "@/components/capper/VipTeaser";

interface ClvSummary {
  beatPct: number | null;
  avg: number | null;
  n: number | null;
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
        "market,n_decided,roi_pct,xroi_pct,clv_beat_pct,clv_avg_cents,clv_n,tracked_days,gate_pass,gate_reasons"
      )
      .eq("capper_id", capperId)
      .order("n_decided", { ascending: false })
      .then(({ data }) => setRows((data as EdgeRow[]) ?? []));
  }, [entitlements.isVip, capperId, supabase]);

  if (!entitlements.isVip) return <VipTeaser />;

  return (
    <section className="rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] px-5 py-5">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
        VIP: de-lucked market breakdown
      </div>
      <p className="mt-1 text-xs text-[var(--color-text-soft)]">
        Which parts of this record hold up when luck is stripped out. Not betting advice.
      </p>
      {clv.n != null && clv.n > 0 && clv.beatPct != null && (
        <div className="mt-3 text-sm text-[var(--color-text)]">
          Closing line value: beat the close on{" "}
          {/* allTimeAgg clv_beat_pct is fractional 0..1; edge rows' clv_beat_pct is already percent */}
          {Math.round(clv.beatPct * 100)}% of {clv.n} ML and run-line picks
        </div>
      )}
      <div className="mt-3 divide-y divide-[var(--color-border)]">
        {rows === null && (
          <p className="py-2 text-sm text-[var(--color-text-muted)]">Loading...</p>
        )}
        {rows?.length === 0 && (
          <p className="py-2 text-sm text-[var(--color-text-muted)]">
            Not enough graded picks yet for a market breakdown.
          </p>
        )}
        {rows?.map((r) => {
          const f = formatEdgeRow(r);
          return (
            <div key={r.market} className="flex items-center justify-between py-2 text-sm">
              <div>
                <span className="text-[var(--color-text)] font-semibold">{f.label}</span>
                <span className="ml-2 text-xs text-[var(--color-text-muted)]">{f.trust}</span>
                {!r.gate_pass && r.gate_reasons.length > 0 && (
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {r.gate_reasons.join("; ")}
                  </div>
                )}
              </div>
              <div className="text-right tabular-nums">
                <div className={r.roi_pct != null && r.roi_pct > 0 ? "text-[var(--color-pos)]" : r.roi_pct != null && r.roi_pct < 0 ? "text-[var(--color-neg)]" : "text-[var(--color-text-soft)]"}>
                  {f.roi} ROI
                </div>
                <div className="text-xs text-[var(--color-text-soft)]">
                  {f.xroi} de-lucked, {f.clv}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
