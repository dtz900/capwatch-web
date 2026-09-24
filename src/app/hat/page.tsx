import Link from "next/link";
import { TopNav } from "@/components/nav/TopNav";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbNode } from "@/lib/jsonld";

export const metadata = {
  title: "The Hat",
  description:
    "Every month the player on top of the TailSlips Tail or Fade board gets a hat. Free to play, nothing wagered, and you cannot buy one.",
  alternates: { canonical: "/hat" },
  openGraph: {
    title: "The Hat · TailSlips",
    description:
      "Win the monthly Tail or Fade board, get the hat. Free to play, nothing wagered, not for sale.",
    url: "/hat",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Hat · TailSlips",
    description: "Top the monthly Tail or Fade board and the hat is yours. It is not for sale.",
  },
};

function Rule({ children }: { children: React.ReactNode }) {
  return <li className="text-[var(--color-text-soft)] leading-relaxed mb-2 pl-1">{children}</li>;
}

export default function Hat() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "The Hat", path: "/hat" },
          ]),
        ]}
      />
      <TopNav />
      <main className="max-w-[760px] mx-auto px-4 sm:px-7 pt-10 sm:pt-14 pb-16">
        <h1 className="text-[28px] sm:text-[36px] font-extrabold tracking-[-0.025em] mb-4">
          The Hat
        </h1>

        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          Every month, whoever finishes on top of the{" "}
          <Link href="/" className="underline hover:text-[var(--color-text)]">
            Tail or Fade
          </Link>{" "}
          board gets a hat. It is not in a store and there is no price on it. Winning the board is
          the only way to get one.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">How to win it</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          Play the daily hand. You are shown real picks from tracked cappers with the capper hidden,
          and you call each one tail or fade. Your calls are graded against the actual result once
          the games land.
        </p>
        <ul className="mb-4 list-disc pl-5">
          <Rule>
            Every card is worth <strong className="text-[var(--color-text)]">one unit</strong>. A
            tail scores at the odds the capper posted. A fade scores at the Pinnacle close, which is
            the market price on the side you took instead.
          </Rule>
          <Rule>
            You need at least <strong className="text-[var(--color-text)]">10 graded plays</strong>{" "}
            inside the calendar month to appear on the board at all.
          </Rule>
          <Rule>
            The board ranks by <strong className="text-[var(--color-text)]">units won</strong>. Most
            units on the last day of the month wins the hat.
          </Rule>
          <Rule>
            Ties go to the player with more graded plays. Still tied, the higher win rate. Still tied
            after that, we flip a coin and post the video.
          </Rule>
        </ul>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Nothing is wagered</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          Tail or Fade is free. There is no buy-in, no entry fee, and no wager of any kind. You are
          not risking money and you cannot lose any. Units on the board are a score, not a balance.
        </p>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          Eligibility will never require a paid subscription. If TailSlips launches paid tools later,
          the hat stays attached to the free board, and paying for anything will not improve your
          odds of winning it.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Claiming it</h2>
        <ul className="mb-4 list-disc pl-5">
          <Rule>
            The month closes at 11:59 PM Pacific on its last day. The board is final once the last
            game of the month grades.
          </Rule>
          <Rule>
            We announce the winner from{" "}
            <a
              href="https://x.com/tailslips"
              className="underline hover:text-[var(--color-text)]"
              rel="noopener noreferrer"
              target="_blank"
            >
              @tailslips
            </a>{" "}
            within three days of the month closing, and message the winning account.
          </Rule>
          <Rule>
            To claim, confirm the account is yours and send us a shipping address within 14 days.
            Usually that means verifying your X account on your{" "}
            <Link href="/account" className="underline hover:text-[var(--color-text)]">
              account page
            </Link>
            . If that option is not available to you, reply to us and we will confirm you another
            way.
          </Rule>
          <Rule>Unclaimed after 14 days, the hat moves to the next player down.</Rule>
        </ul>

        <h2 className="text-[20px] font-bold mt-9 mb-3">The fine print</h2>
        <ul className="mb-4 list-disc pl-5">
          <Rule>
            No purchase necessary. No purchase, subscription, or payment improves your odds.
          </Rule>
          <Rule>21+. Shipping to United States addresses only. Void where prohibited.</Rule>
          <Rule>One hat per person per month, and one account per person.</Rule>
          <Rule>
            Extra accounts made to farm the board are disqualified, along with the person running
            them. Confirming the winning account at claim time is how we check.
          </Rule>
          <Rule>TailSlips employees and the people who build it are not eligible.</Rule>
          <Rule>
            We can change or end this at any time. Changes get posted on this page, and a month
            already in progress finishes under the rules it started with.
          </Rule>
        </ul>

        <p className="text-[12px] text-[var(--color-text-muted)] leading-relaxed mt-8">
          Questions go to{" "}
          <a
            href="mailto:corrections@tailslips.com"
            className="underline hover:text-[var(--color-text)]"
          >
            corrections@tailslips.com
          </a>
          .
        </p>
      </main>
    </>
  );
}
