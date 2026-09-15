import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/nav/TopNav";
import { XIcon } from "@/components/icons/XIcon";
import { SportTint } from "@/components/ui/SportTint";
import { ArchiveAvatar } from "@/components/leaderboard/ArchiveAvatar";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { formatUnits2 } from "@/lib/formatters";
import {
  LEADERBOARD_ARCHIVES,
  getArchive,
  type ArchiveRow,
  type LeaderboardArchive,
} from "@/lib/leaderboard-archives";

export const dynamic = "force-static";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return LEADERBOARD_ARCHIVES.map((a) => ({ slug: a.slug }));
}

function record(r: { wins: number; losses: number; pushes: number }): string {
  return r.pushes > 0 ? `${r.wins}-${r.losses}-${r.pushes}` : `${r.wins}-${r.losses}`;
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function pct(n: number, d: number): string {
  return d > 0 ? `${Math.round((n / d) * 100)}%` : "0%";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const a = getArchive(slug);
  if (!a) return { title: `Leaderboards | ${SITE_NAME}` };
  const leader = a.rows[0];
  const title = `${a.title} capper leaderboard, final`;
  const description = `Final ${a.title} standings on ${SITE_NAME}: ${a.rows.length} sharps, ${a.totals.graded.toLocaleString()} graded picks across ${a.games} games.${
    leader ? ` @${leader.handle} led at ${formatUnits2(leader.netUnits)}u (${record(leader)}).` : ""
  } Frozen ${fmtDate(a.frozenAt)}, every pick graded from the original tweet.`;
  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: `/leaderboards/${slug}` },
    openGraph: { title, description, url: `/leaderboards/${slug}`, type: "article", siteName: SITE_NAME },
    twitter: { card: "summary", title, description },
  };
}

const MEDALS = ["🥇", "🥈", "🥉"];

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const long = value.length > 8;
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">{label}</div>
      <div
        className={`mt-1 font-black tabular-nums leading-none text-[var(--color-text)] whitespace-nowrap ${
          long ? "text-[18px] sm:text-[20px]" : "text-[22px] sm:text-[26px]"
        }`}
      >
        {value}
      </div>
      {sub ? <div className="mt-1 text-[11px] text-[var(--color-text-soft)]">{sub}</div> : null}
    </div>
  );
}

/** Broadcast-scorebug style strip: league chip, season, week, FINAL. Built
 * entirely from the archive entry so every week renders the same way. */
function ScoreBug({ a }: { a: LeaderboardArchive }) {
  const league = a.sport.toUpperCase();
  const chip =
    a.sport === "nfl"
      ? "bg-[rgba(220,38,38,0.18)] border-[rgba(220,38,38,0.45)]"
      : "bg-[rgba(37,99,235,0.18)] border-[rgba(37,99,235,0.45)]";
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-lg border border-[var(--color-border-h)] bg-[rgba(0,0,0,0.35)] text-[11px] font-bold uppercase tracking-[0.18em]">
      <span className={`flex items-center border-r px-3 py-1.5 text-[var(--color-text)] ${chip}`}>{league}</span>
      <span className="flex items-center px-3 py-1.5 text-[var(--color-text-soft)]">{a.season} season</span>
      {a.week != null ? (
        <span className="flex items-center border-l border-[var(--color-border)] px-3 py-1.5 text-[var(--color-text)]">
          Week {a.week}
        </span>
      ) : null}
      <span className="flex items-center border-l border-[var(--color-border)] px-3 py-1.5 text-[var(--color-pos)]">
        Final
      </span>
    </div>
  );
}

