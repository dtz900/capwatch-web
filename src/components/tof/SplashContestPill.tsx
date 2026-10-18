"use client";
import { useEffect, useState } from "react";
import contestJson from "../../../public/splash-contest.json";
import { activeContest, type SplashContest } from "@/lib/tof/contest";

/* One line under the Tail or Fade title, visible whether the table is folded
   or open: the day's paid contest on Splash. Free game above, paid pool
   here, same slate. The rewards disclosure stays on the pill itself (FTC
   endorsement guidance and Splash's commissioner terms both want it next to
   the link, not in a footer). */
export function SplashContestPill() {
  // Rendered on the client only: the show/hide decision is "today in PT",
  // and an ISR page would otherwise bake in the build-time answer.
  const [contest, setContest] = useState<SplashContest | null>(null);
  useEffect(() => {
    const tick = () => setContest(activeContest(contestJson as SplashContest));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  if (!contest) return null;
  return (
    <div className="pp-rise mx-auto mt-3 flex max-w-[560px] flex-col items-center gap-1.5 text-center">
      <a
        href={contest.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex max-w-full items-center gap-2.5 rounded-full border border-[rgba(245,197,74,0.55)] bg-[rgba(9,11,12,0.78)] py-1.5 pl-1.5 pr-4 shadow-[0_6px_18px_rgba(0,0,0,0.4)] transition-colors hover:border-[var(--color-gold)]"
      >
        <span className="shrink-0 rounded-full bg-[var(--color-gold)] px-2.5 py-1 font-[family-name:var(--font-display)] text-[12px] tracking-[0.06em] text-[#0a0a0c]">
          {contest.entry} CONTEST
        </span>
        <span className="min-w-0 truncate text-[13px] font-extrabold text-[var(--color-text)]">{contest.title}</span>
        <span className="hidden shrink-0 text-[12px] font-semibold text-[var(--color-text-soft)] sm:inline">pays {contest.pays}</span>
        <span className="shrink-0 text-[12px] font-bold text-[var(--color-gold)] group-hover:underline">Enter on Splash</span>
      </a>
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        {contest.lock_label} · hosted on Splash Sports · TailSlips earns commissioner rewards
      </div>
    </div>
  );
}
