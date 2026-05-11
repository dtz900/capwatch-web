import { TopNav } from "@/components/nav/TopNav";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbNode, methodologyArticleNode } from "@/lib/jsonld";

export const metadata = {
  title: "Methodology",
  description:
    "How TailSlips grades MLB Twitter cappers: what counts as a verifiable pick, what doesn't, and why every account on the leaderboard is judged by the same rules.",
  alternates: { canonical: "/methodology" },
  openGraph: {
    title: "Methodology · TailSlips",
    description:
      "What TailSlips tracks, why it exists, and the rules every account on the leaderboard is graded by.",
    url: "/methodology",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Methodology · TailSlips",
    description: "How TailSlips grades MLB Twitter cappers, with the same rules applied to every account.",
  },
};

export default function Methodology() {
  return (
    <>
      <JsonLd
        data={[
          methodologyArticleNode(),
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Methodology", path: "/methodology" },
          ]),
        ]}
      />
      <TopNav />
      <main className="max-w-[760px] mx-auto px-4 sm:px-7 pt-10 sm:pt-14 pb-16">
        <h1 className="text-[28px] sm:text-[36px] font-extrabold tracking-[-0.025em] mb-4">
          Methodology
        </h1>

        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          Twitter is full of cappers posting picks. Most of them claim records you cannot verify.
          That is the problem TailSlips solves.
        </p>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          We track every public pick from a curated list of sports-betting accounts. Picks are
          graded against the final outcome of the game, at the odds and units the capper actually
          posted. The leaderboard is the receipts, every account judged by the same rules.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Why this exists</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          A capper who tweets ten picks and only references the wins is selling a different account
          than a capper who tweets ten picks and grades every one of them. Most public-facing capper
          records are the first kind. TailSlips is built around the second. Every public pick a
          tracked account posts is captured at the moment it goes live and graded later, win or
          lose, at the odds and stake the capper actually committed to.
        </p>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          That means the leaderboard reflects what really happened, not what got highlighted. A
          capper sitting at the top of TailSlips is at the top because their full body of work,
          including the picks they would rather forget, nets out positive.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">What counts as a pick</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          A tweet becomes a graded pick when it contains a clear wager: a side or selection, a line
          where applicable, the odds taken, and the unit stake. The four pieces of information that
          make a wager actionable are the four pieces TailSlips needs to grade it. If any are
          missing, the pick is logged for review rather than auto-graded.
        </p>
        <ul className="list-disc list-inside text-[var(--color-text-soft)] space-y-2 leading-relaxed mb-4">
          <li>Public picks posted on the open timeline</li>
          <li>Captured at the moment the pick is posted, not retroactively</li>
          <li>Locked at the odds and units the capper posted, not adjusted later</li>
          <li>Graded against the actual final outcome of the game</li>
          <li>The same grading rules applied to every tracked account</li>
        </ul>

        <h2 className="text-[20px] font-bold mt-9 mb-3">What doesn&apos;t</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          Not every tweet that mentions a team or a line is a pick. The leaderboard would be useless
          if it were padded with stat sheets, hot takes, and giveaway promos. The rules below
          define what stays out.
        </p>
        <ul className="list-disc list-inside text-[var(--color-text-soft)] space-y-2 leading-relaxed mb-4">
          <li>Picks behind paywalls, in subscriber DMs, or in private Discord rooms</li>
          <li>Picks that lock the wager terms behind paid-content language</li>
          <li>Tweets that name a subject but hide the side, line, odds, or stake</li>
          <li>Picks edited or deleted after the game starts</li>
          <li>Anything ambiguous enough that a clear wager cannot be identified</li>
          <li>Picks tied to a postponed game, which are voided rather than graded</li>
          <li>Stat sheets and probability tables, even when they list players and numbers</li>
          <li>Pure giveaway and engagement-bait posts</li>
          <li>Futures, season-long, and award bets that don&apos;t resolve on a single game</li>
        </ul>

        <h2 className="text-[20px] font-bold mt-9 mb-3">How grading works</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          Once a game finalizes, every pick tied to it is graded against the box score. A win pays
          out at the posted odds, a loss is the unit stake, a push returns the stake, and a void
          (postponed, suspended early, or an outcome that the wager cannot resolve against) takes
          the pick out of the record without counting as a result either way. The math is the same
          math any sportsbook uses to settle a bet. There is no ranking adjustment, no
          handicapping, no hindsight grading.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">When a capper doesn&apos;t post the odds</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          Some cappers post a moneyline pick without specifying the American odds they took.
          Rather than fabricating a default, we grade those picks against the Pinnacle closing
          line for the same game and side. Pinnacle is widely accepted as the sharpest book,
          and the close is the consensus probability at first pitch, both factors that make it
          the fairest available proxy when the capper has not given us a number.
        </p>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          Picks graded this way are marked with a small &quot;(close)&quot; indicator next to the
          odds in the history table, so you can see at a glance which lines were graded against
          literal posted odds and which were graded against the Pinnacle close. This is moneyline
          only. Spreads and totals cluster near -110 in practice, so when those markets are
          posted without odds we use a -110 default and disclose it the same way.
        </p>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          Player props are different. Prop odds vary widely between players (a star hitter&apos;s
          1+ hits is priced very differently from a bench bat&apos;s), and Pinnacle&apos;s prop
          coverage is sparse. So when a capper posts a player prop without committing to specific
          odds, we grade it on outcome only: the pick still counts toward Win %, but it is
          excluded from the unit profit and ROI calculation. Those rows show &quot;no odds&quot;
          in the history table where the odds and profit would normally be. The capper gets
          credit for being right or wrong, without a fabricated payout shaping the bottom line.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Parlays</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          Parlays are graded as a single wager against the combined odds the capper posted. Every
          leg has to win for the parlay to win. If any leg pushes or voids, that leg drops out and
          the parlay is recomputed against the remaining legs. The parlay&apos;s line in the
          record is one entry, not one per leg.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Reposts and edits</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          Cappers sometimes delete and repost the same pick to fix a typo, swap a header, or clean
          up the formatting. TailSlips treats those as the same wager and only counts them once.
          What does not count as a credibility-preserving repost: deleting a pick because the line
          moved against you and not putting it back up.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Doubleheaders and game binding</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          When two teams play twice in one day, picks are bound to the specific game the capper
          named (Game 1, Game 2, or by pitching matchup). When a player prop names a player whose
          team plays a doubleheader, the prop binds to the game the named player started. Wrong
          binding is a real failure mode and gets caught in the audit pass before grades go public.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">Same rules, every account</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          The model entry on the leaderboard, the FADE AI account, is graded by the exact same
          rules as every human capper. No special treatment, no hand-waving on its losses. If
          something disqualifies a pick from a human capper&apos;s record, it disqualifies the same
          pick from the model&apos;s.
        </p>

        <h2 className="text-[20px] font-bold mt-9 mb-3">What you can verify</h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          Every pick on every profile links back to the original tweet. Click through and you see
          what the capper posted, when they posted it, and what odds and units they committed to.
          The grade you see is computed from the final game outcome a public sportsbook also has on
          file. There is no hidden math.
        </p>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          The full pick history for every tracked account, wins and losses, is on their profile.
        </p>

        <h2 id="for-cappers" className="text-[20px] font-bold mt-12 mb-3">
          If you&apos;re a capper
        </h2>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          The number on your TailSlips profile will almost never match the spreadsheet you keep
          yourself. That is intentional, and the reason it differs is the whole point of this site.
          A few specifics worth knowing if you arrive here ready to dispute something.
        </p>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          <strong className="text-[var(--color-text)] font-bold">Your record is computed from publicly posted, fully specified picks.</strong>{" "}
          A tweet has to declare the side or selection, the line where applicable, the odds taken,
          and the unit stake before we can grade it. Picks that hide any of those behind paid
          content, lock emojis with no number attached, or vague language are kept out of the
          record. Most missing picks fall into this bucket, and they are missing on purpose.
        </p>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          <strong className="text-[var(--color-text)] font-bold">We do not retroactively delete losses.</strong>{" "}
          Once a pick is captured and the game finalizes, the grade is permanent. Deleting the
          original tweet does not pull the row off your record. If anything, deleting a losing
          pick is detected and surfaced as a credibility signal of its own.
        </p>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          <strong className="text-[var(--color-text)] font-bold">Moneylines without posted odds are graded at the Pinnacle close.</strong>{" "}
          Spreads and totals default to -110. Player props posted without odds count toward your
          win rate but stay out of units profit. All three are disclosed on the row itself. See
          the &quot;When a capper doesn&apos;t post the odds&quot; section above for the full
          rationale.
        </p>
        <p className="text-[var(--color-text-soft)] leading-relaxed mb-4">
          <strong className="text-[var(--color-text)] font-bold">If you find a genuinely misattributed pick</strong>{" "}
          (wrong game binding, wrong player, parser misread of your odds), email{" "}
          <a
            href="mailto:corrections@tailslips.com"
            className="underline text-[var(--color-text)] hover:text-[var(--color-mint,#5eead4)]"
          >
            corrections@tailslips.com
          </a>{" "}
          with the tweet link and what should be different. Real errors get fixed, usually within
          a day. We do not honor requests to remove losing picks, fabricate odds the tweet did not
          declare, or recategorize stakeless &quot;locks&quot; as graded wagers.
        </p>
      </main>
    </>
  );
}
