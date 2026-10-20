"use client";
import { useEffect, useState } from "react";
import contestJson from "../../../public/splash-contest.json";
import { activeContests, type SplashContest, type SplashContestFile } from "@/lib/tof/contest";

/* The paid pools TailSlips runs on Splash Sports, in the inline slot the
   sportsbook banner used to hold (sunset 2026-10-20 after 34K impressions,
   204 clicks and no signups). One row per open contest; the whole module
   disappears when nothing is open so a page never shows an empty box. The
   rewards disclosure stays on the module (FTC endorsement guidance and
   Splash's commissioner terms both want it next to the link). */

interface Props {
  /** Stable slug for the surface, carried as utm_content on the link so
      Splash's referral reporting can tell home, slate and capper apart. */
  placement: string;
  className?: string;
}

export function SplashContests({ placement, className = "" }: Props) {
  // Computed during render so the server HTML already carries the module
  // and the streamed board's slot never collapses before hydration (Codex on
  // #206). The pages are ISR (60 to 300 s), so the baked answer can be a few
  // minutes stale at a lock boundary; the effect re-checks on mount and every
  // minute after, so a contest that closes while the tab is open disappears
  // without a reload.
  const [contests, setContests] = useState<SplashContest[]>(() => activeContests(contestJson as SplashContestFile));
  useEffect(() => {
    const tick = () => setContests(activeContests(contestJson as SplashContestFile));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  if (contests.length === 0) return null;

  return (
    <section
      aria-label="TailSlips contests on Splash Sports"
      className={`w-full max-w-[720px] overflow-hidden rounded-xl border border-[rgba(245,197,74,0.35)] bg-[rgba(255,255,255,0.025)] shadow-[0_0_28px_-14px_rgba(245,197,74,0.4)] ${className}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[rgba(9,11,12,0.6)] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="font-[family-name:var(--font-display)] text-[13px] tracking-[0.08em] text-[var(--color-gold)]">
            TAILSLIPS CONTESTS
          </span>
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] sm:inline">
            hosted on
          </span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/splash-logo-white.svg" alt="Splash Sports" className="h-[14px] w-auto opacity-90" />
      </header>
      <ul className="divide-y divide-[var(--color-border)]">
        {contests.map((c) => (
          <li key={c.url}>
            <ContestRow contest={c} placement={placement} />
          </li>
        ))}
      </ul>
      <footer className="px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
        Paid entry on Splash Sports · 18+ where legal · TailSlips earns commissioner rewards
      </footer>
    </section>
  );
}

function ContestRow({ contest, placement }: { contest: SplashContest; placement: string }) {
  return (
    <a
      href={withPlacement(contest.url, placement)}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[rgba(245,197,74,0.05)]"
    >
      {contest.sport && (
        <span className="shrink-0 rounded-md border border-[rgba(25,245,124,0.35)] px-1.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--color-pos)]">
          {contest.sport}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-extrabold text-[var(--color-text)]">{contest.title}</div>
        <div className="truncate text-[12px] font-medium text-[var(--color-text-soft)]">
          <span className="font-bold text-[var(--color-gold)]">{contest.entry}</span>
          {" entry · pays "}
          {contest.pays}
          {" · "}
          {contest.lock_label}
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-[var(--color-gold)] px-3 py-1.5 text-[12px] font-extrabold text-[#0a0a0c] transition-transform group-hover:scale-[1.03]">
        Enter
      </span>
    </a>
  );
}

/** Tag the Splash link with the surface it was clicked from. Splash already
    puts utm_* on its invite links; utm_content is replaced rather than
    appended twice so the campaign attribution they set stays intact. */
export function withPlacement(url: string, placement: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_content", `tailslips-${placement}`);
    return u.toString();
  } catch {
    return url;
  }
}
