import type { Metadata } from "next";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { TopNav } from "@/components/nav/TopNav";
import { fetchPalaceList } from "@/lib/api";
import { PalaceCard } from "@/components/parlay-palace/PalaceCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbNode } from "@/lib/jsonld";
import { SITE_NAME } from "@/lib/seo";
import type { PalaceEntry } from "@/lib/types";

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
    type: "website",
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: "Parlay Palace | TailSlips",
    description: "The biggest winning MLB parlays, graded and verified.",
    site: "@FadeAI_",
  },
};

interface PageProps {
  searchParams: Promise<{ sort?: string }>;
}

export default async function ParlayPalacePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const sort = sp.sort === "units" ? "units" : "recent";

  let entries: PalaceEntry[] = [];
  let fetchError: string | null = null;
  try {
    entries = await fetchPalaceList({ sort });
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
    // Don't ISR-cache a failed render. Without this, a single transient
    // 503 from Railway would stick the fallback message in the CDN for
    // 60s for every visitor, even after the upstream recovered.
    noStore();
  }

  if (fetchError) {
    return (
      <>
        <TopNav />
        <main className="max-w-[1100px] mx-auto px-5 pb-16 pt-12">
          <h1 className="text-[24px] font-extrabold mb-2">Parlay Palace</h1>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            Parlay Palace is temporarily unavailable. Refresh in a moment.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <JsonLd data={breadcrumbNode([
        { name: "Home", path: "/" },
        { name: "Parlay Palace", path: "/parlay-palace" },
      ])} />
      <TopNav />
      <main className="max-w-[1100px] mx-auto px-5 pb-16">
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
            <Link
              href="/parlay-palace?sort=recent"
              aria-current={sort === "recent" ? "page" : undefined}
              className={sort === "recent" ? "text-[var(--color-pos)] font-bold" : "text-[var(--color-text-muted)]"}
            >
              Recent
            </Link>
            <Link
              href="/parlay-palace?sort=units"
              aria-current={sort === "units" ? "page" : undefined}
              className={sort === "units" ? "text-[var(--color-pos)] font-bold" : "text-[var(--color-text-muted)]"}
            >
              Biggest
            </Link>
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
    </>
  );
}
