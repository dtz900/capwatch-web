"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { SlateSport } from "@/lib/api";
import { tonightCaption, type TonightCounts } from "@/lib/slate-tonight";
import { slateSportParam } from "@/lib/slate-sport";
import { LeagueChips, type LeagueChip } from "@/components/ui/LeagueChips";

/**
 * The league chips at the top of the slate. Drive `?sport=nfl|nba` the same
 * way DateToggle drives `?date=`; switching leagues drops the date/week params
 * because MLB and NBA are daily boards and the NFL board is a week.
 *
 * `tonight` flags the leagues the visitor is NOT looking at: an unselected
 * chip with games still to play tonight swaps its caption for the count and
 * pulses a dot, so a visitor on one board knows the others are worth a look.
 */
export function SportToggle({
  current,
  mlbCaption,
  nflCaption,
  nbaCaption,
  tonight,
}: {
  current: SlateSport;
  mlbCaption: string;
  nflCaption: string;
  nbaCaption: string;
  tonight?: TonightCounts;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const chip = (value: SlateSport, label: string, caption: string): LeagueChip => {
    const n = tonight?.[value] ?? 0;
    const signal = value !== current && n > 0;
    return { value, label, league: value, caption: signal ? tonightCaption(n) : caption, signal };
  };

  const chips: LeagueChip[] = [
    chip("nfl", "NFL", nflCaption),
    chip("nba", "NBA", nbaCaption),
    chip("mlb", "MLB", mlbCaption),
  ];

  const onSelect = (value: string) => {
    if (value === current) return;
    const params = new URLSearchParams(sp?.toString() ?? "");
    params.delete("date");
    params.delete("week");
    const sportParam = slateSportParam(value as SlateSport);
    if (sportParam) params.set("sport", sportParam);
    else params.delete("sport");
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/slate?${qs}` : "/slate");
    });
  };

  return (
    <LeagueChips chips={chips} value={current} onChange={onSelect} size="lg" ariaLabel="League" busy={isPending} />
  );
}
