import Link from "next/link";

/** The one rank a capper wears next to their name: all-time, all sports,
 *  straights, by units, counted with "Show: All" so it matches the board it
 *  links to. Laurels for the podium in the podium metals, a plain number down
 *  to 25, nothing below that (a "#87" next to your name is a demerit). */
export const RANK_BOARD_HREF = "/?window=all_time&sport=all&bet_type=straights&active_only=false";
export const RANK_SHOWN_MAX = 25;

const METAL: Record<number, { ink: string; glow: string }> = {
  1: { ink: "var(--color-gold)", glow: "rgba(245,197,74,0.45)" },
  2: { ink: "var(--color-silver)", glow: "rgba(212,212,216,0.35)" },
  3: { ink: "var(--color-bronze)", glow: "rgba(200,129,74,0.45)" },
};

function Laurel({ rank, ink, glow, height }: { rank: number; ink: string; glow: string; height: number }) {
  // Four leaves a side, drawn as rotated ellipses around the number.
  const leaves: Array<[number, number, number]> = [
    [6, 18, -70], [4.2, 13.5, -45], [4.6, 8.8, -20], [7.2, 4.6, 10],
    [34, 18, 70], [35.8, 13.5, 45], [35.4, 8.8, 20], [32.8, 4.6, -10],
  ];
  return (
    <svg
      viewBox="0 0 40 22"
      style={{ height, width: height * (40 / 22), overflow: "visible", filter: `drop-shadow(0 0 5px ${glow})` }}
      aria-hidden="true"
    >
      <g fill={ink}>
        {leaves.map(([cx, cy, rot], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={3.2} ry={1.6} transform={`rotate(${rot} ${cx} ${cy})`} />
        ))}
      </g>
      <text x="20" y="15.5" textAnchor="middle" fill={ink} style={{ font: "800 12px var(--font-sans)" }}>
        #{rank}
      </text>
    </svg>
  );
}

export function rankLabel(rank: number): string {
  return `#${rank} on the all-time straights leaderboard, by units`;
}

export function RankMark({ rank, size = "md" }: { rank: number | null | undefined; size?: "md" | "sm" }) {
  if (rank == null || rank < 1 || rank > RANK_SHOWN_MAX) return null;
  const metal = METAL[rank];
  const label = rankLabel(rank);
  const h = size === "md" ? 22 : 16;
  return (
    <Link
      href={RANK_BOARD_HREF}
      title={label}
      aria-label={label}
      // No click handler: this renders from Server Components (/cappers), and
      // a function prop on next/link would not cross that boundary (Codex on
      // #238). The directory rows stack the mark above their overlay link.
      className="inline-flex items-center gap-1.5 shrink-0 leading-none hover:opacity-90 transition-opacity"
    >
      {metal ? (
        <Laurel rank={rank} ink={metal.ink} glow={metal.glow} height={h} />
      ) : (
        <span
          className={`font-extrabold tracking-[-0.02em] text-[var(--color-text-soft)] ${size === "md" ? "text-[15px]" : "text-[12px]"}`}
        >
          #{rank}
        </span>
      )}
      {size === "md" && (
        <span className="flex flex-col gap-[3px] text-[9px] font-extrabold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          <span>Straights</span>
          <span>All-time</span>
        </span>
      )}
    </Link>
  );
}
