"use client";
import { useMemo, useState } from "react";
import type { CapperRow, TodayPickEntry } from "@/lib/types";
import type { EdgeRow } from "@/lib/edges";
import { StableCard } from "@/components/my-tails/StableCard";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

export function StableGrid({
  initial,
  todayByCapper = {},
  scopesByCapper = {},
  edgesByCapper = {},
}: {
  initial: CapperRow[];
  todayByCapper?: Record<string, TodayPickEntry[]>;
  scopesByCapper?: Record<string, string[]>;
  edgesByCapper?: Record<string, EdgeRow[]>;
}) {
  const [rows, setRows] = useState(initial);
  const [scopes, setScopes] = useState(scopesByCapper);
  const { session } = useAuth();
  const supabase = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? createBrowserSupabase()
        : null,
    []
  );

  async function untail(capperId: string) {
    if (!supabase || !session?.user?.id) return;
    const prevRows = rows;
    const prevScopes = scopes;
    setRows(rows.filter((r) => r.capper_id !== capperId));
    if (scopes[capperId]) {
      const nextScopes = { ...scopes };
      delete nextScopes[capperId];
      setScopes(nextScopes);
    }
    // No market filter: removes the whole-capper row and any scoped rows.
    const { error } = await supabase
      .from("capper_follows")
      .delete()
      .eq("user_id", session.user.id)
      .eq("capper_id", Number(capperId));
    if (error) {
      setRows(prevRows);
      setScopes(prevScopes);
    }
  }

  async function untailMarket(capperId: string, market: string) {
    if (!supabase || !session?.user?.id) return;
    const prevRows = rows;
    const prevScopes = scopes;
    const remaining = (scopes[capperId] ?? []).filter((m) => m !== market);
    const nextScopes = { ...scopes };
    if (remaining.length === 0) {
      setRows(rows.filter((r) => r.capper_id !== capperId));
      delete nextScopes[capperId];
    } else {
      nextScopes[capperId] = remaining;
    }
    setScopes(nextScopes);
    const { error } = await supabase
      .from("capper_follows")
      .delete()
      .eq("user_id", session.user.id)
      .eq("capper_id", Number(capperId))
      .eq("market", market);
    if (error) {
      setRows(prevRows);
      setScopes(prevScopes);
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {rows.map((c) => (
        <StableCard
          key={c.capper_id}
          capper={c}
          onUntail={() => untail(String(c.capper_id))}
          todayPicks={todayByCapper[String(c.capper_id)] ?? []}
          scopes={scopes[String(c.capper_id)] ?? []}
          scopeEdges={edgesByCapper[String(c.capper_id)] ?? []}
          onUntailMarket={(m) => untailMarket(String(c.capper_id), m)}
        />
      ))}
    </div>
  );
}
