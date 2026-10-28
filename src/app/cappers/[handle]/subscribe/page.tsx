import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopNav } from "@/components/nav/TopNav";
import { TailButton } from "@/components/auth/TailButton";
import { EligibilityBadges } from "@/components/vip/EligibilityBadges";
import { formatPrice } from "@/components/vip/format";
import { fetchCapperProfile } from "@/lib/api";
import { API_BASE } from "@/lib/config";
import { capperVipEnabled } from "@/lib/flags";
import type { VipCapperStatus } from "@/lib/vip/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `Subscribe to @${handle} VIP`,
    robots: { index: false },
  };
}

async function fetchStatus(capperId: number): Promise<VipCapperStatus | null> {
  try {
    const res = await fetch(`${API_BASE}/api/vip/cappers/${capperId}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as VipCapperStatus;
  } catch {
    return null;
  }
}

export default async function SubscribePage({ params }: PageProps) {
  if (!capperVipEnabled()) notFound();
  const { handle } = await params;

  let profile;
  try {
    profile = await fetchCapperProfile(handle);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "not_found") notFound();
    return (
      <>
        <TopNav />
        <main className="max-w-[720px] mx-auto px-4 sm:px-7 pt-12 pb-16">
          <h1 className="text-[24px] font-extrabold mb-2">@{handle}</h1>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            This page is temporarily unavailable. Refresh in a moment.
          </p>
        </main>
      </>
    );
  }

  const { capper } = profile;
  const status = await fetchStatus(capper.id);
  const seller = status?.seller ?? null;

  return (
    <>
      <TopNav />
      <main className="max-w-[720px] mx-auto px-4 sm:px-7 pt-10 pb-16">
        <div className="text-[10px]/[12px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold mb-4">
          Capper VIP
        </div>
        <div className="flex items-center gap-4 mb-5">
          {capper.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capper.profile_image_url}
              alt=""
              width={56}
              height={56}
              className="w-14 h-14 rounded-full object-cover border border-[var(--color-border)]"
            />
          ) : null}
          <div>
            <h1 className="text-[24px] font-extrabold leading-tight">{capper.display_name}</h1>
            <div className="text-[13px] text-[var(--color-text-muted)]">@{capper.handle}</div>
          </div>
        </div>
        {seller ? (
          <div className="text-[20px] font-extrabold mb-3 text-[var(--color-gold)]">
            ${formatPrice(seller.price_cents)}/mo
          </div>
        ) : null}
        {status ? (
          <div className="mb-6">
            <EligibilityBadges eligibility={status.eligibility} />
          </div>
        ) : null}
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 flex flex-col items-start gap-4">
          <p className="text-[15px]">
            Subscriptions open soon. Follow @{capper.handle} to get notified.
          </p>
          <TailButton capperId={capper.id} />
        </section>
        <Link
          href={`/cappers/${capper.handle}`}
          className="inline-block mt-6 text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          Back to profile
        </Link>
      </main>
    </>
  );
}
