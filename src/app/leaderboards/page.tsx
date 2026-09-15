import type { Metadata } from "next";
import Link from "next/link";
import { TopNav } from "@/components/nav/TopNav";
import { SITE_NAME } from "@/lib/seo";
import { formatUnits2 } from "@/lib/formatters";
import { LEADERBOARD_ARCHIVES } from "@/lib/leaderboard-archives";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: `Final leaderboards | ${SITE_NAME}`,
  description: `Frozen final standings for every archived ${SITE_NAME} board. Numbers never change after the archive date.`,
  alternates: { canonical: "/leaderboards" },
};

export default function LeaderboardsIndexPage() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#e3c787]">{SITE_NAME}</p>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">Final leaderboards</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Boards archived once every game in the window was final. They do not move with later regrades.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          {LEADERBOARD_ARCHIVES.map((a) => {
            const leader = a.rows[0];
            return (
              <Link
                key={a.slug}
                href={`/leaderboards/${a.slug}`}
                className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-5 py-4 hover:bg-[rgba(255,255,255,0.04)] transition-colors"
              >
                <div className="text-[15px] font-black">{a.title}</div>
                <div className="mt-1 text-[12px] text-[var(--color-text-muted)]">
                  {a.rangeLabel} · {a.rows.length} sharps · {a.totals.graded.toLocaleString()} picks
                  {leader ? ` · @${leader.handle} ${formatUnits2(leader.netUnits)}u` : ""}
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
