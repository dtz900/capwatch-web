import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { TopNav } from "@/components/nav/TopNav";
import { fetchPalaceEntry } from "@/lib/api";
import { ParlayHero } from "@/components/parlay-palace/ParlayHero";
import { LegRow } from "@/components/parlay-palace/LegRow";
import { PayoutLadder } from "@/components/parlay-palace/PayoutLadder";
import { Reveal } from "@/components/parlay-palace/Reveal";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbNode, parlayPalaceArticleNode } from "@/lib/jsonld";
import { SITE_NAME } from "@/lib/seo";

export const revalidate = 60;
export const maxDuration = 30;

interface PageProps { params: Promise<{ slug: string }>; }

export async function generateMetadata(
  { params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const entry = await fetchPalaceEntry(slug);
    if (!entry) return { title: "Parlay Palace | TailSlips" };
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
        images: [{ url: `/parlay-palace/${slug}/opengraph-image`,
                   width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title: entry.title ?? "Winning parlay",
        description: entry.recap_blurb ?? undefined,
        site: "@FadeAI_",
        images: [{ url: `/parlay-palace/${slug}/opengraph-image`,
                   alt: entry.title ?? "Winning parlay on TailSlips" }],
      },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: "Parlay Palace | TailSlips" };
  }
}

export default async function PalaceDetailPage({ params }: PageProps) {
  const { slug } = await params;

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
      <TopNav />
      <main className="max-w-[560px] mx-auto px-4 pb-16 pt-8">
        <h1 style={{position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0,0,0,0)",whiteSpace:"nowrap",border:0}}>{entry.title ?? "Winning parlay"}</h1>
        <ParlayHero entry={entry} />
        {entry.recap_blurb && (
          <p className="text-[13px] leading-relaxed text-[var(--color-text-soft)] mt-5">
            {entry.recap_blurb}
          </p>
        )}
        <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4">
          {legs.map((l, i) => (
            <Reveal key={l.leg_index} index={i}>
              <LegRow leg={l} position={i + 1} />
            </Reveal>
          ))}
        </div>
        <Reveal index={legs.length}>
          <PayoutLadder legs={legs} />
        </Reveal>
        {entry.capper_handle && (
          <Link
            href={`/cappers/${entry.capper_handle}`}
            className="block text-center mt-6 rounded-lg bg-[var(--color-pos)] text-black font-extrabold py-3 text-[13px]"
          >
            See @{entry.capper_handle} on TailSlips →
          </Link>
        )}
      </main>
    </>
  );
}
