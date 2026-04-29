import { TopNav } from "@/components/nav/TopNav";
import { GameBlock } from "@/components/slate/GameBlock";
import { MostPickedStrip } from "@/components/slate/MostPickedStrip";
import { DateToggle } from "@/components/slate/DateToggle";
import { fetchSlate } from "@/lib/api";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export const metadata = {
  title: "Slate · Capwatch",
  description: "Tonight's MLB slate. What every tracked capper is betting, grouped by game.",
};

export default async function SlatePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const dateParam: "today" | "tomorrow" =
    sp.date === "tomorrow" ? "tomorrow" : "today";
  const data = await fetchSlate(dateParam);

  const totalPicks = data.games.reduce((sum, g) => sum + g.picks.length, 0);
  const gamesWithPicks = data.games.filter((g) => g.picks.length > 0);
  const gamesWithoutPicks = data.games.filter((g) => g.picks.length === 0);

  return (
    <>
      <TopNav />
      <main className="max-w-[1240px] mx-auto px-7 pb-16">
        <header className="pt-10 pb-7 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.20em] text-[var(--color-text-muted)] font-bold mb-2">
              Live slate
            </div>
            <h1 className="text-[36px] font-extrabold tracking-[-0.025em] leading-none">
              {dateParam === "today" ? "Tonight's slate" : "Tomorrow's slate"}
            </h1>
            <p className="text-[13px] text-[var(--color-text-soft)] font-medium mt-2">
              {totalPicks} pending {totalPicks === 1 ? "pick" : "picks"} across{" "}
              {gamesWithPicks.length} {gamesWithPicks.length === 1 ? "game" : "games"}
              {gamesWithoutPicks.length > 0 && (
                <span className="opacity-60"> · {gamesWithoutPicks.length} quiet</span>
              )}
            </p>
          </div>
          <DateToggle current={dateParam} />
        </header>

        <MostPickedStrip items={data.most_picked} />

        {data.games.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-5 py-12 text-center">
            <div className="text-[14px] font-semibold text-[var(--color-text-soft)] mb-1">
              No MLB games on the slate.
            </div>
            <div className="text-[12px] text-[var(--color-text-muted)]">
              Check back when games are scheduled.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {gamesWithPicks.map((g) => (
              <div key={g.game_id} id={`game-${g.game_id}`}>
                <GameBlock game={g} />
              </div>
            ))}
            {gamesWithoutPicks.length > 0 && (
              <details className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-5 py-4">
                <summary className="cursor-pointer text-[12px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold">
                  {gamesWithoutPicks.length} quiet {gamesWithoutPicks.length === 1 ? "game" : "games"} (no picks tweeted)
                </summary>
                <div className="mt-3 flex flex-col gap-3">
                  {gamesWithoutPicks.map((g) => (
                    <div key={g.game_id} id={`game-${g.game_id}`}>
                      <GameBlock game={g} />
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        <footer className="flex items-center justify-between py-7 pb-2 mt-6 text-xs text-[var(--color-text-muted)] font-medium">
          <div>Picks refresh every 60 seconds. Outcomes appear on the Leaderboard once games are graded.</div>
        </footer>
      </main>
    </>
  );
}
