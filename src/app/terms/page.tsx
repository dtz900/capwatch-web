import { TopNav } from "@/components/nav/TopNav";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbNode } from "@/lib/jsonld";

export const metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern use of TailSlips: eligibility, account conduct, the Tail or Fade game, affiliate links, disclaimers, and limitation of liability.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Terms of Service · TailSlips",
    description: "The terms that govern use of TailSlips.",
    url: "/terms",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service · TailSlips",
    description: "The terms that govern use of TailSlips.",
  },
};

export default function Terms() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Terms of Service", path: "/terms" },
          ]),
        ]}
      />
      <TopNav />
      <main className="max-w-[760px] mx-auto px-4 sm:px-7 pt-10 sm:pt-14 pb-16">
        <h1 className="text-[28px] sm:text-[36px] font-extrabold tracking-[-0.025em] mb-4">
          Terms of Service
        </h1>
        <p className="text-[var(--color-text-muted)] text-[13px] mb-8">
          Last updated: 2026-10-03
        </p>

        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          TailSlips (the &quot;Site&quot;) is operated by Fade AI LLC, a California limited liability
          company (&quot;we,&quot; &quot;us,&quot; or &quot;the Company&quot;). These Terms of
          Service (&quot;Terms&quot;) govern your access to and use of the Site, including any
          account you create, the Tail or Fade game, and any content, data, or features we make
          available. By accessing or using the Site, you agree to these Terms. If you do not
          agree, do not use the Site.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Acceptance of these terms</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          Using the Site in any way, including browsing without an account, means you accept these
          Terms as they stand at the time of your visit. We may update these Terms from time to
          time, as described in the Changes section below. Continued use of the Site after an
          update means you accept the revised Terms.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Eligibility</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          You must be at least 21 years old to create an account or use any feature of the Site
          that references sports wagering, including the Tail or Fade game. The Site is informational.
          It does not accept wagers, process bets, or move money on behalf of any user, but because
          its content concerns sports betting, we hold account creation and participation to the same
          minimum age that applies to legal sports wagering in the United States. By creating an
          account, you represent that you meet this age requirement and that your use of the Site
          complies with the laws that apply to you in your location.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Not betting advice</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          The Site is informational only. Nothing on the Site, including capper records, grades,
          leaderboards, methodology pages, or any commentary, is betting advice, investment advice,
          or a recommendation to place any wager. Sports betting involves risk, and outcomes are
          never guaranteed. You are solely responsible for any betting or financial decision you
          make, whether or not it is informed by anything you see on the Site.
        </p>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          Records shown for tracked accounts are compiled from posts those accounts made publicly
          on X (formerly Twitter). We grade those posts against publicly available game outcomes
          using the rules described on our{" "}
          <a href="/methodology" className="underline text-[var(--color-text)] hover:text-[var(--color-mint,#5eead4)]">
            methodology
          </a>{" "}
          page. We do not guarantee the accuracy, completeness, or timeliness of any record, grade,
          odds figure, or statistic on the Site. Data can be delayed, incomplete, or affected by
          parsing error, and we correct genuine errors when they are reported, but we make no
          warranty that the Site is error free.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Accounts</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          Creating an account requires an email address, which we use to send a one-time sign-in
          link. You may optionally link an X account to verify your identity as a tracked capper or
          to personalize your experience. You are responsible for keeping access to your email and
          any linked account secure, and for all activity that happens under your account. Notify
          us promptly if you believe your account has been accessed without your permission.
        </p>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          We may suspend or terminate an account at our discretion, including for violation of these
          Terms, abuse of the Site, fraudulent activity, or conduct that we reasonably believe harms
          other users or the Site itself.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">User conduct</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          You agree not to: misuse the Site or attempt to disrupt its operation; scrape, mirror, or
          republish Site data at scale without permission; attempt to circumvent access controls;
          impersonate another person or capper; submit false, misleading, or abusive content; or use
          the Site for any unlawful purpose.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">User content</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          Your username, any avatar image you upload, and any profile information you choose to
          provide are &quot;User Content.&quot; You retain ownership of your User Content, but you
          grant us a non-exclusive, worldwide, royalty-free license to display it on the Site as
          part of your account, leaderboard entries, and any feature that shows user activity. You
          represent that you own or have the right to use any image you upload and that it does not
          infringe anyone else&apos;s rights or violate any law. We may remove User Content that
          violates these Terms.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Tail or Fade game and prizes</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          Tail or Fade is a free swipe-based prediction game. No purchase, payment, or wager is
          required or accepted to participate, and no purchase will increase your chances of
          winning. Eligibility, scoring, prize structure, and the schedule of any monthly prize
          period are set at our discretion and may change or be discontinued at any time without
          notice. Where a prize is offered, we determine winners, verify eligibility, and may
          require a winner to confirm identity and age (21+) before a prize is awarded. Prizes have
          no cash value unless stated otherwise and are not transferable. You are responsible for
          any taxes owed on a prize you receive, and we may issue tax forms as required by law. We
          reserve the right to disqualify any entry or participant we reasonably believe is
          fraudulent, abusive, or in violation of these Terms, and to cancel, suspend, or modify the
          game at our discretion.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Affiliate links</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          The Site may contain affiliate links to sportsbooks or other third-party services. If you
          click one of these links and sign up or place a wager with that service, we may earn a
          commission. This does not affect the information or grades we publish, and it does not
          cost you anything beyond what you would otherwise pay that third party. We are not
          responsible for the content, terms, or conduct of any third-party service we link to.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Intellectual property</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          The Site, including its design, text, graphics, software, and the compilation and
          presentation of capper data, is owned by Fade AI LLC or its licensors and is protected by
          applicable intellectual property laws. You may view and share Site pages for personal,
          non-commercial use. You may not copy, reproduce, republish, or create derivative works
          from the Site or its data for commercial purposes without our prior written permission.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Termination</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          We may suspend or terminate your access to the Site at any time, with or without cause or
          notice, including if we believe you have violated these Terms. You may stop using the
          Site and request deletion of your account at any time by contacting us. Sections of these
          Terms that by their nature should survive termination, including disclaimers, limitation
          of liability, and governing law, will survive.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Disclaimers</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          The Site and all content on it are provided &quot;as is&quot; and &quot;as available,&quot;
          without warranties of any kind, express or implied, including warranties of merchantability,
          fitness for a particular purpose, non-infringement, or that the Site will be uninterrupted,
          secure, or error free. We do not warrant the accuracy of any statistic, grade, odds figure,
          or record published on the Site.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Limitation of liability</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          To the fullest extent permitted by law, Fade AI LLC and its officers, members, and
          contributors will not be liable for any indirect, incidental, special, consequential, or
          punitive damages, or any loss of profits, revenue, or data, arising from your use of the
          Site, any wager you place that was in any way informed by the Site, or your participation
          in the Tail or Fade game, even if we have been advised of the possibility of such damages.
          Our total liability for any claim arising from these Terms or your use of the Site will
          not exceed one hundred dollars.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Governing law</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          These Terms are governed by the laws of the State of California, without regard to its
          conflict-of-laws principles. Any dispute arising from these Terms or your use of the Site
          will be subject to the exclusive jurisdiction of the state and federal courts located in
          California.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Changes to these terms</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          We may revise these Terms at any time. When we make a material change, we will update the
          &quot;Last updated&quot; date at the top of this page. Your continued use of the Site
          after a revision takes effect constitutes acceptance of the revised Terms.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Contact</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          Questions about these Terms can be sent to{" "}
          <a
            href="mailto:corrections@tailslips.com"
            className="underline text-[var(--color-text)] hover:text-[var(--color-mint,#5eead4)]"
          >
            corrections@tailslips.com
          </a>
          .
        </p>
      </main>
    </>
  );
}