/** Prev / next links across archived weeks of the same league and season. */
function WeekNav({ a }: { a: LeaderboardArchive }) {
  if (a.week == null) return null;
  const siblings = LEADERBOARD_ARCHIVES.filter(
    (x) => x.sport === a.sport && x.season === a.season && x.week != null,
  ).sort((x, y) => (x.week ?? 0) - (y.week ?? 0));
  const i = siblings.findIndex((x) => x.slug === a.slug);
  const prev = i > 0 ? siblings[i - 1] : null;
  const next = i >= 0 && i < siblings.length - 1 ? siblings[i + 1] : null;
  if (!prev && !next) return null;
  const cls =
    "inline-flex items-center rounded-lg border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-soft)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]";
  return (
    <div className="flex items-center gap-2">
      {prev ? (
        <Link href={`/leaderboards/${prev.slug}`} className={cls}>
          ← Week {prev.week}
        </Link>
      ) : null}
      {next ? (
        <Link href={`/leaderboards/${next.slug}`} className={cls}>
          Week {next.week} →
        </Link>
      ) : null}
    </div>
  );
}

function Row({ r, maxAbs, zebra }: { r: ArchiveRow; maxAbs: number; zebra: boolean }) {
  const pos = r.netUnits >= 0;
  const unitsCls = pos ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]";
  const barW = maxAbs > 0 ? Math.max(2, Math.round((Math.abs(r.netUnits) / maxAbs) * 100)) : 0;
  return (
    <Link
      href={`/cappers/${r.handle}`}
      className={`flex items-center gap-2 sm:gap-3 py-2 px-3 transition-colors hover:bg-[rgba(255,255,255,0.05)] ${
        zebra ? "bg-[rgba(255,255,255,0.015)]" : ""
      }`}
    >
      <div className="w-8 shrink-0 text-[var(--color-text-muted)] font-bold tabular-nums text-[12px] sm:text-[13px]">
        {r.rank <= 3 ? MEDALS[r.rank - 1] : String(r.rank).padStart(2, "0")}
      </div>
      <ArchiveAvatar url={r.avatarUrl} handle={r.handle} size={26} />
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <span className="truncate text-[13px] font-semibold text-[var(--color-text)]">@{r.handle}</span>
        {r.displayName ? (
          <span className="hidden md:inline truncate text-[12px] text-[var(--color-text-muted)]">{r.displayName}</span>
        ) : null}
      </div>
      <div className="shrink-0 w-[68px] sm:w-20 text-right text-[12px] sm:text-[13px] font-bold tabular-nums">
        {r.wins}-{r.losses}-{r.pushes}-{r.voids}
      </div>
      <div className="relative shrink-0 w-[92px] sm:w-[120px] h-6 flex items-center justify-end">
        <div
          aria-hidden
          className={`absolute inset-y-1 right-0 rounded-sm ${pos ? "bg-[var(--color-pos-soft)]" : "bg-[var(--color-neg-soft)]"}`}
          style={{ width: `${barW}%` }}
        />
        <span className={`relative pr-1.5 text-[13px] sm:text-[14px] font-extrabold tabular-nums ${unitsCls}`}>
          {formatUnits2(r.netUnits)}u
        </span>
      </div>
      <div className="shrink-0 w-9 text-right text-[11px] tabular-nums text-[var(--color-text-muted)] font-medium">
        {r.unpriced > 0 ? r.unpriced : "·"}
      </div>
      <div className="shrink-0 w-10 text-right text-[11px] text-[var(--color-text-muted)] font-medium tabular-nums hidden sm:block">
        {r.graded}
      </div>
    </Link>
  );
}

function UnitsNote({ a }: { a: LeaderboardArchive }) {
  const affected = a.rows.filter((r) => r.unpriced > 0).length;
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-4 py-3 sm:px-5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">
        About the units column
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-text-soft)]">
        <span className="font-bold text-[var(--color-text)]">
          {a.totals.unpriced.toLocaleString()} of {a.totals.graded.toLocaleString()} picks (
          {pct(a.totals.unpriced, a.totals.graded)})
        </span>{" "}
        could not be graded for units because no odds were available: the sharp posted no price and Pinnacle listed no
        matching line. Those picks still count in the win-loss record and carry 0 units, so a sharp&apos;s units can
        understate a good week. The <span className="font-bold text-[var(--color-text)]">0u</span> column shows how many
        each sharp had; {affected} of {a.rows.length} sharps are affected. Everything else is graded at the posted price
        or at Pinnacle market prices.
      </p>
    </div>
  );
}

