import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopNav } from "@/components/nav/TopNav";
import { EligibilityGroups } from "@/components/vip/EligibilityBadges";
import { VipLockedTeaser } from "@/components/vip/VipPaywall";
import { VipRulesTile } from "@/components/vip/VipRulesTile";
import { VipBand, VipGlassCard, VipPrice } from "@/components/vip/VipBand";
import { VipCrown } from "@/components/vip/VipCrown";
import { SubscribeCheckout } from "@/components/vip/SubscribeDoor";
import {
  DOOR_CLOSED,
  exclusivityLine,
  formatPrice,
  vipHeadline, withSeason } from "@/components/vip/format";
import { VIP_GLASS_DIVIDER, VIP_PRIMARY_BTN } from "@/components/vip/styles";
import { fetchCapperProfile } from "@/lib/api";
import { API_BASE } from "@/lib/config";
import { capperVipEnabledFor } from "@/lib/flags";
import type { VipCapperStatus } from "@/lib/vip/types";
import { avatarSrc } from "@/lib/avatarSrc";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `Subscribe to @${handle} VIP`,
    robots: { index: false },
  };
}

async function fetchStatus(capperId: number): Promise<VipCapperStatus | null> {
  try {
    const res = await fetch(`${API_BASE}/api/vip/cappers/${capperId}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as VipCapperStatus;
  } catch {
    return null;
  }
}

export default async function SubscribePage({ params }: PageProps) {
  const { handle } = await params;
  if (!capperVipEnabledFor(handle)) notFound();

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
  const facts = verifiedFacts(profile, status);
  const doorOpen = Boolean(status?.door_open);
  const closedReason = status?.door_closed_reason ?? "not_selling";

  const name = capper.display_name ?? `@${capper.handle}`;
  const lockedRows = status?.locked ?? [];
  const cta =
    seller && doorOpen ? (
      <a
        href="#subscribe"
        className={`${VIP_PRIMARY_BTN} h-12 px-8 text-[12px] whitespace-nowrap`}
      >
        Subscribe · ${formatPrice(seller.price_cents)}/mo
      </a>
    ) : (
      <p className="text-[13px] leading-snug text-[var(--color-text-muted)] sm:max-w-[280px]">
        {DOOR_CLOSED[closedReason]}
      </p>
    );
  // One surface: VIP purple at the top easing into near-black with a purple
  // hint, so the record carries the color and the rest stays calm.
  const SURFACE = {
    backgroundImage:
      "linear-gradient(180deg, rgba(91,33,182,0.46) 0%, rgba(58,24,112,0.30) 24%, rgba(26,16,44,0.85) 46%, #110c1a 100%)",
  };

  return (
    <>
      <TopNav />
      <main className="max-w-[760px] mx-auto px-4 sm:px-7 pt-10 pb-16">
        <Link
          href={`/cappers/${capper.handle}`}
          className="inline-flex items-center mb-6 rounded-lg border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-soft)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]"
        >
          ← Profile
        </Link>

        {/* Hero: who, what, price, button. */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-6">
          <div className="flex items-center gap-4 min-w-0">
            {capper.profile_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc(capper.profile_image_url) as string}
                alt=""
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover border-2 border-[rgba(196,181,253,0.45)]"
              />
            ) : null}
            <div className="min-w-0">
              <h1 className="text-[26px] sm:text-[30px] font-extrabold leading-tight flex items-center gap-2">
                {name} VIP
                <VipCrown className="w-7 h-7" bold />
              </h1>
              <p className="text-[14px] text-[var(--color-text-soft)]">
                Every pick before the game. Everyone else waits.
              </p>
            </div>
          </div>
          {cta}
        </div>

        {status ? (
          <VipGlassCard glow={false} style={SURFACE}>
            <VipBand
              headline={vipHeadline(status)}
              exclusivity={exclusivityLine(status)}
              right={seller ? <VipPrice cents={seller.price_cents} /> : null}
            />
            <div className="px-5 sm:px-6 pt-1 pb-5">
              <EligibilityGroups eligibility={withSeason(status)} />
            </div>

            {/* Picks waiting behind the paywall (only when there are some). */}
            {lockedRows.length > 0 && (
              <div className={VIP_GLASS_DIVIDER}>
                <VipLockedTeaser locked={lockedRows} />
              </div>
            )}

            {/* What you get */}
            <div className={`${VIP_GLASS_DIVIDER} px-5 sm:px-6 py-5`}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PERKS.map((p) => (
                  <div key={p.title} className={PERK_TILE}>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="w-6 h-6 text-[var(--color-vip-text)]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={p.icon} />
                    </svg>
                    <div className="mt-3 text-[15px] font-extrabold text-[var(--color-text)]">
                      {p.title}
                    </div>
                    <div className="mt-1 text-[12px] leading-snug text-[var(--color-text-muted)]">
                      {p.body}
                    </div>
                  </div>
                ))}
                <VipRulesTile className={PERK_TILE} />
              </div>
            </div>

            {/* Proof */}
            <div className={`${VIP_GLASS_DIVIDER} relative px-5 sm:px-6 py-5`}>
              <div className="flex items-start gap-4">
                <Shield />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[15px] font-extrabold text-[var(--color-text)]">
                      Verified by TailSlips
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
                    We track and grade every pick. Nothing is self-reported.
                  </p>
                  <dl className="mt-4 grid grid-cols-3 gap-4">
                    {facts.map((f) => (
                      <div key={f.label} className="min-w-0">
                        <dt className="text-[10px] uppercase tracking-[0.16em] font-bold text-[var(--color-text-muted)]">
                          {f.label}
                        </dt>
                        <dd className="mt-1 text-[18px] font-extrabold tabular-nums text-[var(--color-text)]">
                          {f.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>

            <div
              className={`${VIP_GLASS_DIVIDER} px-5 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}
            >
              {seller && doorOpen && status ? (
                <SubscribeCheckout status={status} handle={handle} capperId={capper.id} />
              ) : (
                cta
              )}
              {doorOpen && (
                <span className="flex items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="4" y="11" width="16" height="10" rx="2" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                  Secure checkout with Stripe · Cancel anytime
                </span>
              )}
            </div>
          </VipGlassCard>
        ) : (
          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 flex flex-col items-start gap-4">
            <p className="text-[15px]">
              @{capper.handle} is not selling VIP picks right now.
            </p>
          </section>
        )}
      </main>
    </>
  );
}

