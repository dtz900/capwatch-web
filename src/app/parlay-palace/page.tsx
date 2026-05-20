import type { Metadata } from "next";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { TopNav } from "@/components/nav/TopNav";
import { fetchPalaceList } from "@/lib/api";
import { PalaceCard } from "@/components/parlay-palace/PalaceCard";
import { PalaceAtmosphere } from "@/components/parlay-palace/PalaceAtmosphere";
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

function SortTab({ href, active, label }: {
  href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="relative pb-1 transition-colors"
      style={{
        color: active ? "#f0d79a" : "rgba(255,255,255,0.4)",
      }}
    >
      {label}
      {active && (
        <span
          aria-hidden
          className="absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full"
          style={{
            background:
              "linear-gradient(90deg,#caa45a,#f3e3b3,#8a6e3a)",
          }}
        />
      )}
    </Link>
  );
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
      <PalaceAtmosphere />
      <TopNav />
      <main className="max-w-[1100px] mx-auto px-5 pb-16 relative z-10">
        <header className="pt-10 pb-8 relative">
          <div
            className="text-[10px] uppercase tracking-[0.22em] font-extrabold mb-2"
            style={{ color: "#caa45a" }}
          >
            TailSlips
          </div>
          <h1 className="palace-shimmer-text text-[36px] sm:text-[42px] font-extrabold tracking-[-0.02em] leading-[0.95]">
            Parlay Palace
          </h1>
          <p className="text-[13px] text-[rgba(255,255,255,0.55)] mt-3 max-w-[60ch] leading-[1.6]">
            The biggest winning MLB parlays tracked on TailSlips. Every leg
            graded against final box scores.
          </p>
          <div
            aria-hidden
            className="mt-5 h-px"
            style={{
              background:
                "linear-gradient(90deg,rgba(202,164,90,0.0),rgba(202,164,90,0.55),rgba(202,164,90,0.0))",
            }}
          />
          <div className="flex items-center gap-5 mt-4 text-[12px] uppercase tracking-[0.16em] font-bold">
            <SortTab
              href="/parlay-palace?sort=recent"
              active={sort === "recent"}
              label="Recent"
            />
            <SortTab
              href="/parlay-palace?sort=units"
              active={sort === "units"}
              label="Biggest"
            />
          </div>
        </header>
        {entries.length === 0 ? (
          <div
            className="rounded-[14px] p-[1.5px]"
            style={{
              background:
                "linear-gradient(135deg,rgba(202,164,90,0.5),rgba(138,110,58,0.2))",
            }}
          >
            <div className="rounded-[12.5px] bg-[#0c0e13] px-6 py-12 text-center text-[14px] text-[rgba(255,255,255,0.55)]">
              No parlays in the Palace yet. Check back soon.
            </div>
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
