import { TopNav } from "@/components/nav/TopNav";

export const metadata = {
  title: "Methodology · TailSlips",
  description: "How TailSlips ingests, parses, and grades public capper picks.",
};

export default function Methodology() {
  return (
    <>
      <TopNav />
      <main className="max-w-[760px] mx-auto px-4 sm:px-7 pt-10 sm:pt-14 pb-16">
        <h1 className="text-[28px] sm:text-[36px] font-extrabold tracking-[-0.025em] mb-4">Methodology</h1>
        <p className="text-[var(--color-text-soft)] mb-4">
          TailSlips ingests every tweet from a curated list of public sports-betting accounts via the X Filtered Stream.
          A language model parses each tweet into a structured pick. After the game finalizes, the pick is graded against
          the final box score using the closing line. Every account on the leaderboard is graded by the same code path.
        </p>
        <h2 className="text-[20px] font-bold mt-8 mb-3">Disclosure</h2>
        <p className="text-[var(--color-text-soft)] mb-4">
          TailSlips is operated by FADE AI. The @fadeai_ entry on the leaderboard is the FADE AI model. It is parsed and
          graded identically to every other tracked capper. The model has no informational advantage on this surface.
        </p>
        <h2 className="text-[20px] font-bold mt-8 mb-3">Data sources</h2>
        <ul className="list-disc list-inside text-[var(--color-text-soft)] space-y-2">
          <li>Tweets via X API v2 Filtered Stream</li>
          <li>Game outcomes via MLB Stats API and ESPN</li>
          <li>Closing odds via The Odds API (Pinnacle reference book)</li>
        </ul>
      </main>
    </>
  );
}
