import { TopNav } from "@/components/nav/TopNav";
import { GameBlock } from "@/components/slate/GameBlock";
import { MostPickedStrip } from "@/components/slate/MostPickedStrip";
import { QuietGameStrip } from "@/components/slate/QuietGameStrip";
import { PickMixBar } from "@/components/slate/PickMixBar";
import { DateToggle } from "@/components/slate/DateToggle";
import { fetchSlate } from "@/lib/api";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export const metadata = {
  title: "Slate · Capwatch",
  description:
    "Tonight's MLB slate. What every tracked sharp is betting, ranked by leaderboard, grouped by game.",
};

export default async function SlatePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const dateParam: "today" | "tomorrow" =
    sp.date === "tomorrow" ? "tomorrow" : "today";
  const data = await fetchSlate(dateParam);

  const allPicks = data.games.flatMap((g) => g.picks);
  const totalPicks = allPicks.length;
  const gamesWithPicks = data.games.filter((g) => g.picks.length > 0);
  const gamesWithoutPicks = data.games.filter((g) => g.picks.length === 0);
  const uniqueSharps = new Set(allPicks.map((p) => p.capper_id)).size;

  const summaryLine = totalPicks === 0
    ? `${data.games.length} games on the board, no picks tweeted yet`
    : `${uniqueSharps} ${uniqueSharps === 1 ? "sharp" : "sharps"} weighing in on ${gamesWithPicks.length} ${gamesWithPicks.length === 1 ? "game" : "games"} · ${totalPicks} ${totalPicks === 1 ? "pick" : "picks"} pending`;

  return (
    <>
      <TopNav />
      <main className="max-w-[1240px] mx-auto px-7 pb-16">
        <header className="pt-10 pb-7 flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.20em] text-[var(--color-text-muted)] font-bold mb-2">
              Live slate
            </div>
            <h1 className="text-[36px] font-extrabold tracking-[-0.025em] leading-none">
              {dateParam === "today" ? "Tonight's slate" : "Tomorrow's slate"}
            </h1>
            <p className="text-[13px] text-[var(--color-text-soft)] font-medium mt-2">
              {summaryLine}
              {gamesWithoutPicks.length > 0 && totalPicks > 0 && (
                <span className="opacity-60"> · {gamesWithoutPicks.length} quiet</span>
              )}
            </p>
            <PickMixBar picks={allPicks} />
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
              <div className="mt-3 flex flex-col gap-1.5">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] font-bold pl-1 mb-1">
                  Quiet games · no picks tweeted yet
                </div>
                {gamesWithoutPicks.map((g) => (
                  <QuietGameStrip key={g.game_id} game={g} />
                ))}
              </div>
            )}
          </div>
        )}

        <footer className="flex items-center justify-between py-7 pb-2 mt-6 text-xs text-[var(--color-text-muted)] font-medium">
          <div>Picks refresh every 60 seconds. Outcomes hit the leaderboard once games are graded.</div>
        </footer>
      </main>
    </>
  );
}
