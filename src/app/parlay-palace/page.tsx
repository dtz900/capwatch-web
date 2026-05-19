import type { Metadata } from "next";
import { fetchPalaceList } from "@/lib/api";
import { PalaceCard } from "@/components/parlay-palace/PalaceCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbNode } from "@/lib/jsonld";

export const revalidate = 60;
export const maxDuration = 30;

export const metadata: Metadata = {
  title: "Parlay Palace · Biggest winning MLB parlays | TailSlips",
  description:
    "Every big winning MLB parlay tracked on TailSlips. Real cappers, real receipts, graded against final outcomes.",
  alternates: { canonical: "/parlay-palace" },
  openGraph: {
    title: "Parlay Palace | TailSlips",
    description: "The biggest winning MLB parlays, graded and verified.",
    url: "/parlay-palace",
  },
};

interface PageProps {
  searchParams: Promise<{ sort?: string }>;
}

export default async function ParlayPalacePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const sort = sp.sort === "units" ? "units" : "recent";
  const entries = await fetchPalaceList({ sort });
  return (
    <main className="max-w-[1100px] mx-auto px-5 pb-16">
      <JsonLd data={breadcrumbNode([
        { name: "Parlay Palace", path: "/parlay-palace" }])} />
      <header className="pt-10 pb-7">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)] font-bold mb-2">
          TailSlips
        </div>
        <h1 className="text-[32px] font-extrabold tracking-[-0.02em] leading-none">
          Parlay Palace
        </h1>
        <p className="text-[13px] text-[var(--color-text-soft)] mt-2 max-w-[64ch]">
          The biggest winning MLB parlays tracked on TailSlips. Every leg
          graded against final box scores.
        </p>
        <div className="flex gap-2 mt-4 text-[12px]">
          <a href="/parlay-palace?sort=recent"
             className={sort === "recent" ? "text-[var(--color-pos)] font-bold" : "text-[var(--color-text-muted)]"}>Recent</a>
          <a href="/parlay-palace?sort=units"
             className={sort === "units" ? "text-[var(--color-pos)] font-bold" : "text-[var(--color-text-muted)]"}>Biggest</a>
        </div>
      </header>
      {entries.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-6 py-12 text-center text-[14px] text-[var(--color-text-soft)]">
          No parlays in the Palace yet. Check back soon.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((e) => <PalaceCard key={e.slug} entry={e} />)}
        </div>
      )}
    </main>
  );
}
