import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/nav/TopNav";
import { XIcon } from "@/components/icons/XIcon";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { formatUnits2 } from "@/lib/formatters";
import { LEADERBOARD_ARCHIVES, getArchive, type ArchiveRow } from "@/lib/leaderboard-archives";

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

function Row({ r }: { r: ArchiveRow }) {
  const unitsCls = r.netUnits >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]";
  return (
    <Link
      href={`/cappers/${r.handle}`}
      className="flex items-center gap-2 sm:gap-3 py-2 px-2 -mx-2 rounded-md transition-colors hover:bg-[rgba(255,255,255,0.04)]"
    >
      <div className="w-8 shrink-0 text-[var(--color-text-muted)] font-bold tabular-nums text-[12px] sm:text-[13px]">
        {r.rank <= 3 ? MEDALS[r.rank - 1] : String(r.rank).padStart(2, "0")}
      </div>
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <span className="truncate text-[13px] font-semibold text-[var(--color-text)]">@{r.handle}</span>
        {r.displayName ? (
          <span className="hidden sm:inline truncate text-[12px] text-[var(--color-text-muted)]">{r.displayName}</span>
        ) : null}
      </div>
      <div className="shrink-0 w-14 sm:w-16 text-right text-[12px] sm:text-[13px] font-bold tabular-nums">
        {record(r)}
        {r.voids > 0 ? <span className="text-[var(--color-text-muted)] font-medium"> ({r.voids}v)</span> : null}
      </div>
      <div className={`shrink-0 w-16 sm:w-20 text-right text-[13px] sm:text-[14px] font-extrabold tabular-nums ${unitsCls}`}>
        {formatUnits2(r.netUnits)}u
      </div>
      <div className="shrink-0 w-12 text-right text-[11px] text-[var(--color-text-muted)] font-medium tabular-nums hidden sm:block">
        {r.graded}
      </div>
    </Link>
  );
}

export default async function LeaderboardArchivePage({ params }: PageProps) {
  const { slug } = await params;
  const a = getArchive(slug);
  if (!a) notFound();

  const leader = a.rows[0];
  const shareText = `${a.title} final capper leaderboard on ${SITE_NAME}: ${a.rows.length} sharps, ${a.totals.graded.toLocaleString()} graded picks.${
    leader ? ` @${leader.handle} on top at ${formatUnits2(leader.netUnits)}u.` : ""
  }`;
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(`${SITE_URL}/leaderboards/${slug}`)}`;
  const sportLabel = a.sport === "nfl" ? "NFL" : "MLB";

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#e3c787]">
          <Link href="/leaderboards" className="hover:underline">
            {SITE_NAME} Leaderboards
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">{a.title}: final standings</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {a.rangeLabel} · {a.games} games · {a.rows.length} sharps with a graded pick ·{" "}
          {a.totals.graded.toLocaleString()} picks graded
        </p>

        <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-5 py-4">
          <div className="flex items-center gap-2 sm:gap-3 px-2 -mx-2 pb-2 border-b border-[var(--color-border)] text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">
            <div className="w-8 shrink-0">#</div>
            <div className="min-w-0 flex-1">Sharp</div>
            <div className="shrink-0 w-14 sm:w-16 text-right">W-L</div>
            <div className="shrink-0 w-16 sm:w-20 text-right">Units</div>
            <div className="shrink-0 w-12 text-right hidden sm:block">Picks</div>
          </div>
          <div className="mt-1 flex flex-col">
            {a.rows.map((r) => (
              <Row key={r.handle} r={r} />
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
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#caa45a]/50 bg-[#caa45a]/10 px-5 py-3 text-sm font-bold uppercase tracking-wide text-[#e3c787] hover:bg-[#caa45a]/20"
          >
            <XIcon className="h-4 w-4" />
            Share
          </a>
        </div>

        <p className="mt-6 text-sm text-[var(--color-text-muted)]">
          Frozen {fmtDate(a.frozenAt)} once every {sportLabel} game in the window was final. Each sharp&apos;s line
          is their {a.title} record by game date: {a.totals.wins}-{a.totals.losses}
          {a.totals.pushes ? `-${a.totals.pushes}` : ""} across the field with {a.totals.voids} void
          {a.totals.voids === 1 ? "" : "s"}. Stakeless picks are graded at Pinnacle market prices; picks with no
          recoverable price count in the record and carry zero units. This page does not change with later regrades;
          the live slate does.
        </p>
      </main>
    </div>
  );
}
