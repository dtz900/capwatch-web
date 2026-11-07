import Link from "next/link";
import { ADMIN_SPORTS, type AdminSport } from "@/lib/admin-sports";

export type BuildHref = (
  overrides: Partial<{
    reason: string;
    capper: string;
    kind: string;
    offset: string;
    sort: string;
    sport: string;
    show_acked: string;
  }>,
) => string;

/** "All" first, then sports by count descending; ties keep ADMIN_SPORTS order. */
export function orderSportTabs(by_sport: Record<string, number> | undefined): Array<"All" | AdminSport> {
  const count = (s: AdminSport) => by_sport?.[s] ?? 0;
  const sorted = [...ADMIN_SPORTS].sort((a, b) => count(b) - count(a));
  return ["All", ...sorted];
}

interface Props {
  sport: AdminSport | undefined;
  by_sport: Record<string, number> | undefined;
  by_reason: Record<string, number>;
  total: number;
  reason: string | undefined;
  sort: "newest" | "oldest";
  hiddenReasons: Set<string>;
  buildHref: BuildHref;
  reasonLabel: Record<string, string>;
  reasonTitle: string;
  /** Label of the clear-the-reason chip. */
  anyLabel?: string;
}

const chipBase = "rounded-full border px-[11px] py-1 text-[11.5px] font-bold whitespace-nowrap";

export function SportTabs({ sport, by_sport, by_reason, total, reason, sort, hiddenReasons, buildHref, reasonLabel, reasonTitle, anyLabel = "Any" }: Props) {
  const tabs = orderSportTabs(by_sport);
  const reasons = Object.entries(by_reason)
    .filter(([r]) => !hiddenReasons.has(r))
    .sort((a, b) => b[1] - a[1]);
  return (
    <div className="flex-none flex items-stretch px-6 border-b border-[var(--color-border)]">
      <div className="flex items-stretch">
        {tabs.map((t) => {
          const n = t === "All" ? total : (by_sport?.[t] ?? 0);
          const active = (t === "All" ? undefined : t) === sport;
          return (
            <Link
              key={t}
              href={buildHref({ sport: t === "All" ? "" : t, offset: "" })}
              className={`flex items-center gap-2 px-4 pt-[11px] pb-[10px] text-[12.5px] font-extrabold border-b-2 ${
                active
                  ? "text-[var(--color-text)] border-[var(--color-text)]"
                  : "text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text-soft)]"
              } ${n === 0 ? "opacity-45" : ""}`}
            >
              {t}
              <span className="text-[11px] font-extrabold tabular-nums">{n}</span>
            </Link>
          );
        })}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-[var(--color-text-muted)] mr-1">
          {reasonTitle}
        </span>
        <Link
          href={buildHref({ reason: "", offset: "" })}
          className={`${chipBase} ${
            !reason
              ? "border-[var(--color-text-soft)] text-[var(--color-text)]"
              : "border-[var(--color-border)] text-[var(--color-text-soft)]"
          }`}
        >
          {anyLabel}
        </Link>
        {reasons.map(([r, n]) => (
          <Link
            key={r}
            href={buildHref({ reason: r, offset: "" })}
            className={`${chipBase} ${
              reason === r
                ? "border-[var(--color-text-soft)] text-[var(--color-text)]"
                : "border-[var(--color-border)] text-[var(--color-text-soft)]"
            }`}
          >
            {reasonLabel[r] ?? r}
            <b className="ml-1 font-extrabold text-[var(--color-text-muted)] tabular-nums">{n}</b>
          </Link>
        ))}
        <span className="mx-1 h-[22px] w-px bg-[var(--color-border)]" />
        <Link
          href={buildHref({ sort: sort === "newest" ? "oldest" : "newest", offset: "" })}
          className={`${chipBase} border-[var(--color-border)] text-[var(--color-text-soft)]`}
        >
          {sort === "newest" ? "Newest first" : "Oldest first"}
        </Link>
      </div>
    </div>
  );
}
