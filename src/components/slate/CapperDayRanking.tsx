import Link from "next/link";
import { CapperAvatar } from "@/components/leaderboard/CapperAvatar";
import { formatUnits } from "@/lib/formatters";
import type { SlateCapperSummary } from "@/lib/types";

interface Props {
  summary: SlateCapperSummary[];
  totalGraded: number;
  totalPending: number;
}

function formatRecord(c: SlateCapperSummary): string {
  let r = `${c.wins}-${c.losses}`;
  if (c.pushes > 0) r += `-${c.pushes}`;
  return r;
}

export function CapperDayRanking({ summary, totalGraded, totalPending }: Props) {
  // Ranking is "how did they do" — needs at least one graded outcome per
  // capper to mean anything. Fully pending cappers stay on the slate itself.
  const ranked = summary.filter((c) => c.graded_count > 0);
  if (ranked.length === 0) return null;

  const isFinal = totalPending === 0;
  const sharpsCount = ranked.length;
  const headline = isFinal ? "Final standings" : "Live standings";
  const subtitle = isFinal
    ? `${totalGraded} ${totalGraded === 1 ? "pick" : "picks"} · ${sharpsCount} ${sharpsCount === 1 ? "sharp" : "sharps"}`
    : `${totalGraded} graded · ${totalPending} pending`;

  const rows = (
    <div className="mt-4 flex flex-col">
      {ranked.map((c, idx) => (
        <CapperRow key={c.capper_id} rank={idx + 1} capper={c} prominent={isFinal} />
      ))}
    </div>
  );

  if (isFinal) {
    return (
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-[20px] sm:text-[22px] font-extrabold tracking-[-0.02em] leading-none">
            {headline}
          </h2>
          <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold tabular-nums">
            {subtitle}
          </span>
        </div>
        {rows}
      </section>
    );
  }

  return (
    <details className="group rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-5 py-4">
      <summary className="list-none cursor-pointer select-none flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex w-1.5 h-1.5 rounded-full bg-[var(--color-pos)] animate-pulse shrink-0" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold truncate">
            {headline} · {subtitle}
          </span>
        </div>
        <span className="text-[11px] text-[var(--color-text-muted)] font-semibold shrink-0 flex items-center gap-1">
          <span className="group-open:hidden">Show ranking</span>
          <span className="hidden group-open:inline">Hide</span>
          <Chevron />
        </span>
      </summary>
      {rows}
    </details>
  );
}

function Chevron() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 20 20"
      fill="none"
      className="transition-transform group-open:rotate-180"
      aria-hidden="true"
    >
      <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CapperRow({
  rank,
  capper,
  prominent,
}: {
  rank: number;
  capper: SlateCapperSummary;
  prominent: boolean;
}) {
  const unitsCls = capper.net_units >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]";
  const profileHref = capper.handle ? `/cappers/${capper.handle}` : null;
  const handleStr = capper.handle ? `@${capper.handle}` : capper.display_name ?? "—";
  const totalCount = capper.graded_count + capper.pending_count;
  const isModel = capper.handle === "fadeai_";

  const inner = (
    <>
      <div className="w-7 sm:w-8 shrink-0 text-[var(--color-text-muted)] font-bold tabular-nums text-[12px] sm:text-[13px]">
        {String(rank).padStart(2, "0")}
      </div>
      <CapperAvatar url={capper.profile_image_url} handle={capper.handle} size={prominent ? 28 : 26} apiIntegrated={isModel} />
      <div className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--color-text)]">
        {handleStr}
      </div>
      <div className="shrink-0 w-12 sm:w-14 text-right text-[12px] sm:text-[13px] font-bold tabular-nums">
        {formatRecord(capper)}
      </div>
      <div className={`shrink-0 w-14 sm:w-16 text-right text-[13px] sm:text-[14px] font-extrabold tabular-nums ${unitsCls}`}>
        {formatUnits(capper.net_units)}u
      </div>
      <div className="shrink-0 w-10 sm:w-14 text-right text-[10px] sm:text-[11px] text-[var(--color-text-muted)] font-medium tabular-nums">
        {capper.graded_count}/{totalCount}
      </div>
    </>
  );

  const baseRowCls =
    "flex items-center gap-2 sm:gap-3 py-2 px-2 -mx-2 rounded-md transition-colors";

  return profileHref ? (
    <Link href={profileHref} className={`${baseRowCls} hover:bg-[rgba(255,255,255,0.04)]`}>
      {inner}
    </Link>
  ) : (
    <div className={baseRowCls}>{inner}</div>
  );
}
