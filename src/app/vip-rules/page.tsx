import Link from "next/link";
import { notFound } from "next/navigation";
import { TopNav } from "@/components/nav/TopNav";
import { capperVipReachable } from "@/lib/flags";
import { VipCrown } from "@/components/vip/VipCrown";

export const metadata = {
  title: "VIP rules",
  description:
    "The plain-language rules for selling and buying VIP picks on TailSlips: who can sell, what a VIP pick is, what subscribers get, the money, and our conflict of interest.",
  alternates: { canonical: "/vip-rules" },
  openGraph: {
    title: "VIP rules · TailSlips",
    description:
      "Who can sell VIP picks on TailSlips, what subscribers get, and how the money works.",
    url: "/vip-rules",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "VIP rules · TailSlips",
    description: "The rules for selling and buying VIP picks on TailSlips.",
  },
};

const P = "text-[var(--color-text-soft)] leading-relaxed mb-4";
const UL = "list-disc pl-6 mb-4 space-y-1 text-[var(--color-text-soft)] leading-relaxed";
const H2 =
  "flex items-center gap-2.5 text-[20px] font-bold mt-9 mb-3 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-sm before:bg-[var(--color-vip)] before:shrink-0";
const LINK =
  "text-[var(--color-vip-text)] underline decoration-[rgba(196,181,253,0.4)] underline-offset-[3px] hover:decoration-[var(--color-vip-text)]";

export default function VipRules() {
  if (!capperVipReachable()) notFound();

  return (
    <>
      <TopNav />
      {/* Faint purple wash behind the header only; fades out well above the body. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] -z-10 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(109,40,217,0.16),transparent_70%)]"
      />
      <main className="relative max-w-[760px] mx-auto px-4 sm:px-7 pt-10 sm:pt-14 pb-16">
        <div className="flex items-center gap-2 mb-3">
          <VipCrown className="w-6 h-6" />
          <span className="text-[11px] font-extrabold tracking-[0.26em] text-[var(--color-vip-text)]">
            VIP
          </span>
        </div>
        <h1 className="text-[28px] sm:text-[36px] font-extrabold tracking-[-0.025em] mb-4">
          VIP rules
        </h1>
        <div className="h-px w-16 mb-6 bg-[linear-gradient(90deg,var(--color-vip),transparent)]" />

        <p className={P}>
          Some cappers on TailSlips sell access to their picks. These are the
          rules that decide who gets to sell, what a sold pick is, and how the
          money works. They apply to every seller.
        </p>

        <h2 className={H2}>Who can sell</h2>
        <p className={P}>
          Every seller on TailSlips earned it on their record. To start selling
          a sport, a capper needs these over their last 30 days:
        </p>
        <ul className={UL}>
          <li>30+ graded picks (staked 0.5u or more)</li>
          <li>5+ wins</li>
          <li>+3% ROI or better</li>
        </ul>
        <p className={P}>
          After that, they keep selling as long as they&apos;re up over their
          last 60 days. There&apos;s no pick minimum to stay, so a cold week
          doesn&apos;t shut down a proven winner. Public and VIP picks count
          together.
        </p>
        <p className={P}>
          We check every night. Two nights in a row at zero or below over 60
          days turns selling off in that sport, and getting back in means
          passing the 30-day test again.
        </p>

        <h2 className={H2}>What a VIP pick is</h2>
        <p className={P}>
          A VIP pick is posted inside TailSlips and timestamped by TailSlips. It
          is only shown to the capper&apos;s subscribers until 30 minutes after its
          scheduled start. After that everyone can see it, it is graded like
          any other pick, and it counts on the leaderboard.
        </p>
        <p className={P}>
          A capper can fix a mistake within 10 minutes of posting, and only
          before the game starts. Subscribers see the original next to the
          change and get a new alert.
        </p>
        <p className={P}>
          A capper can pull a pick before the game starts. It stays listed as
          pulled and counts as no action.
        </p>

        <h2 className={H2}>What subscribers get</h2>
        <p className={P}>
          Subscribers see the capper&apos;s VIP picks on their profile and in{" "}
          <Link href="/my-tails" className={LINK}>
            My Tails
          </Link>
          , and get an email for each pick. You can cancel any time. There are
          no refunds.
        </p>
        <p className={P}>
          Billing pauses if the capper fails the selling test above in every
          sport for 7 days, or posts no VIP picks for 14 days. It resumes when
          they are back. New subscriptions close as soon as selling switches
          off, and after 14 days with no VIP pick.
        </p>

        <h2 className={H2}>Money</h2>
        <p className={P}>
          The capper sets the price, and that is exactly what you pay. TailSlips
          keeps a share of each subscription. Sellers are graded by the same
          code as every other capper.
        </p>

        <h2 className={H2}>Not advice</h2>
        <p className={P}>
          TailSlips does not provide betting advice. Every pick is the
          capper&apos;s own, and past results do not predict future ones. You
          must be 21 or older to subscribe.
        </p>
      </main>
    </>
  );
}
