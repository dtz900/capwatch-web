"use client";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import type { EdgeRow } from "@/lib/edges";
import { VipTeaser } from "@/components/capper/VipTeaser";
import { DossierReveal } from "@/components/capper/DossierReveal";
import { VipDossier } from "@/components/capper/VipDossier";

interface ClvSummary {
  beatPct: number | null;
  avg: number | null;
  n: number | null;
}

/* The VIP section is a confidential scout report: a closed cream folder on
   the page that spins open into the full dossier (VipDossier). Data comes
   from the nightly capper_market_edges table; no live compute here. */
export function VipEdgesPanel({
  capperId,
  handle = "",
  clv,
}: {
  capperId: number;
  handle?: string;
  clv: ClvSummary;
}) {
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
        "market,n_decided,roi_pct,xroi_pct,clv_beat_pct,clv_avg_cents,clv_n,tracked_days,gate_pass,gate_reasons,originator,tail_at_close_roi,pnl_units,x_actual_pnl_units,x_pnl_units,x_n,roi_30d,xroi_30d,n_30d,x_n_30d,median_lead_minutes"
      )
      .eq("capper_id", capperId)
      .order("n_decided", { ascending: false })
      .then(({ data }) => setRows((data as EdgeRow[]) ?? []));
  }, [entitlements.isVip, capperId, supabase]);

  if (!entitlements.isVip) return <VipTeaser />;
  if (rows === null) {
    return <p className="py-2 text-sm text-[var(--color-text-muted)]">Loading...</p>;
  }
  if (rows.length === 0) {
    return (
      <p className="py-2 text-sm text-[var(--color-text-muted)]">
        Not enough graded picks yet for a scout report.
      </p>
    );
  }
  return (
    <DossierReveal handle={handle}>
      <VipDossier rows={rows} capperId={capperId} handle={handle} beatPct={clv.beatPct} />
    </DossierReveal>
  );
}
