import Link from "next/link";
import { notFound } from "next/navigation";
import { TopNav } from "@/components/nav/TopNav";
import { capperVipEnabled } from "@/lib/flags";

export const metadata = {
  title: "VIP rules",
  description:
    "The plain-language rules for selling and buying VIP picks on TailSlips: who can sell, what a VIP pick is, what subscribers get, the money, and our conflict of interest.",
  alternates: { canonical: "/vip-rules" },
  openGraph: {
    title: "VIP rules · TailSlips",
    description: "Who can sell VIP picks on TailSlips, what subscribers get, and how the money works.",
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
const H2 = "text-[20px] font-bold mt-9 mb-3";
const LINK = "underline hover:text-[var(--color-text)]";

export default function VipRules() {
  if (!capperVipEnabled()) notFound();

  return (
    <>
      <TopNav />
      <main className="max-w-[760px] mx-auto px-4 sm:px-7 pt-10 sm:pt-14 pb-16">
        <h1 className="text-[28px] sm:text-[36px] font-extrabold tracking-[-0.025em] mb-4">
          VIP rules
        </h1>

        <p className={P}>
          Some cappers on TailSlips sell access to their picks. These are the rules that decide who
          gets to sell, what a sold pick is, and how the money works. They apply to every seller.
        </p>

        <h2 className={H2}>Who can sell</h2>
        <p className={P}>
          A capper can sell only while their public record is positive. We look at the trailing 30
          days and need at least 20 graded picks staked at 0.5u or more, with net units above zero.
          Public picks and VIP picks are combined in that number, so a seller cannot hide a bad
          stretch by moving losses into one bucket.
        </p>
        <p className={P}>
          Eligibility is recomputed every night. If a capper is negative two nights in a row,
          selling switches off. It switches back on the first night they are positive again. The
          floor can rise over time, and if it does, this page will say so.
        </p>

        <h2 className={H2}>What a VIP pick is</h2>
        <p className={P}>
          A VIP pick is posted inside TailSlips and timestamped by TailSlips. The capper cannot edit
          or delete it. It stays locked to subscribers until its scheduled start. After that it is
          shown to everyone and graded like any other pick, and it counts on the leaderboard.
        </p>

        <h2 className={H2}>What subscribers get</h2>
        <p className={P}>
          Subscribers see the capper&apos;s VIP picks on their profile and in{" "}
          <Link href="/my-tails" className={LINK}>
            My Tails
          </Link>
          , and get an email for each pick. You can cancel any time. There are no refunds.
        </p>
        <p className={P}>
          Billing pauses automatically if the capper is ineligible in every sport for 7 days, or
          posts no VIP picks for 14 days. It resumes when he can post again.
        </p>

        <h2 className={H2}>Money</h2>
        <p className={P}>
          The capper sets the price. TailSlips keeps 15% of each subscription, and founding sellers
          pay 10%. Payment processing fees come out of the capper&apos;s share, not the
          subscriber&apos;s price.
        </p>

        <h2 className={H2}>Our conflict</h2>
        <p className={P}>
          TailSlips earns money from sellers, which is a conflict of interest, and we want you to
          see it. Sellers are graded by the same code as every other capper, with no special
          treatment. Each capper&apos;s eligibility history is public on their profile, so you can
          check when selling was on or off. See the{" "}
          <Link href="/methodology" className={LINK}>
            methodology
          </Link>{" "}
          for how grading works.
        </p>

        <h2 className={H2}>Not advice</h2>
        <p className={P}>
          TailSlips does not provide betting advice. Every pick is the capper&apos;s own, and past
          results do not predict future ones. You must be 18 or older to subscribe.
        </p>
      </main>
    </>
  );
}
