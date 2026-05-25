import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { TopNav } from "@/components/nav/TopNav";
import { fetchPalaceEntry } from "@/lib/api";
import { ParlayHero } from "@/components/parlay-palace/ParlayHero";
import { LegRow } from "@/components/parlay-palace/LegRow";
import { PayoutLadder } from "@/components/parlay-palace/PayoutLadder";
import { Reveal } from "@/components/parlay-palace/Reveal";
import { PalaceAtmosphere } from "@/components/parlay-palace/PalaceAtmosphere";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbNode, parlayPalaceArticleNode } from "@/lib/jsonld";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { XIcon } from "@/components/icons/XIcon";

export const revalidate = 60;
export const maxDuration = 30;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ v?: string }>;
}

const PALACE_OG_CARD_VERSION = "2";

export async function generateMetadata(
  { params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  try {
    const entry = await fetchPalaceEntry(slug);
    if (!entry) return { title: "Parlay Palace | TailSlips" };
    const ogQs = new URLSearchParams();
    ogQs.set("v", PALACE_OG_CARD_VERSION);
    if (entry.published_at) ogQs.set("t", String(Date.parse(entry.published_at) || 0));
    if (entry.units_profit != null) ogQs.set("p", String(Math.round(entry.units_profit * 100)));
    if (entry.combined_odds != null) ogQs.set("o", String(entry.combined_odds));
    ogQs.set("h", palaceEntryHash(entry));
    if (sp.v && /^[0-9]{8,}$/.test(sp.v)) ogQs.set("sv", sp.v);
    const ogImage = `/parlay-palace/${slug}/og?${ogQs.toString()}`;
    return {
      title: `${entry.title ?? "Winning parlay"} | TailSlips`,
      description: entry.recap_blurb ?? undefined,
      alternates: { canonical: `/parlay-palace/${slug}` },
      openGraph: {
        title: entry.title ?? "Winning parlay",
        description: entry.recap_blurb ?? undefined,
        url: `/parlay-palace/${slug}`,
        type: "article",
        siteName: SITE_NAME,
        images: [{ url: ogImage, width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title: entry.title ?? "Winning parlay",
        description: entry.recap_blurb ?? undefined,
        site: "@FadeAI_",
        images: [{ url: ogImage, alt: entry.title ?? "Winning parlay on TailSlips" }],
      },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: "Parlay Palace | TailSlips" };
  }
}

function palaceEntryHash(entry: Awaited<ReturnType<typeof fetchPalaceEntry>>): string {
  const input = JSON.stringify({
    title: entry?.title,
    capper: entry?.capper_handle,
    units: entry?.units_profit,
    odds: entry?.combined_odds,
    legs: entry?.body?.legs?.map((leg) => [
      leg.leg_index,
      leg.player_name,
      leg.selection,
      leg.market,
      leg.result_text,
      leg.won,
    ]),
    hero: entry?.hero_url,
  });
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export default async function PalaceDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  if (!sp.v) redirect(`/parlay-palace/${slug}?v=${PALACE_OG_CARD_VERSION}`);

  let entry;
  try {
    entry = await fetchPalaceEntry(slug);
  } catch {
    noStore();
    return (
      <>
        <TopNav />
        <main className="max-w-[560px] mx-auto px-4 pb-16 pt-12">
          <p className="text-[13px] text-[var(--color-text-muted)]">
            Parlay Palace entry is temporarily unavailable. Refresh in a moment.
          </p>
        </main>
      </>
    );
  }

  if (!entry) notFound();

  const legs = [...(entry.body?.legs ?? [])].sort(
    (a, b) => (a.leg_index ?? 0) - (b.leg_index ?? 0),
  );
  const attribution =
    entry.body?.media_attribution ?? "Media: MLB Advanced Media";
  const shareUrl = `${SITE_URL}/parlay-palace/${slug}?v=${PALACE_OG_CARD_VERSION}`;
  const shareText = `${entry.title ?? "Winning parlay"}. Every leg graded on TailSlips.`;
  const shareHref =
    `https://x.com/intent/post?text=${encodeURIComponent(shareText)}` +
    `&url=${encodeURIComponent(shareUrl)}&via=tailslips`;
  return (
    <>
      <JsonLd data={[
        breadcrumbNode([
          { name: "Home", path: "/" },
          { name: "Parlay Palace", path: "/parlay-palace" },
          { name: entry.title ?? slug, path: `/parlay-palace/${slug}` },
        ]),
        parlayPalaceArticleNode(entry),
      ]} />
      <PalaceAtmosphere />
      <TopNav />
      <main className="max-w-[460px] mx-auto px-4 pb-16 pt-8 relative z-10">
        <h1 style={{position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0,0,0,0)",whiteSpace:"nowrap",border:0}}>{entry.title ?? "Winning parlay"}</h1>

        {/* foil frame */}
        <div
          className="rounded-[22px] p-[3px] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]"
          style={{
            background:
              "linear-gradient(135deg,#caa45a 0%,#f3e3b3 22%,#9c7a36 46%,#e9cf93 68%,#8a6e3a 100%)",
          }}
        >
          <div className="rounded-[19px] overflow-hidden bg-[#0c0e13]">
            <ParlayHero entry={entry} />

            {entry.recap_blurb && (
              <p className="px-5 pt-5 text-[13px] leading-[1.65] text-[rgba(255,255,255,0.66)]">
                {entry.recap_blurb}
              </p>
            )}

            <div className="px-5 pt-4">
              {legs.map((l, i) => (
                <Reveal key={l.leg_index} index={i}>
                  <LegRow leg={l} position={i + 1} />
                </Reveal>
              ))}
            </div>

            <Reveal index={legs.length}>
              <PayoutLadder legs={legs} finalUnits={entry.units_profit ?? 0} />
            </Reveal>

            <div className="px-5 pb-5 space-y-2.5">
              {entry.capper_handle && (
                <Link
                  href={`/cappers/${entry.capper_handle}`}
                  className="block text-center rounded-xl py-3.5 text-[13px] font-black tracking-wide text-[#1c1402]
                             bg-[linear-gradient(180deg,#f0d79a,#c7a259)]
                             hover:brightness-105 transition"
                >
                  See @{entry.capper_handle} on TailSlips →
                </Link>
              )}
              <a
                href={shareHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share this parlay on X"
                className="flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-bold
                           text-white bg-[rgba(255,255,255,0.05)] ring-1 ring-[rgba(255,255,255,0.12)]
                           hover:bg-[rgba(255,255,255,0.09)] transition"
              >
                <XIcon size={13} />
                Share on X
              </a>
            </div>

            <div className="px-5 py-3 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-[0.18em] font-bold text-[rgba(255,255,255,0.28)]">
                {attribution}
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-[#caa45a]">
                TailSlips
              </span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
