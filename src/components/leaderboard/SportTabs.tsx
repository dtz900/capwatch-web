"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { SportFilter } from "@/lib/types";
import { SportSlider, type SportStop } from "@/components/ui/SportSlider";

const STOPS: SportStop[] = [
  { value: "mlb", label: "MLB", icon: "baseball" },
  { value: "all", label: "All", icon: "both" },
  { value: "nfl", label: "NFL", icon: "football" },
];

/**
 * The league slider for the leaderboard and capper profiles: its own row
 * above the filter bar (the filters are per-view knobs; the sport is which
 * board you are on). Same URL mechanics as FilterBar: the sport rides on
 * ?sport= and every other filter is preserved.
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

  return (
    <div className="max-w-[440px]">
      <SportSlider stops={STOPS} value={current} onChange={onSelect} busy={isPending} />
    </div>
  );
}
