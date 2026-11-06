"use client";

import { LeagueChips, type LeagueChip } from "@/components/ui/LeagueChips";

/** Static league row for the fixture page (a server page cannot hand LeagueChips a handler). */
export function FixtureChips({ chips }: { chips: LeagueChip[] }) {
  return <LeagueChips chips={chips} value="ncaab" onChange={() => {}} size="lg" ariaLabel="League" />;
}
