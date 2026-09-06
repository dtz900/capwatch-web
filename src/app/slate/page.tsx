import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { TopNav } from "@/components/nav/TopNav";
import { GameBlock } from "@/components/slate/GameBlock";
import { QuietGameStrip } from "@/components/slate/QuietGameStrip";
import { DateToggle } from "@/components/slate/DateToggle";
import { SportToggle } from "@/components/slate/SportToggle";
import { SportTint } from "@/components/ui/SportTint";
import { StandingsSection } from "@/components/slate/StandingsSection";
import { SlateRailStrip, SlateRailColumn } from "@/components/slate/SlateRail";
import { buildRailGames } from "@/lib/rail";
import { JsonLd } from "@/components/seo/JsonLd";
import { fetchSlate, fetchWeekStandings, withDeadline, type SlateSport } from "@/lib/api";
import { breadcrumbNode } from "@/lib/jsonld";
import { SITE_NAME } from "@/lib/seo";
import { ShareLinkButton } from "@/components/share/ShareLinkButton";
import { SportsbookAd } from "@/components/affiliate/SportsbookAd";
import { BETMGM_1940x500_FOOTBALL } from "@/lib/affiliates";
import type { SlateGame, SlateResponse } from "@/lib/types";
import { buildSlateOgFingerprint, slateBetCount } from "./_slate-og-renderer";

interface PageProps {
  searchParams: Promise<{
    date?: string;
    sport?: string;
    week?: string;
    v?: string;
    game?: string;
    name?: string;
    matchup?: string;
  }>;
}

type SlateParams = {
  sport: SlateSport;
  dateParam: "today" | "tomorrow";
  week: number | undefined;
};

function parseParams(sp: Awaited<PageProps["searchParams"]>): SlateParams {
  const sport: SlateSport = sp.sport === "nfl" ? "nfl" : "mlb";
  const dateParam: "today" | "tomorrow" = sp.date === "tomorrow" ? "tomorrow" : "today";
  const rawWeek = Number(sp.week);
  const week = sport === "nfl" && Number.isInteger(rawWeek) && rawWeek >= 1 && rawWeek <= 22 ? rawWeek : undefined;
  return { sport, dateParam, week };
}

function canonicalFor(p: SlateParams): string {
  const q = new URLSearchParams();
  if (p.sport === "nfl") {
    q.set("sport", "nfl");
    if (p.week != null) q.set("week", String(p.week));
  } else if (p.dateParam !== "today") {
    q.set("date", p.dateParam);
  }
  const qs = q.toString();
  return qs ? `/slate?${qs}` : "/slate";
}

/** "Week 1" / "Preseason Week 3" / "Wild Card" style label from the API meta. */
function weekLabel(data: SlateResponse | null, fallbackWeek: number | undefined): string {
  const w = data?.week;
  const n = w?.week ?? fallbackWeek;
  if (!n) return "NFL";
  if (w?.season_type === "pre") return `Preseason Week ${n}`;
  if (w?.season_type === "post") return `Playoffs Week ${n}`;
  return `Week ${n}`;
}

function fmtDay(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions): string | null {
  if (!iso) return null;
  try {
    // Kickoff dates are ET calendar days; anchor at noon UTC so the label
    // never rolls to the previous day in a western timezone.
    return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(new Date(`${iso}T12:00:00Z`));
  } catch {
    return null;
  }
}

function weekRange(data: SlateResponse | null): string | null {
  const start = fmtDay(data?.week?.start, { month: "short", day: "numeric" });
  const end = fmtDay(data?.week?.end, { month: "short", day: "numeric" });
  if (start && end && start !== end) return `${start} – ${end}`;
  return start ?? end;
}