export default async function LeaderboardArchivePage({ params }: PageProps) {
  const { slug } = await params;
  const a = getArchive(slug);
  if (!a) notFound();

  const leader = a.rows[0];
  const maxAbs = a.rows.reduce((m, r) => Math.max(m, Math.abs(r.netUnits)), 0);
  const shareText = `${a.title} final capper leaderboard on ${SITE_NAME}: ${a.rows.length} sharps, ${a.totals.graded.toLocaleString()} graded picks.${
    leader ? ` @${leader.handle} on top at ${formatUnits2(leader.netUnits)}u.` : ""
  }`;
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(`${SITE_URL}/leaderboards/${slug}`)}`;
  const sportLabel = a.sport === "nfl" ? "NFL" : "MLB";
  const green = a.rows.filter((r) => r.netUnits > 0).length;

  return (
    <div className="min-h-screen">
      <SportTint sport={a.sport} />
      <TopNav />
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-8 sm:px-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--color-text-muted)]">
          <Link href="/leaderboards" className="hover:text-white">
            {SITE_NAME} Leaderboards
          </Link>
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <ScoreBug a={a} />
          <WeekNav a={a} />
        </div>
        <h1 className="mt-4 text-[34px] sm:text-[44px] font-black leading-none tracking-tight">
          {a.title} <span className="text-[var(--color-text-muted)]">leaderboard</span>
        </h1>
        <p className="mt-2 text-[13px] sm:text-[14px] text-[var(--color-text-soft)]">
          {a.rangeLabel} · every {sportLabel} game final · board frozen {fmtDate(a.frozenAt)}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <StatTile label="Games" value={String(a.games)} />
          <StatTile label="Sharps" value={String(a.rows.length)} sub={`${green} finished up`} />
          <StatTile label="Picks graded" value={a.totals.graded.toLocaleString()} />
          <StatTile
            label="Field record"
            value={`${a.totals.wins}-${a.totals.losses}-${a.totals.pushes}-${a.totals.voids}`}
            sub="W-L-P-V"
          />
        </div>

        <div className="mt-6">
          <UnitsNote a={a} />
        </div>

        <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] overflow-hidden">
          <div className="sticky top-0 z-10 flex items-center gap-2 sm:gap-3 px-3 py-2 border-b border-[var(--color-border)] bg-[#101014] text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">
            <div className="w-8 shrink-0">#</div>
            <div className="w-[26px] shrink-0" />
            <div className="min-w-0 flex-1">Sharp</div>
            <div className="shrink-0 w-[68px] sm:w-20 text-right">W-L-P-V</div>
            <div className="shrink-0 w-[92px] sm:w-[120px] text-right">Units</div>
            <div className="shrink-0 w-9 text-right">0u</div>
            <div className="shrink-0 w-10 text-right hidden sm:block">Picks</div>
          </div>
          <div className="flex flex-col">
            {a.rows.map((r, i) => (
              <Row key={r.handle} r={r} maxAbs={maxAbs} zebra={i % 2 === 1} />
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={a.liveHref}
            className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold uppercase tracking-wide hover:bg-white/10"
          >
            Open the live {a.title} slate
          </Link>
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold uppercase tracking-wide hover:bg-white/10"
          >
            <XIcon className="h-4 w-4" />
            Share
          </a>
        </div>

        <p className="mt-6 text-[12px] leading-relaxed text-[var(--color-text-muted)]">
          Each sharp&apos;s line is their {a.title} record by game date, every pick graded from the original tweet.
          Stakeless picks grade at Pinnacle market prices; picks with no recoverable price count in the record at 0
          units (see the note above). This page does not change with later regrades; the live slate does.
        </p>
      </main>
    </div>
  );
}
