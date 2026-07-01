import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/nav/TopNav";
import {
  AWARD_CATEGORIES,
  MONTHLY_AWARDS,
  awardVerifyHref,
  getAward,
} from "@/lib/awards";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { XIcon } from "@/components/icons/XIcon";

export const dynamic = "force-static";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return MONTHLY_AWARDS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const award = getAward(slug);
  if (!award) return { title: `Monthly Awards | ${SITE_NAME}` };
  const category = AWARD_CATEGORIES[award.category];
  const title = `${award.monthLabel} #${award.rank} ${category.headline}: @${award.handle}`;
  const description = `${award.displayName} finished ${award.monthLabel} at ${award.unitsProfit >= 0 ? "+" : ""}${award.unitsProfit.toFixed(1)}u on ${award.picksCount} graded ${category.label} (${award.wins}-${award.losses}${award.pushes ? `-${award.pushes}` : ""}). Every pick verified against the original tweet on ${SITE_NAME}.`;
  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: `/awards/${slug}` },
    openGraph: {
      title,
      description,
      url: `/awards/${slug}`,
      type: "article",
      siteName: SITE_NAME,
      images: [{ url: `/awards/${slug}/og`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/awards/${slug}/og`],
    },
  };
}

export default async function AwardPage({ params }: PageProps) {
  const { slug } = await params;
  const award = getAward(slug);
  if (!award) notFound();

  const category = AWARD_CATEGORIES[award.category];
  const verifyHref = awardVerifyHref(award);
  const shareText = `${award.monthLabel} #${award.rank} ${category.headline.toLowerCase()} on ${SITE_NAME}: @${award.handle}, ${award.unitsProfit >= 0 ? "+" : ""}${award.unitsProfit.toFixed(1)}u on ${award.picksCount} graded ${category.label}.`;
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(`${SITE_URL}/awards/${slug}`)}`;

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-8 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#e3c787]">
          <Link href="/awards" className="hover:underline">
            TailSlips Monthly Awards
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">
          {award.monthLabel}: #{award.rank} {category.headline}
        </h1>

        <div className="mt-6 overflow-hidden rounded-lg border border-white/10">
          {/* The card itself, rendered by the OG route. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/awards/${slug}/og`}
            alt={`${award.monthLabel} #${award.rank} ${category.headline} award for @${award.handle}`}
            width={1200}
            height={630}
            className="h-auto w-full"
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={verifyHref}
            className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold uppercase tracking-wide hover:bg-white/10"
          >
            Verify the record: every {award.monthLabel} pick
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
          Awarded {award.issuedAt}. Numbers are {award.displayName}&apos;s {category.label} record
          over {award.monthLabel} (by game date, ET) as graded at issuance: {award.wins}-
          {award.losses}
          {award.pushes ? `-${award.pushes}` : ""}, {(award.winRate * 100).toFixed(1)}% win rate,{" "}
          {award.roiPct >= 0 ? "+" : ""}
          {award.roiPct.toFixed(1)}% ROI on {award.picksCount} picks. Every pick links back to the
          original tweet.
        </p>
      </main>
    </div>
  );
}
