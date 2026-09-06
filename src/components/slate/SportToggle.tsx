"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { SlateSport } from "@/lib/api";
import { LeagueChips, type LeagueChip } from "@/components/ui/LeagueChips";

/**
 * The league chips at the top of the slate. Drive `?sport=nfl` the same way
 * DateToggle drives `?date=`; switching leagues drops the date/week params
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

  const chips: LeagueChip[] = [
    { value: "mlb", label: "MLB", league: "mlb", caption: mlbCaption },
    { value: "nfl", label: "NFL", league: "nfl", caption: nflCaption },
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
    <LeagueChips chips={chips} value={current} onChange={onSelect} size="lg" ariaLabel="League" busy={isPending} />
  );
}
