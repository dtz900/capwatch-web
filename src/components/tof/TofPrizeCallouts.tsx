import { sponsorDisplay, WEEK_MIN_PLAYS, type TofPrize } from "@/lib/tof/prize";

type Active = { prize: TofPrize; live: boolean };

const START_LABEL = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });

function SponsorLogo({ src, size }: { src: string | null; size: number }) {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-[5px]" style={{ width: size, height: size }} />;
}

/** The weekly prize next to the Tail or Fade title, folded or open: the
    amount big and glowing, the sponsor plug beside it. */
export function TofPrizeBadge({ active }: { active: Active }) {
  const { prize, live } = active;
  const s = sponsorDisplay(prize);
  const starts = START_LABEL.format(new Date(`${prize.starts}T12:00:00Z`));
  return (
    <div className="tof-prize-glow flex items-center gap-3 rounded-2xl border-2 border-[rgba(245,197,74,0.75)] bg-[rgba(9,11,12,0.82)] py-2 pl-3.5 pr-4">
      <span
        className="font-[family-name:var(--font-display)] text-[40px] leading-none text-[var(--color-gold)] sm:text-[48px]"
        style={{ textShadow: "0 3px 0 #6b4e10" }}
      >
        {prize.amount}
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--color-gold)]">
          {live ? "Weekly prize" : `Weekly prize · starts ${starts}`}
        </span>
        <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--color-text-soft)] hover:underline">
          Sponsored by
          <SponsorLogo src={s.logo} size={24} />
          <span className="text-[14px] font-extrabold text-[var(--color-text)]">{s.name}</span>
        </a>
      </div>
    </div>
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
