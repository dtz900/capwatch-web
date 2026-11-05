import { sponsorDisplay, WEEK_MIN_PLAYS, type TofPrize } from "@/lib/tof/prize";

type Active = { prize: TofPrize; live: boolean };

const START_LABEL = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });

function SponsorLogo({ src, size }: { src: string | null; size: number }) {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-[5px]" style={{ width: size, height: size }} />;
}

/** Two small stickers on the Tail or Fade title's corners: the amount on
    TAIL's top-left, the sponsor on FADE's top-right. Decoration inside the
    title button (the whole title still toggles the table); the panel's
    contest box carries the sponsor link. */
export function TofPrizeStickers({ active }: { active: Active }) {
  const { prize } = active;
  const s = sponsorDisplay(prize);
  return (
    <>
      <span
        aria-hidden="true"
        className="tof-prize-glow pointer-events-none absolute -left-7 -top-3 rotate-[-12deg] rounded-md border-[1.5px] border-[rgba(245,197,74,0.85)] bg-[#0b0d0c] px-1.5 pb-0.5 pt-1 text-[17px] leading-none text-[var(--color-gold)] sm:-left-9 sm:-top-3 sm:text-[21px]"
        style={{ textShadow: "0 2px 0 #6b4e10" }}
      >
        {prize.amount}
      </span>
      <span
        aria-hidden="true"
        className="tof-prize-glow pointer-events-none absolute -right-8 -top-3 flex rotate-[7deg] items-center gap-1 rounded-full border border-[rgba(245,197,74,0.7)] bg-[#0b0d0c] py-0.5 pl-0.5 pr-2 font-[family-name:var(--font-sans)] text-[9px] font-bold tracking-normal text-[var(--color-text-soft)] sm:-right-12 sm:-top-4 sm:text-[10.5px]"
        style={{ textShadow: "none" }}
      >
        <SponsorLogo src={s.logo} size={16} />
        <span>Sponsored by <span className="font-extrabold text-[var(--color-text)]">{s.name}</span></span>
      </span>
      <span className="sr-only">{`${prize.amount} weekly prize, sponsored by ${s.name}`}</span>
    </>
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
      <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-2.5 flex items-center gap-2 border-t border-[rgba(255,255,255,0.07)] pt-2.5 hover:underline">
        <SponsorLogo src={s.logo} size={26} />
        <span className="text-[11px] font-bold text-[var(--color-text-muted)]">
          Sponsored by <span className="text-[var(--color-text)]">{s.name}</span> <span className="font-semibold">@{prize.sponsor_handle}</span>
        </span>
      </a>
    </div>
  );
}
