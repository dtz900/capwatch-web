import { notFound } from "next/navigation";
import { TopNav } from "@/components/nav/TopNav";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbNode } from "@/lib/jsonld";
import { capperVipReachable } from "@/lib/flags";
import { SELLER_AGREEMENT_VERSION } from "@/lib/vip/terms";

export const metadata = {
  title: "Seller Agreement",
  description:
    "The agreement for cappers who sell VIP subscriptions on TailSlips: who sells, fees, payouts, refunds, billing pauses, and what happens when you stop.",
  alternates: { canonical: "/seller-agreement" },
  openGraph: {
    title: "Seller Agreement · TailSlips",
    description: "The agreement for cappers who sell VIP subscriptions on TailSlips.",
    url: "/seller-agreement",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Seller Agreement · TailSlips",
    description: "The agreement for cappers who sell VIP subscriptions on TailSlips.",
  },
};

const H2 = "text-[20px] font-bold mt-9 mb-3";
const P = "text-[var(--color-text-soft)] leading-relaxed mb-4";
const LINK = "underline text-[var(--color-text)] hover:text-[var(--color-mint,#5eead4)]";

/* NOTE FOR FUTURE LAWYER REVIEW: clauses 1 (Who sells), 4 (Refunds and
 * chargebacks) and 9 (Shutoff) carry the most legal risk. */
export default function SellerAgreement() {
  if (!capperVipReachable()) notFound();

  return (
    <>
      <JsonLd
        data={[
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Seller Agreement", path: "/seller-agreement" },
          ]),
        ]}
      />
      <TopNav />
      <main className="max-w-[760px] mx-auto px-4 sm:px-7 pt-10 sm:pt-14 pb-16">
        <h1 className="text-[28px] sm:text-[36px] font-extrabold tracking-[-0.025em] mb-4">
          Seller Agreement
        </h1>
        <p className="text-[var(--color-text-muted)] text-[13px] mb-8">
          Version: {SELLER_AGREEMENT_VERSION}
        </p>

        <p className={P}>
          This agreement is between you (the &quot;capper&quot;) and Fade AI LLC, which operates
          TailSlips. It applies when you sell VIP subscriptions on TailSlips. Plain-language rules
          for VIP picks are on the{" "}
          <a href="/vip-rules" className={LINK}>
            VIP rules
          </a>{" "}
          page, and the general{" "}
          <a href="/terms" className={LINK}>
            Terms of Service
          </a>{" "}
          also apply.
        </p>

        {/* LAWYER REVIEW: clause 1 */}
        <h2 className={H2}>1. Who sells</h2>
        <p className={P}>
          You are the seller. Each subscription is a sale from you to the subscriber, and you are
          the merchant of record. Subscribers are charged directly on your own Stripe connected
          account. TailSlips runs the marketplace: we host your VIP picks, grade them, show them to
          your subscribers, and build the checkout. We do not sell picks and we do not make picks.
        </p>

        <h2 className={H2}>2. Fees</h2>
        <p className={P}>
          TailSlips keeps 15% of each subscription payment. That 15% already includes Stripe&apos;s
          processing and billing costs, so you do not pay those separately. You net at least 85% of
          every payment. Your price is monthly, in US dollars, from $10 to $99. There are no
          trials, promo codes, or annual plans.
        </p>

        <h2 className={H2}>3. Payouts and taxes</h2>
        <p className={P}>
          Stripe pays your earnings out to your bank account on its default schedule. You are
          responsible for your own taxes on what you earn. Stripe issues any tax forms, such as the
          1099-K, directly to you.
        </p>

        {/* LAWYER REVIEW: clause 4 */}
        <h2 className={H2}>4. Refunds and chargebacks</h2>
        <p className={P}>
          Subscriptions are non-refundable, but a subscriber can still dispute a charge with their
          bank, or Stripe can refund a payment. When that happens, the amount is taken from your
          Stripe account. TailSlips keeps its 15% fee and does not refund it. You also bear
          Stripe&apos;s dispute fee. Any money taken back from a payment comes out of your Stripe
          account.
        </p>

        <h2 className={H2}>5. Who can sell</h2>
        <p className={P}>
          You can start selling only after a winning stretch: over the trailing 30 days, at least
          20 graded picks staked at 0.5u or more with net units above zero. Once selling, you stay
          open while the trailing 60 days are positive. Eligibility is checked every night, and two
          failed nights in a row switch selling off. Public and VIP picks are combined in those
          numbers.
        </p>
        <p className={P}>
          Your VIP picks are shown only to your subscribers until 30 minutes after the scheduled
          start. After that everyone can see them. Every pick is graded publicly by the same code
          as every other capper, and counts on the leaderboard.
        </p>

        <h2 className={H2}>6. Billing pause</h2>
        <p className={P}>
          Billing pauses if you go cold, meaning you have had no eligible sport for 7 days, or if you
          go silent, meaning you have posted no VIP pick for 14 days. Subscribers are not charged while it is paused, and
          their next billing date moves out by the days they paid for but you could not post. If
          Stripe restricts your account, billing pauses as well. Billing resumes when you are back.
        </p>

        <h2 className={H2}>7. Stop selling</h2>
        <p className={P}>
          You can stop selling at any time. When you do, all of your subscriptions are cancelled
          and nobody is charged again. Every subscriber keeps access through the date they already
          paid for.
        </p>

        <h2 className={H2}>8. Content rules</h2>
        <p className={P}>
          Do not guarantee wins or promise returns. Do not impersonate another person or capper.
          Do not post anything unlawful, misleading, or abusive. Every pick is your own, and past
          results do not predict future ones.
        </p>

        {/* LAWYER REVIEW: clause 9 */}
        <h2 className={H2}>9. Shutoff</h2>
        <p className={P}>
          TailSlips may switch off your selling, or remove you as a seller, at any time, including
          if we believe you broke this agreement or the Terms of Service, or if Stripe asks us to.
          If we do, we will cancel your subscriptions so nobody is charged again, and subscribers
          keep access through the date they already paid for.
        </p>

        <h2 className={H2}>10. Stripe</h2>
        <p className={P}>
          Payments run on Stripe. By selling on TailSlips you accept the{" "}
          <a
            href="https://stripe.com/connect-account/legal/full"
            className={LINK}
            target="_blank"
            rel="noopener noreferrer"
          >
            Stripe Connected Account Agreement
          </a>
          . If Stripe closes or restricts your account, that affects your ability to sell here.
        </p>

        <h2 className={H2}>11. Changes and contact</h2>
        <p className={P}>
          We may change this agreement. When we do, we will update the version above and ask you
          to accept the new version before you keep selling. Questions can be sent to{" "}
          <a href="mailto:support@tailslips.com" className={LINK}>
            support@tailslips.com
          </a>
          .
        </p>
      </main>
    </>
  );
}
