"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { SlateSport } from "@/lib/api";
import { SportSlider, type SportStop } from "@/components/ui/SportSlider";

/**
 * The big league slider at the top of the slate. Drives `?sport=nfl` the same
 * way DateToggle drives `?date=`; switching leagues drops the date/week params
 * because MLB is a daily board and the NFL board is a week.
 */
export function SportToggle({
  current,
  mlbCaption,
  nflCaption,
}: {
  current: SlateSport;
  mlbCaption: string;
  nflCaption: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const stops: SportStop[] = [
    { value: "mlb", label: "MLB", icon: "baseball" },
    { value: "nfl", label: "NFL", icon: "football" },
  ];

  const onSelect = (value: string) => {
    if (value === current) return;
    const params = new URLSearchParams(sp?.toString() ?? "");
    params.delete("date");
    params.delete("week");
    if (value === "mlb") params.delete("sport");
    else params.set("sport", value);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/slate?${qs}` : "/slate");
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <SportSlider
        stops={stops}
        value={current}
        onChange={onSelect}
        size="lg"
        ariaLabel="League"
        busy={isPending}
      />
      <div className="grid grid-cols-2 text-center text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-muted)]">
        <span>{mlbCaption}</span>
        <span>{nflCaption}</span>
      </div>
    </div>
  );
}
