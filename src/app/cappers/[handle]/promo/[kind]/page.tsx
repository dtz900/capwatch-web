import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { capperVipEnabledFor } from "@/lib/flags";
import { cardPath, isPromoKind } from "@/lib/vip/promote";

/* The link in a Promote post. X reads its og:image (the share card); a person
 * who clicks it is sent straight on to the capper's profile. */

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ handle: string; kind: string }>;
  searchParams: Promise<{ t?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { handle, kind } = await params;
  const { t } = await searchParams;
  if (!isPromoKind(kind) || !capperVipEnabledFor(handle)) return { robots: { index: false } };
  const image = { url: cardPath(handle, kind, t ?? null), width: 1200, height: 675, alt: `@${handle} on TailSlips VIP` };
  const title = `@${handle} VIP on TailSlips`;
  const description = "Every pick verified before the game. Graded after.";
  return {
    title,
    description,
    robots: { index: false },
    openGraph: { title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function PromoSharePage({ params }: PageProps) {
  const { handle, kind } = await params;
  if (!isPromoKind(kind) || !capperVipEnabledFor(handle)) notFound();
  const profile = `/cappers/${encodeURIComponent(handle)}`;
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <meta httpEquiv="refresh" content={`0;url=${profile}`} />
      <Link href={profile} className="text-[var(--color-text-soft)] underline underline-offset-4">
        Continue to @{handle} on TailSlips
      </Link>
    </main>
  );
}