const PERK_TILE =
  "block rounded-lg border border-[rgba(196,181,253,0.10)] bg-[rgba(255,255,255,0.025)] p-4";

const PERKS = [
  {
    title: "First look",
    body: "Every pick the second it posts. Everyone else sees it 30 minutes after the game starts.",
    icon: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  },
  {
    title: "Instant alerts",
    body: "An email the moment a new pick drops.",
    icon: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2ZM10 21h4",
  },
  {
    title: "All in one place",
    body: "Every VIP pick waiting in your My Tails.",
    icon: "M4 6h16M4 12h16M4 18h10",
  },
];

const ET_DAY: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  timeZone: "America/New_York",
};
const ET_MONTH: Intl.DateTimeFormatOptions = {
  month: "short",
  year: "numeric",
  timeZone: "America/New_York",
};

/** TailSlips' own numbers on this capper: when tracking began, how many
 *  picks were graded, and when they first qualified to sell. */
function verifiedFacts(
  profile: Awaited<ReturnType<typeof fetchCapperProfile>>,
  status: VipCapperStatus | null,
): Array<{ label: string; value: string }> {
  const all = profile.aggregates?.all_time;
  const qualified = (status?.eligibility ?? [])
    .filter((e) => e.eligible && e.eligible_since)
    .map((e) => e.eligible_since as string)
    .sort()[0];
  const facts: Array<{ label: string; value: string | null }> = [
    {
      label: "Tracked since",
      value: all?.tracked_since
        ? new Date(all.tracked_since).toLocaleDateString("en-US", ET_MONTH)
        : null,
    },
    {
      label: "Picks graded",
      value: all
        ? (all.wins + all.losses + all.pushes).toLocaleString("en-US")
        : null,
    },
    {
      label: "Qualified",
      value: qualified
        ? new Date(qualified).toLocaleDateString("en-US", ET_DAY)
        : null,
    },
  ];
  return facts.filter(
    (f): f is { label: string; value: string } => f.value !== null,
  );
}

function Shield() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-10 h-10 shrink-0">
      <path
        d="M12 2.5 4.5 5.4v6.1c0 4.6 3.1 8.6 7.5 10 4.4-1.4 7.5-5.4 7.5-10V5.4L12 2.5Z"
        fill="var(--color-vip)"
      />
      <path
        d="M8.4 12.2l2.5 2.5 4.8-5"
        fill="none"
        stroke="var(--color-text)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
