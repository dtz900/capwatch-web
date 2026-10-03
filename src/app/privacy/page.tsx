import { TopNav } from "@/components/nav/TopNav";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbNode } from "@/lib/jsonld";

export const metadata = {
  title: "Privacy Policy",
  description:
    "What TailSlips collects, how it is used, who it is shared with, and how to request deletion of your data.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Privacy Policy · TailSlips",
    description: "What TailSlips collects, how it is used, and how to request deletion of your data.",
    url: "/privacy",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy · TailSlips",
    description: "What TailSlips collects, how it is used, and how to request deletion of your data.",
  },
};

export default function Privacy() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Privacy Policy", path: "/privacy" },
          ]),
        ]}
      />
      <TopNav />
      <main className="max-w-[760px] mx-auto px-4 sm:px-7 pt-10 sm:pt-14 pb-16">
        <h1 className="text-[28px] sm:text-[36px] font-extrabold tracking-[-0.025em] mb-4">
          Privacy Policy
        </h1>
        <p className="text-[var(--color-text-muted)] text-[13px] mb-8">
          Last updated: 2026-10-03
        </p>

        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          This Privacy Policy explains what TailSlips (the &quot;Site&quot;), operated by Fade AI
          LLC, a California limited liability company (&quot;we,&quot; &quot;us,&quot; or &quot;the
          Company&quot;), collects, how we use it, who we share it with, and the choices available
          to you. By using the Site, you agree to the collection and use of information as described
          here.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Information we collect</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          We collect information in a few distinct ways:
        </p>
        <ul className="list-disc list-inside text-[var(--color-text-soft)] space-y-2 leading-relaxed mb-4">
          <li>
            <strong className="text-[var(--color-text)] font-bold">Account information.</strong>{" "}
            When you create an account, we collect the email address you sign in with. If you
            choose a username or upload an avatar, we store those too. If you choose to link an X
            (formerly Twitter) account, we store the identity returned by that connection, such as
            your X handle and profile image, so we can verify and display your linked identity.
          </li>
          <li>
            <strong className="text-[var(--color-text)] font-bold">Game and activity data.</strong>{" "}
            If you play Tail or Fade or tail a capper&apos;s pick, we record those swipes and tails
            against your account so we can show your activity back to you and determine game
            results and prize eligibility.
          </li>
          <li>
            <strong className="text-[var(--color-text)] font-bold">Analytics data.</strong> We use
            Vercel Web Analytics and PostHog to understand how the Site is used. These tools use
            cookies and similar technology and may collect information such as pages visited,
            device and browser type, approximate location derived from IP address, and general
            usage patterns. You can opt out of this analytics collection for your browser on our{" "}
            <a href="/exclude-me" className="underline text-[var(--color-text)] hover:text-[var(--color-mint,#5eead4)]">
              exclude me
            </a>{" "}
            page.
          </li>
          <li>
            <strong className="text-[var(--color-text)] font-bold">Server logs.</strong> Our
            hosting and infrastructure providers automatically log standard technical information,
            such as IP address, request timestamps, and error data, for operating and securing the
            Site.
          </li>
        </ul>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Public capper data</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          Separately from account data, the Site tracks and publishes records for sports-betting
          accounts on X based entirely on those accounts&apos; own public posts. We do not collect
          private messages, non-public account information, or anything from an account that has
          not posted it publicly. If you are a tracked capper and believe a record is inaccurate,
          see the correction process described on our{" "}
          <a href="/methodology" className="underline text-[var(--color-text)] hover:text-[var(--color-mint,#5eead4)]">
            methodology
          </a>{" "}
          page.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">How we use information</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          We use the information we collect to operate your account, send the emails you have
          opted into, run the Tail or Fade game and determine prize eligibility, maintain and
          secure the Site, understand how the Site is used so we can improve it, and comply with
          legal obligations.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Email and unsubscribing</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          If you opt in, we may email you a daily &quot;Tail or Fade&quot; hand or an alert when a
          capper you follow posts a new pick. Every email we send includes an unsubscribe link, and
          you can also manage your email preferences from your account page at any time. Turning off
          an email preference stops future emails of that kind but does not affect your account
          itself.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Third parties we use</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          We rely on third-party services to operate the Site. Each processes data under its own
          privacy policy:
        </p>
        <ul className="list-disc list-inside text-[var(--color-text-soft)] space-y-2 leading-relaxed mb-4">
          <li>
            <strong className="text-[var(--color-text)] font-bold">Supabase.</strong> Stores account
            data and authenticates sign-in links.
          </li>
          <li>
            <strong className="text-[var(--color-text)] font-bold">Vercel.</strong> Hosts the Site
            and provides Vercel Web Analytics.
          </li>
          <li>
            <strong className="text-[var(--color-text)] font-bold">PostHog.</strong> Provides
            product analytics, using cookies, to help us understand usage of the Site.
          </li>
          <li>
            <strong className="text-[var(--color-text)] font-bold">Resend.</strong> Delivers the
            transactional and opt-in emails described above.
          </li>
          <li>
            <strong className="text-[var(--color-text)] font-bold">X (Twitter) OAuth.</strong> If
            you choose to link your X account, X provides us the identity information needed to
            verify that link.
          </li>
        </ul>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          We do not sell your personal information to third parties.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Data retention</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          We retain account information for as long as your account is active or as needed to
          provide the Site to you. Public capper pick records are retained indefinitely as the
          historical record the Site exists to maintain, since removing a graded pick would
          misrepresent a tracked account&apos;s public history. We may retain limited information
          after account deletion where required for legal, security, or fraud-prevention purposes.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Deletion requests</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          You can request deletion of your account and the personal information associated with it
          by emailing{" "}
          <a
            href="mailto:support@tailslips.com"
            className="underline text-[var(--color-text)] hover:text-[var(--color-mint,#5eead4)]"
          >
            support@tailslips.com
          </a>{" "}
          from the email address on your account. We will verify the request and remove your
          account information within a reasonable time, subject to the retention exceptions above.
          Deletion of an account does not remove a tracked capper&apos;s public pick history, which
          is derived from that account&apos;s own public posts rather than from any TailSlips
          account.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Children&apos;s privacy</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          The Site is not directed to and is not intended for use by anyone under 18. We do not
          knowingly collect personal information from anyone under 18. If you believe a minor has
          provided us with personal information, contact us and we will delete it.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">California privacy rights</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          If you are a California resident, the California Consumer Privacy Act (CCPA) gives you
          the right to know what personal information we have collected about you, to request
          deletion of that information, and to not be discriminated against for exercising those
          rights. We do not sell or share personal information for cross-context behavioral
          advertising. You can exercise these rights by emailing{" "}
          <a
            href="mailto:support@tailslips.com"
            className="underline text-[var(--color-text)] hover:text-[var(--color-mint,#5eead4)]"
          >
            support@tailslips.com
          </a>
          .
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Changes to this policy</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          We may update this Privacy Policy from time to time. When we make a material change, we
          will update the &quot;Last updated&quot; date at the top of this page. Your continued use
          of the Site after a revision takes effect constitutes acceptance of the revised policy.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Contact</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          Questions about this Privacy Policy, or requests regarding your data, can be sent to{" "}
          <a
            href="mailto:support@tailslips.com"
            className="underline text-[var(--color-text)] hover:text-[var(--color-mint,#5eead4)]"
          >
            support@tailslips.com
          </a>
          .
        </p>
      </main>
    </>
  );
}