/** Group games by ET kickoff day, preserving kickoff order within a day. */
function groupByDay(games: SlateGame[]): { day: string; label: string; games: SlateGame[] }[] {
  const out: { day: string; label: string; games: SlateGame[] }[] = [];
  for (const g of games) {
    const day = g.game_date ?? "";
    let bucket = out.find((b) => b.day === day);
    if (!bucket) {
      bucket = {
        day,
        label: fmtDay(day, { weekday: "long", month: "short", day: "numeric" }) ?? "TBD",
        games: [],
      };
      out.push(bucket);
    }
    bucket.games.push(g);
  }
  return out;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const p = parseParams(sp);
  const canonical = canonicalFor(p);
  const isNfl = p.sport === "nfl";
  const dayLabel = p.dateParam === "today" ? "Tonight's" : "Tomorrow's";

  let title = isNfl ? "This week's NFL slate" : `${dayLabel} MLB slate`;
  let description = isNfl
    ? "This week's NFL slate. What every tracked sharp is betting, ranked by leaderboard, grouped by game."
    : `${dayLabel} MLB slate. What every tracked sharp is betting, ranked by leaderboard, grouped by game.`;

  // Deadline, not just try/catch: Twitterbot caches "no card" for any URL
  // whose HTML takes longer than its ~4-5s scrape budget, and a cold slate
  // API response alone can eat that. Static defaults ship on expiry while the
  // real fetch keeps warming the cache for the next hit. The description
  // fetch and the fingerprint (which has its own internal deadlines) run
  // CONCURRENTLY so the worst case stays ~1.5s, not the sum of the races.
  const fpPromise = buildSlateOgFingerprint(p.dateParam, p.sport);
  try {
    const data = await withDeadline<SlateResponse | null>(
      fetchSlate(p.dateParam, p.sport, p.week),
      1500,
      null,
    );
    if (data) {
      const lead = isNfl ? `${weekLabel(data, p.week)} NFL slate` : `${dayLabel} MLB slate`;
      // Bets, not rows: parlay legs are separate rows in the slate payload
      // and would overstate the count (see slateBetCount).
      const totalPicks = slateBetCount(data.games.flatMap((g) => g.picks));
      const sharpsCount = new Set(
        data.games.flatMap((g) => g.picks.map((pk) => pk.capper_id)),
      ).size;
      const gamesWithPicks = data.games.filter((g) => g.picks.length > 0).length;
      title = `${lead} · ${gamesWithPicks} games, ${totalPicks} picks from ${sharpsCount} sharps`;
      description = totalPicks > 0
        ? `${lead} on ${SITE_NAME}: ${totalPicks} picks from ${sharpsCount} tracked sharps across ${gamesWithPicks} games. Grouped by game, ranked by leaderboard performance.`
        : `${lead} on ${SITE_NAME}: ${data.games.length} games on the board, no picks tweeted yet. Check back as cappers post.`;
    }
  } catch {
    // fall through with the static defaults above
  }

  // X caches the OG card per share URL and cards-dev.twitter.com/validator
  // was retired, so the only way to force a fresh scrape is to change the
  // og:image URL itself. Fingerprint with the ET slate day plus the live
  // pick volume / sharps / season grading counter; any of those moving
  // produces a new URL that X is forced to re-fetch. OG_CARD_VERSION stays
  // as a manual escape hatch for layout-only redesigns where the data
  // hasn't changed but we still want X to refresh.
  const OG_CARD_VERSION = "17"; // bump on any _slate-og-renderer.tsx redesign
  const fp = await fpPromise;
  const ogQs = new URLSearchParams();
  ogQs.set("date", p.dateParam);
  if (isNfl) ogQs.set("sport", "nfl");
  // ?game=AWAY-HOME (or a game_id) features that matchup on the OG card;
  // omitted, the card falls back to the most-bet game. name/matchup are
  // accepted as aliases so a mistyped param still works.
  const rawGame = sp.game ?? sp.name ?? sp.matchup;
  const gameParam = typeof rawGame === "string" ? rawGame.trim() : "";
  if (gameParam) ogQs.set("game", gameParam);
  ogQs.set("d", fp.etDay);
  if (fp.picks > 0) ogQs.set("p", String(fp.picks));
  if (fp.sharps > 0) ogQs.set("s", String(fp.sharps));
  if (fp.seasonPicks > 0) ogQs.set("g", String(fp.seasonPicks));
  if (fp.contentHash) ogQs.set("h", fp.contentHash);
  ogQs.set("v", OG_CARD_VERSION);
  if (sp.v && /^[0-9]{8,}$/.test(sp.v)) ogQs.set("sv", sp.v);
  const ogUrl = `/og/slate?${ogQs.toString()}`;
  const ogAlt = isNfl ? `This week's NFL slate on ${SITE_NAME}` : `${dayLabel} MLB slate on ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: SITE_NAME,
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: ogAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: "@TailSlips",
      images: [{ url: ogUrl, alt: ogAlt }],
    },
  };
}

export const revalidate = 60;
export const maxDuration = 30;

export default async function SlatePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const p = parseParams(sp);
  const { sport, dateParam } = p;
  const isNfl = sport === "nfl";

  let data: SlateResponse | null = null;
  let fetchError: string | null = null;
  try {
    data = await fetchSlate(dateParam, sport, p.week);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
    // Don't cache the failure render; next refresh re-fetches.
    noStore();
  }

  const heading = isNfl
    ? `${weekLabel(data, p.week)} slate`
    : dateParam === "today"
      ? "Tonight's slate"
      : "Tomorrow's slate";

  if (fetchError || !data) {
    return (
      <>
        <TopNav />
        <main className="max-w-[920px] mx-auto px-4 sm:px-7 pb-24">
          <div className="pt-8">
            <SportToggle current={sport} mlbCaption="Daily board" nflCaption="Weekly board" />
          </div>
          <header className="pt-8 pb-3">
            <h1 className="text-[44px] font-extrabold tracking-[-0.03em] leading-[1]">{heading}</h1>
          </header>
          <div className="text-center py-16 text-[13px] text-[var(--color-text-muted)]">
            Slate is temporarily unavailable. Refresh in a moment.
          </div>
        </main>
      </>
    );
  }

  // Weekly (Mon-Sun) standings rollup for the MLB standings toggle. Null on
  // any failure: the card then renders daily-only, exactly as before the
  // toggle. The NFL board IS a week, so it has no separate rollup.
  let week: Awaited<ReturnType<typeof fetchWeekStandings>> = null;
  if (!isNfl) {
    try {
      week = await fetchWeekStandings(data.date);
    } catch {
      week = null;
    }
  }

  const allPicks = data.games.flatMap((g) => g.picks);
  const totalPicks = allPicks.length;
  const gamesWithPicks = data.games.filter((g) => g.picks.length > 0);
  const gamesWithoutPicks = data.games.filter((g) => g.picks.length === 0);
  const railGames = buildRailGames(gamesWithPicks, gamesWithoutPicks);
  const uniqueSharps = new Set(allPicks.map((pk) => pk.capper_id)).size;
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

  const range = isNfl ? weekRange(data) : null;
  const rankCopy = isNfl
    ? "Sharps are ranked by their NFL season straight-pick performance (units profit, min 10 graded picks)."
    : "Sharps are ranked by their season straight-pick performance (units profit, min 10 graded picks).";
  const nflCaption = isNfl ? weekLabel(data, p.week) : "Weekly board";
  const mlbCaption = isNfl ? "Daily board" : dateParam === "today" ? "Tonight" : "Tomorrow";

  const pickedByDay = isNfl ? groupByDay(gamesWithPicks) : null;
  const quietByDay = isNfl ? groupByDay(gamesWithoutPicks) : null;

  const showStandings =
    (ds.graded_count > 0 && (data.capper_summary?.length ?? 0) > 0) ||
    (week?.capper_summary?.some((c) => c.graded_count > 0) ?? false);

  return (
    <>
      <JsonLd
        data={breadcrumbNode([
          { name: "Home", path: "/" },
          { name: "Slate", path: "/slate" },
        ])}
      />
      <SportTint sport={sport} />
      <TopNav />
      {/* Mobile strip is a full-width sibling of <main> so it spans the
          viewport and stays aligned with the board. It self-hides at xl. */}
      <SlateRailStrip games={railGames} />
      <main className="max-w-[1400px] mx-auto px-4 sm:px-7 pb-24">
        {/* Two-column: a sticky matchup rail plus the board filling the rest.
            The flex wrapper must NOT get overflow or transform: it would break
            the nav sticky (top-0) and the GameBlock sticky strips (top-16). */}
        <div className="flex flex-col xl:flex-row xl:items-start gap-4 xl:gap-8">
          <SlateRailColumn games={railGames} />
          <div className="min-w-0 flex-1">
            <div className="pt-8 sm:pt-10 max-w-[520px]">
              <SportToggle current={sport} mlbCaption={mlbCaption} nflCaption={nflCaption} />
            </div>
            <header className="pt-8 pb-3 flex items-end justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-[44px] font-extrabold tracking-[-0.03em] leading-[1]">
                  {heading}
                </h1>
                {range && (
                  <p className="text-[12px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-muted)] mt-3">
                    {range} · kickoffs in ET
                  </p>
                )}
                <p className={`text-[13px] text-[var(--color-text-muted)] font-medium tabular-nums ${range ? "mt-2" : "mt-3"}`}>
                  {summaryLine}
                </p>
                <p className="text-[12px] text-[var(--color-text-muted)] font-medium mt-2 max-w-[640px]">
                  {rankCopy}{" "}
                  Parlay legs route to the team they back but do not count toward the season rank.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {!isNfl && <DateToggle current={dateParam} />}
                <ShareLinkButton
                  basePath="/slate"
                  queryParams={{
                    sport: isNfl ? "nfl" : undefined,
                    week: isNfl && p.week != null ? String(p.week) : undefined,
                    date: !isNfl && dateParam !== "today" ? dateParam : undefined,
                  }}
                />
              </div>
            </header>

            {data.games.length === 0 ? (
              <div className="mt-12 text-center">
                <div className="text-[14px] font-semibold text-[var(--color-text-soft)] mb-1">
                  {isNfl ? "No NFL games on the slate." : "No MLB games on the slate."}
                </div>
                <div className="text-[12px] text-[var(--color-text-muted)]">
                  Check back when games are scheduled.
                </div>
              </div>
            ) : (
              <>
                {gamesWithPicks.length > 0 && (
                  <div className="mt-2 mb-5">
                    <SportsbookAd
                      creative={BETMGM_1940x500_FOOTBALL}
                      placement="slate-inline"
                      className="w-full"
                    />
                  </div>
                )}
                {showStandings && (
                  <div className="mb-5">
                    <StandingsSection
                      daily={data.capper_summary ?? []}
                      totalGraded={ds.graded_count}
                      totalPending={ds.pending_count}
                      week={week}
                      dayLabel={isNfl ? weekLabel(data, p.week) : dateParam === "tomorrow" ? "Tomorrow" : "Tonight"}
                    />
                  </div>
                )}
                {pickedByDay ? (
                  <div className="flex flex-col gap-8 mt-2">
                    {pickedByDay.map((bucket) => (
                      <section key={bucket.day} className="flex flex-col gap-5">
                        <DayHeader label={bucket.label} count={bucket.games.length} />
                        {bucket.games.map((g) => (
                          <GameBlock key={g.game_id} game={g} />
                        ))}
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-5 mt-2">
                    {gamesWithPicks.map((g) => (
                      <GameBlock key={g.game_id} game={g} />
                    ))}
                  </div>
                )}
                {gamesWithoutPicks.length > 0 && (
                  <div className="mt-10 pt-6 border-t border-[rgba(255,255,255,0.06)]">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold mb-2">
                      Quiet · {gamesWithoutPicks.length} {gamesWithoutPicks.length === 1 ? "game" : "games"} with no picks tweeted
                    </div>
                    {quietByDay ? (
                      <div className="flex flex-col gap-3">
                        {quietByDay.map((bucket) => (
                          <div key={bucket.day}>
                            <div className="text-[11px] font-bold text-[var(--color-text-soft)] mt-2 mb-0.5">
                              {bucket.label}
                            </div>
                            <div className="flex flex-col">
                              {bucket.games.map((g) => (
                                <QuietGameStrip key={g.game_id} game={g} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {gamesWithoutPicks.map((g) => (
                          <QuietGameStrip key={g.game_id} game={g} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <footer className="mt-16 text-[11px] text-[var(--color-text-muted)] font-medium">
          Picks refresh every 60 seconds. Outcomes hit the leaderboard once games are graded.
        </footer>
      </main>
    </>
  );
}

/** Flat day divider for the week board: "Sunday, Sep 13 · 13 games". */
function DayHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-baseline justify-between border-b border-[rgba(255,255,255,0.10)] pb-2">
      <span className="text-[13px] font-extrabold tracking-tight text-[var(--color-text)]">{label}</span>
      <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-muted)] tabular-nums">
        {count} {count === 1 ? "game" : "games"}
      </span>
    </div>
  );
}
