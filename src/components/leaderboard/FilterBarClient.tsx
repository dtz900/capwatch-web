"use client";
import { useRouter } from "next/navigation";
import { FilterButton } from "./FilterButton";
import type { LeaderboardFilters } from "@/lib/api";

export function FilterBarClient({ initial }: { initial: LeaderboardFilters }) {
  const router = useRouter();
  return (
    <FilterButton
      filters={initial}
      onChange={(next) => {
        const params = new URLSearchParams({
          window: next.window,
          sort: next.sort,
          min_picks: String(next.min_picks),
          active_only: String(next.active_only),
        });
        router.push(`/?${params}`);
      }}
    />
  );
}
