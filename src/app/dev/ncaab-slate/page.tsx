// Run: NEXT_PUBLIC_NCAAB_FIXTURES=true npm run dev, then open /dev/ncaab-slate
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { LeagueChip } from "@/components/ui/LeagueChips";
import { FixtureChips } from "./FixtureChips";
import { NcaabSlateView } from "@/components/slate/NcaabSlateView";
import { SportTint } from "@/components/ui/SportTint";
import { leagueName } from "@/lib/public-leagues";
import { NCAAB_FIXTURE_GAMES } from "./fixture";

/* Design sign-off aid: the NCAAB slate from a hard-coded payload. Not linked,
   not in the sitemap, noindex, and a 404 unless the fixtures flag is set. The
   chip row is drawn from ALL_LEAGUES here only so the NCAAB state can be seen
   while NCAAB is absent from PUBLIC_LEAGUES. */
export const metadata: Metadata = {
  title: "TailSlips",
  robots: { index: false, follow: false },
};

export default function NcaabSlateFixturePage() {
  // Never in production, even if the flag leaks into a prod env.
  if (process.env.NEXT_PUBLIC_NCAAB_FIXTURES !== "true" || process.env.VERCEL_ENV === "production") notFound();
  const games = NCAAB_FIXTURE_GAMES;
  const withPicks = games.filter((g) => g.picks.length > 0);
  const picks = games.reduce((n, g) => n + g.picks.length, 0);
  const chips: LeagueChip[] = (["nfl", "nba", "ncaab", "mlb"] as const).map((l) => ({
    value: l,
    label: leagueName(l),
    league: l,
    caption: l === "ncaab" ? "Tonight" : l === "nfl" ? "Weekly board" : "Daily board",
  }));
  return (
    <>
      <SportTint sport="ncaab" />
      <main className="max-w-[1400px] mx-auto px-4 sm:px-7 pb-24">
        <div className="pt-8 sm:pt-10 max-w-[520px]">
          <FixtureChips chips={chips} />
        </div>
        <header className="pt-8 pb-3">
          <h1 className="text-[44px] font-extrabold tracking-[-0.03em] leading-[1]">Tonight&apos;s slate</h1>
          <p className="text-[13px] text-[var(--color-text-muted)] font-medium tabular-nums mt-3">
            {withPicks.length} of {games.length} games have picks · {picks} picks on the board
          </p>
          <p className="text-[12px] text-[var(--color-text-muted)] font-medium mt-2 max-w-[640px]">
            Games are ranked by how many sharps are on them. Lines are Pinnacle&apos;s main line; the numbers are sharps on each side. Tap a game to see every pick.
          </p>
        </header>
        <div className="mt-2">
          <NcaabSlateView games={games} />
        </div>
      </main>
    </>
  );
}
