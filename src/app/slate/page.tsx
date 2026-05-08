import type { Metadata } from "next";
import { TopNav } from "@/components/nav/TopNav";
import { GameBlock } from "@/components/slate/GameBlock";
import { QuietGameStrip } from "@/components/slate/QuietGameStrip";
import { DateToggle } from "@/components/slate/DateToggle";
import { JsonLd } from "@/components/seo/JsonLd";
import { fetchSlate } from "@/lib/api";
import { breadcrumbNode } from "@/lib/jsonld";
import { SITE_NAME } from "@/lib/seo";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const dateParam: "today" | "tomorrow" = sp.date === "tomorrow" ? "tomorrow" : "today";
  const canonical = dateParam === "today" ? "/slate" : "/slate?date=tomorrow";
  const dayLabel = dateParam === "today" ? "Tonight's" : "Tomorrow's";

  let title = `${dayLabel} MLB slate`;
  let description = `${dayLabel} MLB slate. What every tracked sharp is betting, ranked by leaderboard, grouped by game.`;

  try {
    const data = await fetchSlate(dateParam);
    const totalPicks = data.games.reduce((s, g) => s + g.picks.length, 0);
    const sharpsCount = new Set(
      data.games.flatMap((g) => g.picks.map((p) => p.capper_id)),
    ).size;
    const gamesWithPicks = data.games.filter((g) => g.picks.length > 0).length;
    title = `${dayLabel} MLB slate · ${gamesWithPicks} games, ${totalPicks} picks from ${sharpsCount} sharps`;
    description = totalPicks > 0
      ? `${dayLabel} MLB slate on ${SITE_NAME}: ${totalPicks} picks from ${sharpsCount} tracked sharps across ${gamesWithPicks} games. Grouped by game, ranked by leaderboard performance.`
      : `${dayLabel} MLB slate on ${SITE_NAME}: ${data.games.length} games on the board, no picks tweeted yet. Check back as cappers post.`;
  } catch {
    // fall through with the static defaults above
  }

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website", siteName: SITE_NAME },
    twitter: { card: "summary_large_image", title, description, site: "@FadeAI_" },
  };
}

export const revalidate = 60;

export default async function SlatePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const dateParam: "today" | "tomorrow" =
    sp.date === "tomorrow" ? "tomorrow" : "today";

  let data: Awaited<ReturnType<typeof fetchSlate>> | null = null;
  let fetchError: string | null = null;
  try {
    data = await fetchSlate(dateParam);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
  }

  if (fetchError || !data) {
    return (
      <>
        <TopNav />
        <main className="max-w-[920px] mx-auto px-4 sm:px-7 pb-24">
          <header className="pt-12 pb-3">
            <h1 className="text-[44px] font-extrabold tracking-[-0.03em] leading-[1]">
              {dateParam === "today" ? "Tonight's slate" : "Tomorrow's slate"}
            </h1>
          </header>
          <div className="text-center py-16 text-[13px] text-[var(--color-text-muted)]">
            Slate is temporarily unavailable. Refresh in a moment.
          </div>
        </main>
      </>
    );
  }

  const allPicks = data.games.flatMap((g) => g.picks);
  const totalPicks = allPicks.length;
  const gamesWithPicks = data.games.filter((g) => g.picks.length > 0);
  const gamesWithoutPicks = data.games.filter((g) => g.picks.length === 0);
  const uniqueSharps = new Set(allPicks.map((p) => p.capper_id)).size;
  const totalGames = data.games.length;
  const ds = data.day_summary;
  const totalUnits = ds.graded_count + ds.pending_count;

  const summaryLine = (() => {
    if (totalPicks === 0) {
      return `${totalGames} games on the board, no picks tweeted yet`;
    }
    const sharps = `${uniqueSharps} ${uniqueSharps === 1 ? "sharp" : "sharps"}`;
    if (ds.graded_count === 0) {
      return `${sharps} · ${gamesWithPicks.length} live ${gamesWithPicks.length === 1 ? "game" : "games"} · ${totalUnits} pending`;
    }
    const sign = ds.net_units > 0 ? "+" : "";
    const fixed = ds.net_units.toFixed(2);
    let record = `${ds.wins}-${ds.losses}`;
    if (ds.pushes > 0) record += `-${ds.pushes}`;
    if (ds.voids > 0) record += ` · ${ds.voids} void`;
    if (ds.pending_count === 0) {
      return `${sharps} · ${ds.graded_count} graded · ${record} · ${sign}${fixed}u`;
    }
    return `${sharps} · ${ds.graded_count} graded (${record}, ${sign}${fixed}u) · ${ds.pending_count} pending`;
  })();

  return (
    <>
      <JsonLd
        data={breadcrumbNode([
          { name: "Home", path: "/" },
          { name: "Slate", path: "/slate" },
        ])}
      />
      <TopNav />
      <main className="max-w-[920px] mx-auto px-4 sm:px-7 pb-24">
        <header className="pt-12 pb-3 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[44px] font-extrabold tracking-[-0.03em] leading-[1]">
              {dateParam === "today" ? "Tonight's slate" : "Tomorrow's slate"}
            </h1>
            <p className="text-[13px] text-[var(--color-text-muted)] font-medium mt-3 tabular-nums">
              {summaryLine}
            </p>
          </div>
          <DateToggle current={dateParam} />
        </header>

        {data.games.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="text-[14px] font-semibold text-[var(--color-text-soft)] mb-1">
              No MLB games on the slate.
            </div>
            <div className="text-[12px] text-[var(--color-text-muted)]">
              Check back when games are scheduled.
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-5 mt-2">
              {gamesWithPicks.map((g) => (
                <GameBlock key={g.game_id} game={g} />
              ))}
            </div>
            {gamesWithoutPicks.length > 0 && (
              <div className="mt-10 pt-6 border-t border-[rgba(255,255,255,0.06)]">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold mb-2">
                  Quiet · {gamesWithoutPicks.length} {gamesWithoutPicks.length === 1 ? "game" : "games"} with no picks tweeted
                </div>
                <div className="flex flex-col">
                  {gamesWithoutPicks.map((g) => (
                    <QuietGameStrip key={g.game_id} game={g} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <footer className="mt-16 text-[11px] text-[var(--color-text-muted)] font-medium">
          Picks refresh every 60 seconds. Outcomes hit the leaderboard once games are graded.
        </footer>
      </main>
    </>
  );
}
