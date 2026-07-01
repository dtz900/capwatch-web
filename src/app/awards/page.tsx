import type { Metadata } from "next";
import Link from "next/link";
import { TopNav } from "@/components/nav/TopNav";
import { AWARD_CATEGORIES, MONTHLY_AWARDS, type MonthlyAward } from "@/lib/awards";
import { SITE_NAME } from "@/lib/seo";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: `Monthly Capper Awards | ${SITE_NAME}`,
  description:
    "TailSlips monthly awards: the top MLB cappers each month by graded, tweet-verified record. Straights, moneyline, and more.",
  alternates: { canonical: "/awards" },
};

const RANK_COLORS: Record<number, string> = {
  1: "text-[var(--color-gold)]",
  2: "text-[var(--color-silver)]",
  3: "text-[var(--color-bronze)]",
};

function groupAwards(): Array<{
  month: string;
  monthLabel: string;
  categories: Array<{ key: string; headline: string; awards: MonthlyAward[] }>;
}> {
  const months = new Map<string, MonthlyAward[]>();
  for (const a of MONTHLY_AWARDS) {
    const list = months.get(a.month) ?? [];
    list.push(a);
    months.set(a.month, list);
  }
  return [...months.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([month, awards]) => {
      const categories = new Map<string, MonthlyAward[]>();
      for (const a of awards) {
        const list = categories.get(a.category) ?? [];
        list.push(a);
        categories.set(a.category, list);
      }
      return {
        month,
        monthLabel: awards[0].monthLabel,
        categories: [...categories.entries()].map(([key, list]) => ({
          key,
          headline: AWARD_CATEGORIES[key as keyof typeof AWARD_CATEGORIES].headline,
          awards: list.sort((a, b) => a.rank - b.rank),
        })),
      };
    });
}

export default function AwardsIndexPage() {
  const groups = groupAwards();
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-8 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#e3c787]">
          TailSlips Monthly Awards
        </p>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">Capper of the Month</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Issued monthly from graded, tweet-verified records. Numbers are frozen at issuance.
        </p>

        {groups.map((group) => (
          <section key={group.month} className="mt-10">
            <h2 className="text-lg font-black uppercase tracking-wide">{group.monthLabel}</h2>
            {group.categories.map((cat) => (
              <div key={cat.key} className="mt-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  {cat.headline}
                </h3>
                <ul className="mt-2 divide-y divide-white/5 rounded-lg border border-white/10 bg-white/[0.02]">
                  {cat.awards.map((a) => (
                    <li key={a.slug}>
                      <Link
                        href={`/awards/${a.slug}`}
                        className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-white/5"
                      >
                        <span className="flex items-center gap-3">
                          <span className={`w-8 text-lg font-black ${RANK_COLORS[a.rank] ?? ""}`}>
                            #{a.rank}
                          </span>
                          <span className="font-bold">@{a.handle}</span>
                        </span>
                        <span
                          className={`font-black tabular-nums ${a.unitsProfit >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"}`}
                        >
                          {a.unitsProfit >= 0 ? "+" : ""}
                          {a.unitsProfit.toFixed(1)}u
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}
