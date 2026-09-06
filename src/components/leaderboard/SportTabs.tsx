"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { SportFilter } from "@/lib/types";
import { LeagueChips, type LeagueChip } from "@/components/ui/LeagueChips";

const CHIPS: LeagueChip[] = [
  { value: "all", label: "All", league: "all" },
  { value: "mlb", label: "MLB", league: "mlb" },
  { value: "nfl", label: "NFL", league: "nfl" },
];

/**
 * League chips for the leaderboard and capper profiles: their own row above
 * the filter bar (the filters are per-view knobs; the league is which board
 * you are on). Same URL mechanics as FilterBar: the sport rides on ?sport=
 * and every other filter is preserved.
 */
export function SportTabs({ current, basePath = "/" }: { current: SportFilter; basePath?: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const onSelect = (value: string) => {
    if (value === current) return;
    const params = new URLSearchParams(sp?.toString() ?? "");
    params.set("sport", value);
    startTransition(() => {
      router.push(`${basePath}?${params.toString()}`);
    });
  };

  return <LeagueChips chips={CHIPS} value={current} onChange={onSelect} busy={isPending} />;
}
