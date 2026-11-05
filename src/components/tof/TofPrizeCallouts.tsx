import { sponsorDisplay, WEEK_MIN_PLAYS, type TofPrize } from "@/lib/tof/prize";

type Active = { prize: TofPrize; live: boolean };

const START_LABEL = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });

function SponsorLogo({ src, size }: { src: string | null; size: number }) {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-[5px]" style={{ width: size, height: size }} />;
}

const AMOUNT_TAG = "tof-prize-glow pointer-events-none inline-block rotate-[-10deg] rounded-md border-[1.5px] border-[rgba(245,197,74,0.85)] bg-[#0b0d0c] px-1.5 pb-0.5 pt-1 font-[family-name:var(--font-display)] text-[18px] leading-none tracking-[0.02em] text-[var(--color-gold)] xl:text-[22px]";
const SPONSOR_TAG = "tof-prize-glow pointer-events-none flex rotate-[6deg] items-center gap-1 whitespace-nowrap rounded-full border border-[rgba(245,197,74,0.7)] bg-[#0b0d0c] py-0.5 pl-0.5 pr-2 font-[family-name:var(--font-sans)] text-[10px] font-bold leading-none tracking-normal text-[var(--color-text-soft)] xl:text-[11px]";

function Tags({ active }: { active: Active }) {
  const s = sponsorDisplay(active.prize);
  return {
    amount: <span className={AMOUNT_TAG} style={{ textShadow: "0 2px 0 #6b4e10" }}>{active.prize.amount}</span>,
    sponsor: (
      <span className={SPONSOR_TAG} style={{ textShadow: "none" }}>
        <SponsorLogo src={s.logo} size={16} />
        <span className="py-1">Sponsored by <span className="font-extrabold text-[var(--color-text)]">{s.name}</span></span>
      </span>
    ),
    label: `${active.prize.amount} weekly prize, sponsored by ${s.name}`,
  };
}

/** Prize tags beside the Tail or Fade title on wide screens: the amount left
    of TAIL, the sponsor right of FADE, clear of the lettering. Decoration
    inside the title button (the whole title still toggles the table); the
    panel's contest box carries the sponsor link. Render inside the
    relatively positioned title row. */
export function TofPrizeStickers({ active }: { active: Active }) {
  const t = Tags({ active });
  return (
    <>
      <span aria-hidden="true" className="absolute right-full top-1/2 mr-4 hidden -translate-y-1/2 xl:block">{t.amount}</span>
      <span aria-hidden="true" className="absolute left-full top-1/2 ml-4 hidden -translate-y-1/2 xl:block">{t.sponsor}</span>
      <span className="sr-only">{t.label}</span>
    </>
  );
}

/** The same tags as a small row under the title where there is no room beside it. */
export function TofPrizeStickerRow({ active }: { active: Active }) {
  const t = Tags({ active });
  return (
    <span aria-hidden="true" className="mt-2.5 flex items-center justify-center gap-3 xl:hidden">
      {t.amount}
      {t.sponsor}
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
      <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-2.5 flex items-center gap-2 border-t border-[rgba(255,255,255,0.07)] pt-2.5 hover:underline">
        <SponsorLogo src={s.logo} size={26} />
        <span className="text-[11px] font-bold text-[var(--color-text-muted)]">
          Sponsored by <span className="text-[var(--color-text)]">{s.name}</span> <span className="font-semibold">@{prize.sponsor_handle}</span>
        </span>
      </a>
    </div>
  );
}
