"use client";
import { useEffect, useState } from "react";
import contestJson from "../../../public/splash-contest.json";
import { activeContests, type SplashContest, type SplashContestFile } from "@/lib/tof/contest";

/* The paid pools TailSlips runs on Splash Sports, in the inline slot the
   sportsbook banner used to hold (sunset 2026-10-20 after 34K impressions,
   204 clicks and no signups). One promo card per open contest, built like a
   sportsbook promo rather than a list row: stencil headline, the pot as the
   hero line, pill facts, one CTA, the league mark as art. The whole module
   disappears when nothing is open so a page never shows an empty box.

   It is the one light surface on the page on purpose: the off-white stops
   the eye the way the old banner did. The rewards disclosure stays on the
   card (FTC endorsement guidance and Splash's commissioner terms both want
   it next to the link). */

interface Props {
  /** Stable slug for the surface, carried as utm_content on the link so
      Splash's referral reporting can tell home, slate and capper apart. */
  placement: string;
  className?: string;
}

const OFF_WHITE = "#f7f3e9";
const INK = "#0a0a0c";
const INK_MUTED = "#8a857c";

const LEAGUE_LOGO: Record<string, string> = {
  mlb: "https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png",
  nfl: "https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png",
  nba: "https://a.espncdn.com/i/teamlogos/leagues/500/nba.png",
};

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
    <section aria-label="TailSlips contests on Splash Sports" className={`flex w-full flex-col gap-4 ${className}`}>
      {contests.map((c) => (
        <PromoCard key={c.url} contest={c} placement={placement} />
      ))}
    </section>
  );
}

function PromoCard({ contest, placement }: { contest: SplashContest; placement: string }) {
  const sport = contest.sport?.toLowerCase() ?? "";
  const logo = LEAGUE_LOGO[sport];
  const headline = contest.headline ?? contest.title;
  const facts = contest.facts ?? [contest.entry + " entry", "pays " + contest.pays, contest.lock_label];
  return (
    <a
      href={withPlacement(contest.url, placement)}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block w-full overflow-hidden rounded-lg border border-[rgba(0,0,0,0.12)] shadow-[0_10px_30px_-16px_rgba(0,0,0,0.7)]"
      style={{ background: OFF_WHITE, color: INK }}
    >
      {/* Diagonal field behind the right half, the same stripe language as
          Splash's own contest banners, kept faint so the type leads. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-[58%]"
        style={{
          background:
            "repeating-linear-gradient(-55deg, rgba(10,10,12,0.045) 0 14px, rgba(10,10,12,0) 14px 34px)",
          maskImage: "linear-gradient(90deg, rgba(0,0,0,0) 0%, #000 35%)",
          WebkitMaskImage: "linear-gradient(90deg, rgba(0,0,0,0) 0%, #000 35%)",
        }}
      />
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-10 h-[260px] w-[260px] rotate-[-8deg] object-contain opacity-[0.07] sm:right-[220px] sm:-top-14 sm:h-[320px] sm:w-[320px]"
        />
      )}

      <div className="relative flex flex-col gap-4 px-5 pb-4 pt-4 sm:flex-row sm:items-center sm:gap-6 sm:px-7 sm:pb-5 sm:pt-5">
        <div className="min-w-0 flex-1">
          {/* Brand lockup */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-horizontal-tight.png" alt="TailSlips" className="h-[18px] w-auto" style={{ filter: "brightness(0)" }} />
            <span aria-hidden="true" className="text-[13px] font-bold" style={{ color: INK_MUTED }}>×</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/splash-logo-dark.svg" alt="Splash Sports" className="h-[13px] w-auto" />
            {contest.sport && (
              <span className="ml-1 whitespace-nowrap rounded-sm px-1.5 py-[2px] text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ background: INK, color: OFF_WHITE }}>
                {contest.sport} contest
              </span>
            )}
          </div>

          <h3
            className="mt-2.5 font-[family-name:var(--font-display)] text-[34px] leading-[0.95] tracking-[0.01em] sm:text-[44px]"
            style={{ color: INK }}
          >
            {headline}
          </h3>
          {contest.tagline && (
            <p className="mt-1.5 text-[16px] font-extrabold leading-tight sm:text-[19px]" style={{ color: INK }}>
              {contest.tagline}
            </p>
          )}

          <ul className="mt-3 grid grid-cols-2 items-stretch gap-2 sm:flex sm:flex-wrap">
            {facts.map((f) => (
              <li
                key={f}
                className="flex items-center justify-center rounded-md border px-2 py-1.5 text-center text-[11px] font-extrabold uppercase leading-tight tracking-[0.04em] sm:whitespace-nowrap sm:rounded-full sm:px-3 sm:py-1 sm:text-[12px] sm:tracking-[0.06em]"
                style={{ borderColor: "rgba(10,10,12,0.3)", color: INK }}
              >
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex shrink-0 items-center gap-5 sm:flex-col sm:items-end sm:gap-3">
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={contest.sport} className="hidden h-[84px] w-[84px] object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)] sm:block" />
          )}
          <span
            className="inline-flex w-full items-center justify-center rounded-md px-6 py-3.5 text-[14px] font-extrabold uppercase tracking-[0.08em] transition-transform group-hover:scale-[1.02] sm:w-auto"
            style={{ background: INK, color: OFF_WHITE }}
          >
            Enter on Splash
          </span>
        </div>
      </div>

      <div
        className="relative border-t px-5 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] sm:px-7"
        style={{ borderColor: "rgba(10,10,12,0.08)", color: INK_MUTED }}
      >
        Paid entry on Splash Sports · TailSlips earns commissioner rewards
      </div>
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
