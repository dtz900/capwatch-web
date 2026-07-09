"use client";
import { useMemo, useState } from "react";
import type { CapperRow, TodayPickEntry } from "@/lib/types";
import { StableCard } from "@/components/my-tails/StableCard";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

export function StableGrid({
  initial,
  todayByCapper = {},
}: {
  initial: CapperRow[];
  todayByCapper?: Record<string, TodayPickEntry[]>;
}) {
  const [rows, setRows] = useState(initial);
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
    const prev = rows;
    setRows(rows.filter((r) => r.capper_id !== capperId));
    const { error } = await supabase
      .from("capper_follows")
      .delete()
      .eq("user_id", session.user.id)
      .eq("capper_id", Number(capperId));
    if (error) setRows(prev);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {rows.map((c) => (
        <StableCard
          key={c.capper_id}
          capper={c}
          onUntail={() => untail(c.capper_id)}
          todayPicks={todayByCapper[String(c.capper_id)] ?? []}
        />
      ))}
    </div>
  );
}
