import type React from "react";
import { sponsorDisplay, WEEK_MIN_PLAYS, type TofPrize } from "@/lib/tof/prize";

type Active = { prize: TofPrize; live: boolean };

const START_LABEL = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });

/** The sponsor's wordmark at a given height (width follows the image), or
    their name in text when no logo is configured. */
function SponsorMark({ prize, height, textClass }: { prize: TofPrize; height: number; textClass: string }) {
  const s = sponsorDisplay(prize);
  if (!s.logo) return <span className={textClass}>{s.name}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={s.logo} alt={s.name} className="max-w-none shrink-0" style={{ height, width: "auto" }} />;
}

const AMOUNT_TAG = "tof-prize-glow pointer-events-none inline-block rounded-md border-[1.5px] border-[rgba(245,197,74,0.85)] bg-[#0b0d0c] px-1.5 pb-0.5 pt-1 font-[family-name:var(--font-display)] text-[22px] leading-none tracking-[0.02em] text-[var(--color-gold)]";
const SPONSOR_TAG = "tof-prize-glow pointer-events-none flex items-center gap-1 whitespace-nowrap rounded-full border border-[rgba(245,197,74,0.7)] bg-[#0b0d0c] py-1 px-2.5 font-[family-name:var(--font-sans)] text-[11px] font-bold leading-none tracking-normal normal-case text-[var(--color-text-soft)]";
/* Compact versions for the hint line: no taller than the hint itself. */
const AMOUNT_CHIP = "tof-prize-glow pointer-events-none inline-block rounded border border-[rgba(245,197,74,0.85)] bg-[#0b0d0c] px-1 pb-px pt-0.5 font-[family-name:var(--font-display)] text-[12px] leading-none tracking-[0.02em] text-[var(--color-gold)]";
const SPONSOR_CHIP = "tof-prize-glow pointer-events-none flex items-center gap-1 whitespace-nowrap rounded-full border border-[rgba(245,197,74,0.7)] bg-[#0b0d0c] py-0.5 px-1.5 font-[family-name:var(--font-sans)] text-[9.5px] font-bold leading-none tracking-normal normal-case text-[var(--color-text-soft)]";

function SponsorBody({ prize, logo }: { prize: TofPrize; logo: number }) {
  return (
    <>
      <span>Sponsored by</span>
      <SponsorMark prize={prize} height={logo} textClass="font-extrabold text-[var(--color-text)]" />
    </>
  );
}

/** Prize tags beside the Tail or Fade title on wide screens: the amount left
    of TAIL, the sponsor right of FADE, clear of the lettering and adding no
    height. Decoration inside the title button (the whole title still toggles
    the table); the panel's contest box carries the sponsor link. Render
    inside the relatively positioned title row. */
export function TofPrizeStickers({ active }: { active: Active }) {
  const s = sponsorDisplay(active.prize);
  return (
    <>
      <span aria-hidden="true" className="absolute right-full top-1/2 mr-4 hidden -translate-y-1/2 xl:block">
        <span className={AMOUNT_TAG} style={{ textShadow: "0 2px 0 #6b4e10" }}>{active.prize.amount}</span>
      </span>
      <span aria-hidden="true" className="absolute left-full top-1/2 ml-4 hidden -translate-y-1/2 xl:block">
        <span className={SPONSOR_TAG} style={{ textShadow: "none" }}><SponsorBody prize={active.prize} logo={13} /></span>
      </span>
      <span className="sr-only">{`${active.prize.amount} weekly prize, sponsored by ${s.name}`}</span>
    </>
  );
}

/** Below xl there is no room beside the title, so compact tags flank the
    existing "Tap to play / Tap to close" hint instead of adding a row. */
export function TofPrizeHintRow({ active, className = "", children }: { active: Active | null; className?: string; children: React.ReactNode }) {
  if (!active) return <span className={`flex justify-center ${className}`}>{children}</span>;
  return (
    <span className={`flex items-center justify-center gap-2.5 ${className}`}>
      <span aria-hidden="true" className={`${AMOUNT_CHIP} -my-0.5 xl:hidden`}>{active.prize.amount}</span>
      {children}
      <span aria-hidden="true" className={`${SPONSOR_CHIP} -my-0.5 xl:hidden`}><SponsorBody prize={active.prize} logo={9} /></span>
    </span>
  );
}

/** The contest rules in the open game's "The game" panel. */
export function TofPrizeDetails({ active }: { active: Active }) {
  const { prize, live } = active;
  const s = sponsorDisplay(prize);
  const starts = START_LABEL.format(new Date(`${prize.starts}T12:00:00Z`));
  const rules = [
    "Most units Tuesday through Monday wins",
    `Min ${WEEK_MIN_PLAYS} graded plays to qualify`,
    "Winner announced every Tuesday",
  ];
  return (
    <div className="mt-3 rounded-lg border border-[rgba(245,197,74,0.35)] bg-[rgba(245,197,74,0.07)] px-3 py-3">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--color-gold)]">Weekly contest</div>
      <div className="mt-1 font-[family-name:var(--font-display)] text-[17px] leading-tight text-[var(--color-text)]">
        {live ? `Win ${prize.amount} every week` : `Win ${prize.amount} weekly, starts ${starts}`}
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {rules.map((r) => (
          <li key={r} className="flex gap-2 text-[12px] leading-snug text-[var(--color-text-soft)]">
            <span className="text-[var(--color-gold)]">•</span>
            {r}
          </li>
        ))}
      </ul>
      <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[rgba(255,255,255,0.07)] pt-2.5 hover:underline">
        <span className="whitespace-nowrap text-[11px] font-bold text-[var(--color-text-muted)]">Sponsored by</span>
        <SponsorMark prize={prize} height={14} textClass="text-[11px] font-bold text-[var(--color-text)]" />
        <span className="whitespace-nowrap text-[11px] font-semibold text-[var(--color-text-muted)]">@{prize.sponsor_handle}</span>
      </a>
    </div>
  );
}
