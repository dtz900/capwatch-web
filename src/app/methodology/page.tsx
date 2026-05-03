import { TopNav } from "@/components/nav/TopNav";

export const metadata = {
  title: "Methodology · TailSlips",
  description:
    "What TailSlips tracks, why it exists, and the rules every account on the leaderboard is graded by.",
};

export default function Methodology() {
  return (
    <>
      <TopNav />
      <main className="max-w-[760px] mx-auto px-4 sm:px-7 pt-10 sm:pt-14 pb-16">
        <h1 className="text-[28px] sm:text-[36px] font-extrabold tracking-[-0.025em] mb-4">Methodology</h1>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          Twitter is full of cappers posting picks. Most of them claim records you cannot verify. That is the
          problem TailSlips solves.
        </p>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          We track every public pick from a curated list of sports-betting accounts. Picks are graded against the
          final outcome of the game, at the odds and units the capper actually posted. The leaderboard is the
          receipts.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">What counts</h2>
        <ul className="list-disc list-inside text-[var(--color-text-soft)] space-y-2 leading-relaxed">
          <li>Public picks posted on the open timeline</li>
          <li>Captured at the moment the pick is posted, not retroactively</li>
          <li>Graded against the actual final outcome of the game</li>
          <li>The same grading rules for every tracked account</li>
        </ul>

        <h2 className="text-[20px] font-bold mt-9 mb-3">What doesn&apos;t</h2>
        <ul className="list-disc list-inside text-[var(--color-text-soft)] space-y-2 leading-relaxed">
          <li>Picks behind paywalls, in subscriber DMs, or in private Discord rooms</li>
          <li>Picks edited or deleted after the game starts</li>
          <li>Anything ambiguous enough that a clear wager can&apos;t be identified</li>
          <li>Picks tied to a postponed game (these are voided, not graded)</li>
        </ul>

        <p className="text-[var(--color-text-soft)] leading-relaxed mt-9">
          The full pick history for every account, wins and losses, is on their profile.
        </p>
      </main>
    </>
  );
}
